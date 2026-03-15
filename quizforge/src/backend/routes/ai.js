import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
const hostOnly = [authenticateToken, requireRole('host')];

// ─── GENERATE QUIZ FROM TOPIC ─────────────────────────────
router.post('/generate', hostOnly, async (req, res) => {
  const { topic, numQuestions = 10, difficulty = 'medium' } = req.body;

  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY is not set in .env' });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_tokens: 4096,
        messages: [
          {
            role: 'system',
            content: `You are a quiz question generator. Always respond with ONLY a valid JSON array. No markdown, no explanation, no code blocks.`
          },
          {
            role: 'user',
            content: `Generate exactly ${numQuestions} MCQ questions about "${topic}" at ${difficulty} difficulty.

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
      throw new Error('Groq returned invalid JSON. Please try again.');
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('No questions could be generated. Try a different topic.');
    }

    res.json({ questions, topic });
  } catch (err) {
    console.error('AI generate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;