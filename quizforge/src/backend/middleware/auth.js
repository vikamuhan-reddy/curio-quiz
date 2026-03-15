import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── Verify Supabase JWT ──────────────────────────────────
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(403).json({ error: 'Invalid or expired token' });

  const supabaseUser = data.user;
  req.user = {
    id: supabaseUser.id,
    email: supabaseUser.email,
    username: supabaseUser.user_metadata?.username || supabaseUser.email.split('@')[0],
    role: supabaseUser.user_metadata?.role || 'host',
  };

  next();
};

// ─── Role guard ───────────────────────────────────────────
export const requireRole = (role) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.role !== role) return res.status(403).json({ error: 'Access denied' });
  next();
};