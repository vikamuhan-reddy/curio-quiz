import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { socket, connectSocket } from '../socket.js';

const OPTION_STYLES = [
  {
    idle:   'bg-rose-50   border-rose-200   hover:bg-rose-100   text-rose-800',
    active: 'bg-rose-500  border-rose-500   text-white',
    icon: '🔺'
  },
  {
    idle:   'bg-blue-50   border-blue-200   hover:bg-blue-100   text-blue-800',
    active: 'bg-blue-500  border-blue-500   text-white',
    icon: '🔷'
  },
  {
    idle:   'bg-amber-50  border-amber-200  hover:bg-amber-100  text-amber-800',
    active: 'bg-amber-500 border-amber-500  text-white',
    icon: '⭐'
  },
  {
    idle:   'bg-emerald-50  border-emerald-200  hover:bg-emerald-100  text-emerald-800',
    active: 'bg-emerald-500 border-emerald-500  text-white',
    icon: '🟢'
  }
];

// ─── Loading vehicles ──────────────────────────────────────
const VEHICLES = [
  { emoji: '🚌', name: 'Bus', speed: 3.5 },
  { emoji: '🚂', name: 'Train', speed: 2.5 },
  { emoji: '🏎️', name: 'Race Car', speed: 1.8 },
  { emoji: '🛸', name: 'UFO', speed: 2.2 },
  { emoji: '🚀', name: 'Rocket', speed: 1.5 },
];

