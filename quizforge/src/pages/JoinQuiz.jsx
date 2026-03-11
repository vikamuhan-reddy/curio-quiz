import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { socket, connectSocket } from '../socket.js';

const AVATAR_COLORS = [
  '#5b4ef8', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#8b5cf6',
  '#ef4444', '#06b6d4'
];

const AVATAR_EMOJIS = [
  '😀','😎','🤩','🥳','🦊','🐯','🐸','🦄',
  '🐙','🦋','🐧','🦁','🐲','🤖','👻','🎃'
];

export default function JoinQuiz() {
  const [step, setStep] = useState('pin');
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarEmoji, setAvatarEmoji] = useState(AVATAR_EMOJIS[0]);
  const [quiz, setQuiz] = useState(null);
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const quizRes = await axios.get(`/api/quiz/pin/${pin.trim()}`);
      const foundQuiz = quizRes.data.quiz;
      setQuiz(foundQuiz);
      const sessRes = await axios.post('/api/session/create-public', { quiz_id: foundQuiz.id });
      setSession(sessRes.data.session);
      setStep('nickname');
    } catch (err) {
      setError(err.response?.data?.error || 'Quiz not found. Check the PIN and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!nickname.trim() || !session) return;
    setLoading(true);
    setError('');

    socket.off('player:joined');
    socket.off('lobby:update');
    socket.off('quiz:question');
    socket.off('quiz:between-questions');
    socket.off('error');

    socket.on('player:joined', ({ participant }) => {
      localStorage.setItem('participant', JSON.stringify(participant));
      setLoading(false);
      setStep('lobby');
    });

    socket.on('lobby:update', ({ participants }) => setParticipants(participants));

    socket.on('quiz:question', (questionData) => {
      navigate(`/play/${session.id}`, { state: { firstQuestion: questionData } });
    });

    socket.on('quiz:between-questions', () => navigate(`/play/${session.id}`));

    socket.on('error', ({ message }) => {
      setError(message);
      setLoading(false);
    });

    connectSocket();

    const doJoin = () => {
      socket.emit('player:join', {
        sessionId: session.id,
        nickname: nickname.trim(),
        avatarColor,
        avatarEmoji
      });
    };

    if (socket.connected) doJoin();
    else socket.once('connect', doJoin);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
            style={{ background: 'var(--accent-bg)', border: '1.5px solid var(--accent-border)' }}>🎮</div>
          <h1 className="text-3xl font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Join a Quiz</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Enter the PIN from your host</p>
        </div>

        {/* ─── PIN Step ─── */}
        {step === 'pin' && (
          <div className="card p-8 animate-scale-in">
            {error && (
              <div className="px-4 py-3 rounded-xl mb-5 text-sm"
                style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>{error}</div>
            )}
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>
                  6-digit quiz PIN
                </label>
                <input
                  type="text"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-field text-center text-4xl font-black tracking-widest py-4"
                  style={{ fontFamily: 'DM Mono, monospace', letterSpacing: '0.2em' }}
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
              <button type="submit" disabled={loading || pin.length !== 6} className="btn-primary w-full py-3.5">
                {loading ? 'Finding quiz...' : 'Find Quiz →'}
              </button>
            </form>
          </div>
        )}

        {/* ─── Nickname Step ─── */}
        {step === 'nickname' && quiz && (
          <div className="card p-8 animate-scale-in">
            <div className="px-4 py-3 rounded-xl mb-6"
              style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--accent)', fontFamily: 'Sora, sans-serif' }}>JOINING</p>
              <p className="font-bold" style={{ color: 'var(--text)', fontFamily: 'Sora, sans-serif' }}>{quiz.title}</p>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl mb-5 text-sm"
                style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>{error}</div>
            )}

            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>
                  Your Nickname
                </label>
                <input type="text" value={nickname}
                  onChange={e => setNickname(e.target.value.slice(0, 20))}
                  className="input-field text-lg font-semibold" placeholder="e.g. QuizNinja" required />
              </div>

              {/* Emoji Avatar Picker */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>
                  Pick your avatar
                </label>
                <div className="grid grid-cols-8 gap-1.5">
                  {AVATAR_EMOJIS.map(emoji => (
                    <button key={emoji} type="button" onClick={() => setAvatarEmoji(emoji)}
                      className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${
                        avatarEmoji === emoji
                          ? 'ring-2 ring-offset-1 scale-110'
                          : 'hover:scale-105 opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        background: avatarEmoji === emoji ? 'var(--accent-bg)' : 'var(--bg-2)',
                        border: avatarEmoji === emoji ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                        ringColor: 'var(--accent)'
                      }}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>
                  Pick your colour
                </label>
                <div className="flex gap-2.5 flex-wrap">
                  {AVATAR_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setAvatarColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-8 h-8 rounded-full transition-all ${
                        avatarColor === c ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)' }}>
                <div style={{ backgroundColor: avatarColor }}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                  {avatarEmoji}
                </div>
                <div>
                  <span className="font-semibold block" style={{ color: 'var(--text)', fontFamily: 'Sora, sans-serif' }}>
                    {nickname || 'Your name here'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>Your quiz avatar</span>
                </div>
              </div>

              <button type="submit" disabled={loading || !nickname.trim()} className="btn-primary w-full py-3.5">
                {loading ? 'Joining...' : 'Join Quiz 🚀'}
              </button>
            </form>
          </div>
        )}

        {/* ─── Lobby Step ─── */}
        {step === 'lobby' && (
          <div className="card p-8 animate-scale-in text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
              style={{ background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)' }}>⏳</div>
            <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
              You're in the lobby!
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>Waiting for the host to start...</p>

            <div className="grid grid-cols-3 gap-3 mt-2">
              {participants.map((p, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                  <div style={{ backgroundColor: p.avatar_color }}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm">
                    {p.avatar_emoji || p.nickname[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-medium truncate w-full text-center"
                    style={{ color: 'var(--text-2)' }}>{p.nickname}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 mt-5 text-sm" style={{ color: 'var(--text-3)' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--green)' }} />
              {participants.length} player{participants.length !== 1 ? 's' : ''} ready
            </div>
          </div>
        )}
      </div>
    </div>
  );
}