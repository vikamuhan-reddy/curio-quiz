import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { execSync } from 'child_process';
import { query } from '../db/index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: '/tmp/' });
const hostOnly = [authenticateToken, requireRole('host')];

const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();

// ─── PDF TEXT EXTRACTOR ───────────────────────────────────
function extractPDFText(filePath) {
  const pyScript = `import pdfplumber, sys
with pdfplumber.open(sys.argv[1]) as pdf:
    text = ""
    for page in pdf.pages:
        t = page.extract_text()
        if t:
            text += t + "\\n"
    print(text)
`;
  const scriptPath = `/tmp/extract_${Date.now()}.py`;
  fs.writeFileSync(scriptPath, pyScript);
  try {
    return execSync(`python3 ${scriptPath} "${filePath}"`, { encoding: 'utf8', timeout: 30000 });
  } finally {
    fs.unlink(scriptPath, () => {});
  }
}

// ─── GROQ AI EXTRACTION ─────────────────────────────────
async function extractQuestionsWithGroq(text) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set in .env');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      temperature: 0.4,
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: `You are a quiz question generator. Always respond with ONLY a valid JSON array. No markdown, no explanation, no code blocks.`
        },
        {
          role: 'user',
          content: `Read the document below and generate 5-15 MCQ questions from it.

Each question must follow this exact JSON format:
{
  "question_text": "Question here?",
  "question_type": "mcq",
  "options": [
    { "id": "a", "text": "Option A" },
    { "id": "b", "text": "Option B" },
    { "id": "c", "text": "Option C" },
    { "id": "d", "text": "Option D" }
  ],
  "correct_answers": ["b"],
  "points": 100
}

Document:
"""
${text.slice(0, 6000)}
"""

Return ONLY the JSON array, nothing else.`
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} — ${errText}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content || '';
  const cleaned = rawText.replace(/```json|```/g, '').trim();

  let questions;
  try {
    questions = JSON.parse(cleaned);
  } catch {
    throw new Error('Groq returned invalid JSON. Try a different file.');
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('No questions could be generated from this document.');
  }

  return questions;
}

// ─── EXTRACT FROM FILE (AI-powered) ──────────────────────
router.post('/extract-from-file', ...hostOnly, upload.single('file'), async (req, res) => {
  const filePath = req.file?.path;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const originalName = req.file.originalname.toLowerCase();
    let text = '';

    if (originalName.endsWith('.pdf')) {
      text = extractPDFText(filePath);
    } else if (originalName.endsWith('.csv') || originalName.endsWith('.txt')) {
      text = fs.readFileSync(filePath, 'utf8');
    } else {
      return res.status(400).json({ error: 'Only PDF, TXT, and CSV files are supported.' });
    }

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'File appears to be empty or has too little content.' });
    }

    const questions = await extractQuestionsWithGroq(text);

    res.json({ questions, fileName: req.file.originalname });
  } catch (err) {
    console.error('extract-from-file error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (filePath) fs.unlink(filePath, () => {});
  }
});

