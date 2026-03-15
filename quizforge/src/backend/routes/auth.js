import express from 'express';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const getSupabase = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── POST /api/auth/register ──────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { username, role: 'host' },
        emailRedirectTo: `${process.env.CLIENT_URL}/login`,
      }
    });

    if (error) {
      if (error.message.includes('already registered'))
        return res.status(409).json({ error: 'Email already exists' });
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Verification email sent. Please check your inbox.',
      email,
    });
  } catch (err) {
    console.error('POST /register error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes('Email not confirmed'))
        return res.status(401).json({ error: 'Please verify your email before logging in.' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const supabaseUser = data.user;
    const token = data.session.access_token;
    const username = supabaseUser.user_metadata?.username || supabaseUser.email.split('@')[0];
    const role = supabaseUser.user_metadata?.role || 'host';

    res.json({
      token,
      user: { id: supabaseUser.id, email: supabaseUser.email, username, role }
    });
  } catch (err) {
    console.error('POST /login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    const { data, error } = await getSupabase().auth.getUser(token);
    if (error || !data.user) return res.status(403).json({ error: 'Invalid token' });

    const supabaseUser = data.user;
    const username = supabaseUser.user_metadata?.username || supabaseUser.email.split('@')[0];
    const role = supabaseUser.user_metadata?.role || 'host';

    res.json({
      user: {
        id: supabaseUser.id,
        email: supabaseUser.email,
        username,
        role,
        created_at: supabaseUser.created_at,
      }
    });
  } catch (err) {
    console.error('GET /me error:', err.message);
    res.status(403).json({ error: 'Invalid token' });
  }
});

export default router;