import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [role, setRole] = useState('player');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const user = await register(form.username, form.email, form.password, role);
      navigate(user.role === 'host' ? '/dashboard' : '/join');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-xl mx-auto mb-4"
            style={{ background: 'var(--accent)', fontFamily: 'Sora, sans-serif' }}>C</div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Create your account</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Join Curio Quiz</p>
        </div>

        <div className="card p-8">
          {error && (
            <div className="px-4 py-3 rounded-xl mb-5 text-sm font-medium"
              style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>
              {error}
            </div>
          )}

          {/* ── Role Selector ── */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>
              I want to...
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRole('host')}
                className="flex-1 py-3 px-3 rounded-xl text-sm font-semibold transition-all text-center"
                style={{
                  background: role === 'host' ? 'var(--accent)' : 'var(--surface)',
                  color: role === 'host' ? '#fff' : 'var(--text-2)',
                  border: `1.5px solid ${role === 'host' ? 'var(--accent)' : 'var(--border)'}`,
                  fontFamily: 'Sora, sans-serif'
                }}>
                🎤 Host Quizzes
              </button>
              <button type="button" onClick={() => setRole('player')}
                className="flex-1 py-3 px-3 rounded-xl text-sm font-semibold transition-all text-center"
                style={{
                  background: role === 'player' ? 'var(--accent)' : 'var(--surface)',
                  color: role === 'player' ? '#fff' : 'var(--text-2)',
                  border: `1.5px solid ${role === 'player' ? 'var(--accent)' : 'var(--border)'}`,
                  fontFamily: 'Sora, sans-serif'
                }}>
                🎮 Play Quizzes
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
              {role === 'host'
                ? '✅ You can create, manage and host live quiz sessions'
                : '✅ You can join live quiz sessions using a PIN'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: 'username', label: 'Username', type: 'text', placeholder: 'quizmaster42' },
              { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { name: 'password', label: 'Password', type: 'password', placeholder: 'Min 6 characters' }
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>{f.label}</label>
                <input type={f.type} name={f.name} value={form[f.name]} onChange={handleChange}
                  className="input-field" placeholder={f.placeholder} required />
              </div>
            ))}
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-3)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold" style={{ color: 'var(--accent)' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}