// ─── SAVE FROM FILE ───────────────────────────────────────
router.post('/save-from-file', ...hostOnly, async (req, res) => {
  try {
    const { title, description, time_per_question, questions } = req.body;
    if (!title) return res.status(400).json({ error: 'Quiz title is required' });
    if (!questions || questions.length === 0) return res.status(400).json({ error: 'No questions to save' });

    let pin;
    let pinExists = true;
    while (pinExists) {
      pin = generatePin();
      const check = await query('SELECT id FROM quizzes WHERE pin = $1', [pin]);
      pinExists = check.rows.length > 0;
    }

    const quizResult = await query(
      `INSERT INTO quizzes (host_id, title, subtitle, pin, time_per_question, status) VALUES ($1, $2, $3, $4, $5, 'draft') RETURNING *`,
      [req.user.id, title, description || '', pin, time_per_question || 30]
    );
    const quiz = quizResult.rows[0];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await query(
        `INSERT INTO questions (quiz_id, question_text, question_type, options, correct_answers, points, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [quiz.id, q.question_text, q.question_type || 'mcq', JSON.stringify(q.options), JSON.stringify(q.correct_answers), q.points || 100, i]
      );
    }

    res.status(201).json({ quiz });
  } catch (err) {
    console.error('save-from-file error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── CREATE ───────────────────────────────────────────────
router.post('/create', ...hostOnly, async (req, res) => {
  try {
    const { title, subtitle, time_per_question, status = 'draft', questions } = req.body;
    if (!title || !questions?.length) return res.status(400).json({ error: 'Title and questions are required' });

    let pin;
    let pinExists = true;
    while (pinExists) {
      pin = generatePin();
      const check = await query('SELECT id FROM quizzes WHERE pin = $1', [pin]);
      pinExists = check.rows.length > 0;
    }

    const quizResult = await query(
      `INSERT INTO quizzes (host_id, title, subtitle, pin, time_per_question, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, title, subtitle || '', pin, time_per_question || 30, status]
    );
    const quiz = quizResult.rows[0];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await query(
        `INSERT INTO questions (quiz_id, question_text, question_type, options, correct_answers, points, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [quiz.id, q.question_text, q.question_type, JSON.stringify(q.options), JSON.stringify(q.correct_answers), q.points || 100, i]
      );
    }

    res.json({ quiz });
  } catch (err) {
    console.error('POST /create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE ───────────────────────────────────────────────
router.put('/:id', ...hostOnly, async (req, res) => {
  try {
    const { title, subtitle, time_per_question, questions } = req.body;
    await query('UPDATE quizzes SET title=$1, subtitle=$2, time_per_question=$3 WHERE id=$4 AND host_id=$5',
      [title, subtitle, time_per_question, req.params.id, req.user.id]);
    await query('DELETE FROM attempts WHERE question_id IN (SELECT id FROM questions WHERE quiz_id=$1)', [req.params.id]);
    await query('DELETE FROM questions WHERE quiz_id=$1', [req.params.id]);

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await query(
        `INSERT INTO questions (quiz_id, question_text, question_type, options, correct_answers, points, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.params.id, q.question_text, q.question_type, JSON.stringify(q.options), JSON.stringify(q.correct_answers), q.points || 100, i]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUBLISH ──────────────────────────────────────────────
router.patch('/:id/publish', ...hostOnly, async (req, res) => {
  try {
    const result = await query(
      'UPDATE quizzes SET status=$1 WHERE id=$2 AND host_id=$3 RETURNING *',
      ['published', req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ quiz: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── UNPUBLISH ────────────────────────────────────────────
router.patch('/:id/unpublish', ...hostOnly, async (req, res) => {
  try {
    const result = await query(
      'UPDATE quizzes SET status=$1 WHERE id=$2 AND host_id=$3 RETURNING *',
      ['draft', req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ quiz: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET BY PIN ───────────────────────────────────────────
router.get('/pin/:pin', async (req, res) => {
  try {
    const result = await query('SELECT * FROM quizzes WHERE pin=$1 AND status=$2', [req.params.pin, 'published']);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ quiz: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET ONE ──────────────────────────────────────────────
router.get('/:id', ...hostOnly, async (req, res) => {
  try {
    const quizResult = await query('SELECT * FROM quizzes WHERE id=$1 AND host_id=$2', [req.params.id, req.user.id]);
    if (quizResult.rows.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    const questions = await query('SELECT * FROM questions WHERE quiz_id=$1 ORDER BY order_index', [req.params.id]);
    res.json({ quiz: quizResult.rows[0], questions: questions.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET ALL ──────────────────────────────────────────────
router.get('/', ...hostOnly, async (req, res) => {
  try {
    const result = await query('SELECT * FROM quizzes WHERE host_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ quizzes: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE ───────────────────────────────────────────────
router.delete('/:id', ...hostOnly, async (req, res) => {
  try {
    await query('DELETE FROM quizzes WHERE id=$1 AND host_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;