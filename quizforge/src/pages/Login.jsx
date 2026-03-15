import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUnverified(false);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Check your credentials.';
      if (msg.includes('verify your email')) {
        setUnverified(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md animate-scale-in">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-xl mx-auto mb-4"
            style={{ background: 'var(--accent)', fontFamily: 'Sora, sans-serif' }}>C</div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Sign in to your Curio account</p>
        </div>

        <div className="card p-8">

          {/* Generic error */}
          {error && (
            <div className="px-4 py-3 rounded-xl mb-5 text-sm font-medium"
              style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>
              {error}
            </div>
          )}

          {/* Unverified email warning */}
          {unverified && (
            <div className="px-4 py-3 rounded-xl mb-5 text-sm"
              style={{ background: 'var(--yellow-bg)', color: 'var(--yellow)', border: '1px solid var(--yellow-border)' }}>
              <p className="font-semibold mb-1">📧 Email not verified</p>
              <p>Please check your inbox and verify your email first.</p>
              <button
                onClick={() => navigate('/verify-otp', { state: { email } })}
                className="mt-2 text-sm font-semibold underline"
                style={{ color: 'var(--accent)' }}>
                Enter verification code →
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input-field" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-3)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold" style={{ color: 'var(--accent)' }}>Sign up free</Link>
          </p>
          <p className="text-center mt-2">
            <Link to="/join" className="text-sm" style={{ color: 'var(--text-3)' }}>← Join a quiz without account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}