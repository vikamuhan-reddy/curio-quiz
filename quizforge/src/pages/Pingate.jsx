import React, { useState, useRef, useEffect } from 'react';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Set your PIN here, or pull from an env var / API call.
// For Vite: import.meta.env.VITE_REGISTER_PIN
// For CRA:  process.env.REACT_APP_REGISTER_PIN
const REGISTER_PIN = import.meta.env?.VITE_REGISTER_PIN || '1234';
const PIN_LENGTH = REGISTER_PIN.length;
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PinGate — wraps any component (typically <Register />) behind a PIN prompt.
 *
 * Usage in your router:
 *   <Route path="/register" element={<PinGate><Register /></PinGate>} />
 */
export default function PinGate({ children }) {
  const [digits, setDigits] = useState(Array(PIN_LENGTH).fill(''));
  const [status, setStatus] = useState('idle'); // idle | error | success
  const [shake, setShake] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const inputRefs = useRef([]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    // Accept only digits
    if (!/^\d?$/.test(value)) return;

    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setStatus('idle');

    // Move focus forward
    if (value && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (value && next.every(d => d !== '')) {
      verify(next.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        // Clear current cell
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        // Move back and clear previous
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      const pin = digits.join('');
      if (pin.length === PIN_LENGTH) verify(pin);
    }
  };

  // Handle paste (e.g. admin pastes the PIN)
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PIN_LENGTH);
    if (!pasted) return;
    const next = Array(PIN_LENGTH).fill('');
    [...pasted].forEach((ch, i) => (next[i] = ch));
    setDigits(next);
    const focusIdx = Math.min(pasted.length, PIN_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
    if (pasted.length === PIN_LENGTH) verify(pasted);
  };

  const verify = (pin) => {
    if (pin === REGISTER_PIN) {
      setStatus('success');
      // Small delay so user sees the success state before transition
      setTimeout(() => setUnlocked(true), 500);
    } else {
      setStatus('error');
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setDigits(Array(PIN_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }, 600);
    }
  };

  // ── Once unlocked, render the wrapped component ──────────────────────────
  if (unlocked) return children;

  // ── PIN gate UI ───────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg)' }}
    >
      {/* Card */}
      <div
        className="card w-full max-w-sm p-8 flex flex-col items-center gap-6"
        style={{ textAlign: 'center' }}
      >
        {/* Lock icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
          style={{
            background: status === 'success' ? 'var(--accent-bg)' : 'var(--surface-2, var(--accent-bg))',
            border: '1px solid var(--accent-border)',
            transition: 'background 0.3s',
          }}
        >
          {status === 'success' ? '✅' : '🔒'}
        </div>

        {/* Heading */}
        <div>
          <h2
            className="text-xl font-black mb-1"
            style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)', letterSpacing: '-0.02em' }}
          >
            Enter Registration PIN
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Account creation is invite-only. Ask your admin for the PIN.
          </p>
        </div>

        {/* PIN inputs */}
        <div
          className={`flex gap-3 ${shake ? 'animate-shake' : ''}`}
          onPaste={handlePaste}
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={el => (inputRefs.current[i] = el)}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-xl font-bold rounded-xl outline-none transition-all"
              style={{
                fontFamily: 'Sora, sans-serif',
                background: 'var(--surface, var(--bg))',
                color: 'var(--text)',
                border: `2px solid ${
                  status === 'error'
                    ? '#ef4444'
                    : status === 'success'
                    ? '#22c55e'
                    : digit
                    ? 'var(--accent)'
                    : 'var(--border)'
                }`,
                boxShadow: digit ? '0 0 0 3px var(--accent-border)' : 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />
          ))}
        </div>

        {/* Status messages */}
        <div className="h-5">
          {status === 'error' && (
            <p className="text-sm font-medium" style={{ color: '#ef4444' }}>
              Incorrect PIN. Try again.
            </p>
          )}
          {status === 'success' && (
            <p className="text-sm font-medium" style={{ color: '#22c55e' }}>
              PIN accepted! Redirecting…
            </p>
          )}
        </div>

        {/* Submit button */}
        <button
          className="btn-primary w-full py-3 text-sm font-semibold"
          onClick={() => {
            const pin = digits.join('');
            if (pin.length === PIN_LENGTH) verify(pin);
          }}
          disabled={digits.some(d => d === '') || status === 'success'}
        >
          Verify PIN
        </button>
      </div>

      {/* Back link */}
      <a
        href="/"
        className="mt-6 text-sm"
        style={{ color: 'var(--text-3)', textDecoration: 'underline' }}
      >
        ← Back to home
      </a>

      {/* Shake keyframe — injected once */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.5s ease; }
      `}</style>
    </div>
  );
}