function LoadingScreen({ vehicle, countdown }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm text-center">
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-3)', fontFamily: 'Sora, sans-serif' }}>
          Next question in
        </p>
        <p className="font-black text-5xl mb-8 tabular-nums"
          style={{ fontFamily: 'DM Mono, monospace', color: 'var(--accent)' }}>
          {countdown}s
        </p>

        {/* Track */}
        <div className="relative h-20 mb-6 overflow-hidden rounded-2xl"
          style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)' }}>
          {/* Road lines */}
          <div className="absolute inset-y-0 left-0 right-0 flex items-center">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex-1 mx-1 h-1 rounded-full opacity-30"
                style={{ background: 'var(--text-3)' }} />
            ))}
          </div>
          {/* Vehicle animation */}
          <div className="absolute inset-y-0 flex items-center"
            style={{
              animation: `vehicle-drive ${vehicle.speed}s linear infinite`,
              fontSize: '2.5rem',
              left: '-3rem',
            }}>
            {vehicle.emoji}
          </div>
        </div>

        <div className="flex justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{
                background: 'var(--accent)',
                animationDelay: `${i * 200}ms`
              }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes vehicle-drive {
          from { left: -3rem; }
          to { left: calc(100% + 1rem); }
        }
      `}</style>
    </div>
  );
}

export default function QuizPlayer() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(30);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Feature: loading vehicle with countdown
  const [showLoading, setShowLoading] = useState(false);
  const [loadingCountdown, setLoadingCountdown] = useState(3);
  const [currentVehicle, setCurrentVehicle] = useState(VEHICLES[0]);

  // Feature: user profile
  const [participant, setParticipant] = useState(null);

  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const loadingTimerRef = useRef(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('participant') || '{}');
    if (saved?.id) setParticipant(saved);
  }, []);

  const pickVehicle = () => VEHICLES[Math.floor(Math.random() * VEHICLES.length)];

  const startQuestion = (q) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
    setShowLoading(false);
    setQuestion(q);
    setSelected([]);
    setResult(null);
    setIsPaused(false);

    const timeLimit = q.time_limit;
    let startTime;
    if (q.question_started_at) {
      const elapsedMs = Date.now() - q.question_started_at;
      const remainingMs = Math.max(0, (timeLimit * 1000) - elapsedMs);
      startTime = Math.ceil(remainingMs / 1000);
    } else {
      startTime = timeLimit;
    }

    setTotalTime(startTime);
    setTimeLeft(startTime);
    startTimeRef.current = q.question_started_at || Date.now();

    if (q.alreadyAnswered) {
      setSubmitted(true);
      let remaining = startTime;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) { clearInterval(timerRef.current); setTimeLeft(0); }
        else setTimeLeft(remaining);
      }, 1000);
      return;
    }

    setSubmitted(false);
    let remaining = startTime;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) { clearInterval(timerRef.current); setTimeLeft(0); }
      else setTimeLeft(remaining);
    }, 1000);
  };

  // ─── Show loading screen for full nextIn duration ─────────
  // All players wait the same time regardless of when they answered
  const showLoadingScreen = (nextIn = 3) => {
    setCurrentVehicle(pickVehicle());
    setLoadingCountdown(nextIn);
    setShowLoading(true);

    let count = nextIn;
    loadingTimerRef.current = setInterval(() => {
      count--;
      setLoadingCountdown(count);
      if (count <= 0) {
        clearInterval(loadingTimerRef.current);
        // Loading screen stays visible until quiz:question fires and calls startQuestion
        // which clears it — this ensures fair timing for all players
      }
    }, 1000);
  };

  useEffect(() => {
    connectSocket();

    socket.off('connect');
    socket.off('quiz:question');
    socket.off('quiz:time-up');
    socket.off('player:answer-result');
    socket.off('quiz:between-questions');
    socket.off('quiz:ended');
    socket.off('quiz:auto-paused');
    socket.off('quiz:resumed');

    const handleConnect = () => {
      const saved = JSON.parse(localStorage.getItem('participant') || '{}');
      socket.emit('player:rejoin', { sessionId, participantId: saved?.id });
    };

    socket.on('connect', handleConnect);
    socket.on('quiz:question', (q) => startQuestion(q));
    socket.on('quiz:time-up', ({ correctAnswers }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(0); setSubmitted(true);
      setResult({ isCorrect: false, pointsEarned: 0, correctAnswers });
    });
    socket.on('player:answer-result', (res) => {
      setResult(res);
      if (res.isCorrect) setScore(prev => prev + res.pointsEarned);
    });
    socket.on('quiz:between-questions', ({ leaderboard, questionIndex, total, nextIn }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setSubmitted(false); setResult(null); setSelected([]);
      // Show loading screen for the full server-defined wait time (fair for all players)
      showLoadingScreen(nextIn || 3);
    });
    socket.on('quiz:ended', ({ leaderboard }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
      navigate(`/leaderboard/${sessionId}`, { state: { leaderboard } });
    });
    socket.on('quiz:auto-paused', () => setIsPaused(true));
    socket.on('quiz:resumed', () => setIsPaused(false));

    if (location.state?.firstQuestion) {
      startQuestion(location.state.firstQuestion);
    } else if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('quiz:question');
      socket.off('quiz:time-up');
      socket.off('player:answer-result');
      socket.off('quiz:between-questions');
      socket.off('quiz:ended');
      socket.off('quiz:auto-paused');
      socket.off('quiz:resumed');
      if (timerRef.current) clearInterval(timerRef.current);
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
    };
  }, [sessionId]);

  const toggleOption = (optionId) => {
    if (submitted) return;
    if (question?.question_type === 'mcq' || question?.question_type === 'true_false') {
      setSelected([optionId]);
    } else {
      setSelected(prev => prev.includes(optionId) ? prev.filter(x => x !== optionId) : [...prev, optionId]);
    }
  };

  const handleSubmit = () => {
    if (submitted || selected.length === 0) return;
    const responseTimeMs = Date.now() - startTimeRef.current;
    socket.emit('player:submit-answer', { sessionId, selectedAnswers: selected, responseTimeMs });
    setSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleLeave = () => {
    if (confirm('Are you sure you want to leave the quiz?')) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
      socket.off('connect'); socket.off('quiz:question'); socket.off('quiz:time-up');
      socket.off('player:answer-result'); socket.off('quiz:between-questions'); socket.off('quiz:ended');
      navigate('/join');
    }
  };

  const timerPercent = (timeLeft / totalTime) * 100;
  const timerColor = timeLeft > 10 ? '#22c55e' : timeLeft > 5 ? '#f59e0b' : '#ef4444';

  // ─── Loading screen (between questions — all players wait the same time) ──
  if (showLoading) {
    return <LoadingScreen vehicle={currentVehicle} countdown={loadingCountdown} />;
  }

  // ─── Paused screen ───────────────────────────────────────
  if (isPaused) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center card p-10 max-w-sm mx-4">
          <div className="text-5xl mb-4">⏸</div>
          <h2 className="text-2xl font-black mb-2" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--yellow)' }}>
            Quiz Paused
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            The host will resume shortly...
          </p>
          <div className="flex items-center justify-center gap-2 mt-5 text-sm animate-pulse" style={{ color: 'var(--text-3)' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--yellow)' }} />
            Waiting for host
          </div>
        </div>
      </div>
    );
  }

  // ─── Waiting screen ─────────────────────────────────────
  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          {participant && (
            <div style={{ backgroundColor: participant.avatar_color }}
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-md">
              {participant.avatar_emoji || participant.nickname?.[0]?.toUpperCase() || '😀'}
            </div>
          )}
          <div className="w-14 h-14 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'var(--accent-border)', borderTopColor: 'var(--accent)' }} />
          <p className="font-semibold" style={{ color: 'var(--text)' }}>
            {participant?.nickname ? `Hey ${participant.nickname}!` : 'Waiting for host...'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>The quiz will start soon</p>
          <button onClick={() => navigate('/join')} className="mt-6 text-sm" style={{ color: 'var(--text-3)' }}>
            ← Leave & go back
          </button>
        </div>
      </div>
    );
  }

  const options = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;

  // ─── Question screen ────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col p-4 max-w-2xl mx-auto" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-3 pt-2">
        <div className="flex items-center gap-2">
          {participant && (
            <div style={{ backgroundColor: participant.avatar_color }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-base shadow-sm flex-shrink-0">
              {participant.avatar_emoji || participant.nickname?.[0]?.toUpperCase() || '😀'}
            </div>
          )}
          <span className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>Q{question.index + 1}/{question.total}</span>
        </div>
        <div className={`font-black text-2xl tabular-nums ${timeLeft <= 5 ? 'animate-pulse' : ''}`}
          style={{ fontFamily: 'DM Mono, monospace', color: timeLeft <= 5 ? 'var(--red)' : 'var(--text)' }}>
          {timeLeft}s
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{question.points} pts</span>
          <button onClick={handleLeave} className="text-xs" style={{ color: 'var(--text-3)' }}>✕ Leave</button>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full rounded-full h-2.5 mb-6 overflow-hidden" style={{ background: 'var(--bg-3)' }}>
        <div className="h-2.5 rounded-full transition-all duration-1000"
          style={{ width: `${timerPercent}%`, background: timerColor }} />
      </div>

      {/* Question card */}
      <div className="card p-6 mb-5 text-center">
        <p className="text-xl font-bold leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
          {question.question_text}
        </p>
        {question.question_type === 'multi_select' && (
          <p className="text-sm mt-2 font-medium" style={{ color: 'var(--accent)' }}>Select all correct answers</p>
        )}
      </div>

      {/* Options or Result */}
      {!submitted ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {options.map((opt, i) => {
              const style = OPTION_STYLES[i % OPTION_STYLES.length];
              const isSelected = selected.includes(opt.id);
              return (
                <button key={opt.id} onClick={() => toggleOption(opt.id)}
                  className={`option-btn border-2 ${isSelected ? style.active : style.idle}`}>
                  <span className="mr-2">{style.icon}</span>
                  <span style={{ fontFamily: 'Sora, sans-serif' }}>{opt.text}</span>
                </button>
              );
            })}
          </div>
          <button onClick={handleSubmit} disabled={selected.length === 0} className="btn-primary w-full py-4 text-base">
            Submit Answer ✓
          </button>
        </>
      ) : (
        result ? (
          <div className="card p-8 text-center animate-scale-in"
            style={{ borderColor: result.isCorrect ? 'var(--green-border)' : 'var(--red-border)', borderWidth: 2 }}>
            {result.isCorrect ? (
              <>
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-3xl font-black mb-3"
                  style={{ fontFamily: 'Sora, sans-serif', color: 'var(--green)' }}>Correct!</h2>
                <div className="inline-block px-6 py-4 rounded-2xl mb-4"
                  style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
                  <p className="text-4xl font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--accent)' }}>
                    +{result.pointsEarned}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>points earned</p>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  Total: <span className="font-bold" style={{ color: 'var(--text)' }}>{score} pts</span>
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">❌</div>
                <h2 className="text-3xl font-black mb-3"
                  style={{ fontFamily: 'Sora, sans-serif', color: 'var(--red)' }}>Not quite...</h2>
                {result.correctAnswers && (
                  <div className="mt-2">
                    <p className="text-sm mb-3" style={{ color: 'var(--text-3)' }}>Correct answer was:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {options.filter(o => result.correctAnswers.includes(o.id)).map(o => (
                        <span key={o.id} className="px-4 py-2 rounded-xl text-sm font-bold"
                          style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' }}>
                          {o.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <p className="text-sm mt-6 animate-pulse" style={{ color: 'var(--text-3)' }}>⏳ Next question coming up...</p>
          </div>
        ) : (
          <div className="card p-8 text-center"
            style={{ borderColor: 'var(--accent-border)', borderWidth: 2 }}>
            <div className="text-5xl mb-4">✔️</div>
            <h2 className="text-xl font-bold mb-2"
              style={{ fontFamily: 'Sora, sans-serif', color: 'var(--accent)' }}>Answer submitted!</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>Waiting for other players...</p>
            <div className={`font-black text-4xl tabular-nums ${timeLeft <= 5 ? 'animate-pulse' : ''}`}
              style={{ fontFamily: 'DM Mono, monospace', color: timeLeft <= 5 ? 'var(--red)' : 'var(--accent)' }}>
              {timeLeft}s
            </div>
          </div>
        )
      )}
    </div>
  );
}