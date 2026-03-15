import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api.js';

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setError('Enter the 6-digit code'); return; }
    setError(''); setLoading(true);
    try {
      const res = await api.post('/api/auth/verify-otp', { email, token: otp });
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true); setResent(false); setError('');
    try {
      await api.post('/api/auth/resend-otp', { email });
      setResent(true);
    } catch (err) {
      setError('Failed to resend. Try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-xl mx-auto mb-4"
            style={{ background: 'var(--accent)', fontFamily: 'Sora, sans-serif' }}>✉️</div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Check your email
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-3)' }}>
            We sent a 6-digit code to<br />
            <span className="font-semibold" style={{ color: 'var(--text-2)' }}>{email}</span>
          </p>
        </div>

        <div className="card p-8">
          {error && (
            <div className="px-4 py-3 rounded-xl mb-5 text-sm font-medium"
              style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>
              {error}
            </div>
          )}
          {resent && (
            <div className="px-4 py-3 rounded-xl mb-5 text-sm font-medium"
              style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' }}>
              ✅ New code sent to your email
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>
                Verification Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-field text-center text-2xl font-bold tracking-widest"
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-4">
              {loading ? '⏳ Verifying...' : '✅ Verify Email'}
            </button>
          </form>

          <div className="text-center mt-5 space-y-2">
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              Didn't receive the code?{' '}
              <button onClick={handleResend} disabled={resending}
                className="font-semibold hover:opacity-70 transition-opacity"
                style={{ color: 'var(--accent)' }}>
                {resending ? 'Sending...' : 'Resend'}
              </button>
            </p>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              <Link to="/register" style={{ color: 'var(--text-3)' }}>← Back to register</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}