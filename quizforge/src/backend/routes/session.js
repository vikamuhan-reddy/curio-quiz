import express from 'express';
import { query } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// HOST: Create session
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { quiz_id } = req.body;
    const quizCheck = await query(
      'SELECT id FROM quizzes WHERE id = $1 AND host_id = $2',
      [quiz_id, req.user.id]
    );
    if (quizCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    // End any existing waiting sessions for this quiz
    await query(
      'UPDATE quiz_sessions SET status = $1 WHERE quiz_id = $2 AND status = $3',
      ['ended', quiz_id, 'waiting']
    );
    const result = await query(
      'INSERT INTO quiz_sessions (quiz_id, host_id) VALUES ($1, $2) RETURNING *',
      [quiz_id, req.user.id]
    );
    res.status(201).json({ session: result.rows[0] });
  } catch (err) {
    console.error('POST /create error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PLAYER: Find the host's active waiting session by quiz_id
router.post('/create-public', async (req, res) => {
  try {
    const { quiz_id } = req.body;
    const existing = await query(
      `SELECT s.*, q.pin, q.title, q.time_per_question
       FROM quiz_sessions s
       JOIN quizzes q ON q.id = s.quiz_id
       WHERE s.quiz_id = $1 AND s.status = 'waiting'
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [quiz_id]
    );
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      return res.json({
        session: {
          ...row,
          quiz: {
            id: row.quiz_id,
            pin: row.pin,
            title: row.title,
            time_per_question: row.time_per_question
          }
        }
      });
    }
    return res.status(404).json({
      error: 'No active session found. Ask your host to click Host first.'
    });
  } catch (err) {
    console.error('POST /create-public error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET leaderboard
router.get('/:id/leaderboard', async (req, res) => {
  try {
    const result = await query(
      `SELECT p.nickname, p.avatar_color, p.total_score,
       COUNT(a.id) as total_answers,
       SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_answers
       FROM participants p
       LEFT JOIN attempts a ON a.participant_id = p.id
       WHERE p.session_id = $1
       GROUP BY p.id, p.nickname, p.avatar_color, p.total_score
       ORDER BY p.total_score DESC`,
      [req.params.id]
    );
    res.json({ leaderboard: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;