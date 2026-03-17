import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';


export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-md animate-scale-in">
          <div className="card p-10 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5"
              style={{ background: 'var(--accent-bg)', border: '1.5px solid var(--accent-border)' }}>
              📬
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
              Check your inbox
            </h2>
            <p className="text-sm mb-1" style={{ color: 'var(--text-2)' }}>
              We sent a verification link to
            </p>
            <p className="font-semibold mb-6" style={{ color: 'var(--accent)', fontFamily: 'DM Mono, monospace' }}>
              {form.email}
            </p>
            <p className="text-sm mb-8" style={{ color: 'var(--text-3)' }}>
              Click the link in the email to verify your account, then come back to sign in.
            </p>
            <Link to="/login" className="btn-primary w-full block text-center py-3">
              Go to Sign In →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Register form ───────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-xl mx-auto mb-4"
            style={{ background: 'var(--accent)', fontFamily: 'Sora, sans-serif' }}>C</div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Create your account
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Start hosting quizzes for free</p>
        </div>
        <div className="card p-8">
          {error && (
            <div className="px-4 py-3 rounded-xl mb-5 text-sm font-medium"
              style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: 'username', label: 'Username', type: 'text', placeholder: 'quizmaster42' },
              { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { name: 'password', label: 'Password', type: 'password', placeholder: 'Min 6 characters' }
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>{f.label}</label>
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