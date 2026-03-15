import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { socket, connectSocket } from '../socket.js';

export default function HostDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [activeParticipantCount, setActiveParticipantCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [canResume, setCanResume] = useState(false);

  useEffect(() => {
    api.get('/api/quiz')
      .then(res => setQuizzes(res.data.quizzes))
      .finally(() => setLoading(false));

    const saved = localStorage.getItem('activeSession');
    if (saved) {
      const session = JSON.parse(saved);
      setActiveSession(session);
      rejoinLobby(session);
    }
  }, []);

  const setupSocketListeners = () => {
    socket.off('host:lobby-ready');
    socket.off('lobby:update');
    socket.off('host:timer-tick');
    socket.off('host:answer-progress');
    socket.off('quiz:question');
    socket.off('quiz:ended');
    socket.off('host:participant-count');
    socket.off('quiz:auto-paused');
    socket.off('host:quiz-can-resume');
    socket.off('quiz:resumed');

    socket.on('host:lobby-ready', () => console.log('✅ Lobby ready'));
    socket.on('lobby:update', ({ participants }) => setParticipants(participants));
    socket.on('host:timer-tick', ({ secondsLeft }) => setTimerSeconds(secondsLeft));
    socket.on('host:answer-progress', ({ answered }) => setAnsweredCount(answered));

    socket.on('quiz:question', (q) => {
      setQuizStarted(true);
      setCurrentQuestionIndex(q.index);
      setTotalQuestions(q.total);
      setAnsweredCount(0);
      setTimerSeconds(q.time_limit);
      setIsPaused(false);
    });

    socket.on('quiz:ended', () => {
      localStorage.removeItem('activeSession');
      setActiveSession(null); setParticipants([]); setQuizStarted(false);
      setTimerSeconds(0); setAnsweredCount(0); setCurrentQuestionIndex(0);
      setIsPaused(false); setActiveParticipantCount(0);
    });

    socket.on('host:participant-count', ({ count, total }) => {
      setActiveParticipantCount(count);
    });

    socket.on('quiz:auto-paused', ({ reason }) => {
      setIsPaused(true);
      setPauseReason(reason);
      setCanResume(false);
    });

    socket.on('host:quiz-can-resume', ({ count }) => {
      setCanResume(true);
      setActiveParticipantCount(count);
    });

    socket.on('quiz:resumed', () => {
      setIsPaused(false);
      setPauseReason('');
    });
  };

  const rejoinLobby = (session) => {
    connectSocket();
    setupSocketListeners();
    socket.emit('host:create-lobby', { sessionId: session.id, quizId: session.quiz_id });
  };

  const handleHostQuiz = async (quiz) => {
    try {
      const existing = localStorage.getItem('activeSession');
      if (existing) {
        const parsed = JSON.parse(existing);
        if (parsed.quiz_id === quiz.id) {
          alert('This quiz is already live! End it first before starting a new one.');
          return;
        }
      }
      const sessRes = await api.post('/api/session/create', { quiz_id: quiz.id });
      const session = sessRes.data.session;
      const fullSession = { ...session, quiz };
      localStorage.setItem('activeSession', JSON.stringify(fullSession));
      setActiveSession(fullSession);
      setParticipants([]); setQuizStarted(false);
      setTimerSeconds(0); setAnsweredCount(0); setCurrentQuestionIndex(0);
      setIsPaused(false); setActiveParticipantCount(0);
      connectSocket();
      setupSocketListeners();
      socket.emit('host:create-lobby', { sessionId: session.id, quizId: quiz.id });
    } catch (err) {
      alert('Failed to start session');
    }
  };

  const handleStartQuiz = () => {
    if (!activeSession) return;
    setQuizStarted(true);
    socket.emit('host:start-quiz', { sessionId: activeSession.id });
  };

  const handleResumeQuiz = () => {
    if (!activeSession) return;
    socket.emit('host:resume-quiz', { sessionId: activeSession.id });
  };

  const handleEndQuiz = () => {
    if (!confirm('Are you sure you want to end this quiz?')) return;
    if (!activeSession) return;
    socket.emit('host:end-quiz', { sessionId: activeSession.id });
    localStorage.removeItem('activeSession');
    setActiveSession(null); setParticipants([]); setQuizStarted(false);
    setTimerSeconds(0); setAnsweredCount(0); setIsPaused(false);
  };

  const handleDelete = async (quizId) => {
    if (!confirm('Delete this quiz? This cannot be undone.')) return;
    await api.delete(`/api/quiz/${quizId}`);
    setQuizzes(prev => prev.filter(q => q.id !== quizId));
  };

  const handlePublish = async (quizId) => {
    try {
      await api.patch(`/api/quiz/${quizId}/publish`);
      setQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, status: 'published' } : q));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to publish');
    }
  };

  const handleUnpublish = async (quizId) => {
    if (!confirm("Unpublish this quiz?")) return;
    try {
      await api.patch(`/api/quiz/${quizId}/unpublish`);
      setQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, status: 'draft' } : q));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to unpublish');
    }
  };

  const draftQuizzes = quizzes.filter(q => q.status === 'draft');
  const publishedQuizzes = quizzes.filter(q => q.status === 'published');
  const timeLimit = activeSession?.quiz?.time_per_question || 30;
  const timerPercent = (timerSeconds / timeLimit) * 100;
  const timerColor = timerSeconds <= 5 ? '#ef4444' : timerSeconds <= 10 ? '#f59e0b' : '#22c55e';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      <nav className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
            style={{ background: 'var(--accent)', fontFamily: 'Sora, sans-serif' }}>C</div>
          <span className="font-bold text-lg" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Curio</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--text-3)' }}>👋 {user?.username}</span>
          <button onClick={logout} className="btn-secondary py-2 px-3 text-sm">Logout</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">

        {activeSession && (
          <div className="card p-6 mb-8 animate-scale-in"
            style={{
              borderColor: isPaused ? 'var(--yellow-border)' : 'var(--green-border)',
              borderWidth: 2
            }}>

            {isPaused && (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-5"
                style={{ background: 'var(--yellow-bg)', border: '1.5px solid var(--yellow-border)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">⏸</span>
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--yellow)', fontFamily: 'Sora, sans-serif' }}>
                      Quiz Auto-Paused
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{pauseReason || 'All participants disconnected'}</p>
                  </div>
                </div>
                <button
                  onClick={handleResumeQuiz}
                  disabled={activeParticipantCount === 0}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                  style={{
                    background: activeParticipantCount > 0 ? 'var(--accent)' : 'var(--bg-3)',
                    color: activeParticipantCount > 0 ? 'white' : 'var(--text-3)',
                    fontFamily: 'Sora, sans-serif'
                  }}>
                  ▶ Resume
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: isPaused ? 'var(--yellow)' : 'var(--green)' }} />
                  <span className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: isPaused ? 'var(--yellow)' : 'var(--green)', fontFamily: 'Sora, sans-serif' }}>
                    {isPaused ? 'Paused' : 'Live Session'}
                  </span>
                </div>
                <p className="text-sm mb-1" style={{ color: 'var(--text-3)' }}>Quiz PIN</p>
                <p className="font-black text-4xl tracking-widest" style={{ fontFamily: 'DM Mono, monospace', color: 'var(--accent)' }}>
                  {activeSession?.quiz?.pin || '------'}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{activeSession?.quiz?.title}</p>
              </div>

              <div className="text-right">
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-baseline gap-1">
                    <p className="text-4xl font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
                      {quizStarted ? activeParticipantCount : participants.length}
                    </p>
                    {quizStarted && participants.length > 0 && (
                      <span className="text-lg font-bold" style={{ color: 'var(--text-3)' }}>
                        /{participants.length}
                      </span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                    {quizStarted ? 'active players' : 'players joined'}
                  </p>
                  {quizStarted && activeParticipantCount < participants.length && (
                    <p className="text-xs" style={{ color: 'var(--yellow)' }}>
                      ⚠ {participants.length - activeParticipantCount} disconnected
                    </p>
                  )}
                </div>
              </div>
            </div>

            {quizStarted && (
              <div className="p-4 rounded-xl mb-5"
                style={{ background: 'var(--bg-2)', border: '1.5px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </span>
                  <span className={`font-black text-2xl tabular-nums ${timerSeconds <= 5 && !isPaused ? 'animate-pulse' : ''}`}
                    style={{ fontFamily: 'DM Mono, monospace', color: isPaused ? 'var(--yellow)' : timerSeconds <= 5 ? 'var(--red)' : 'var(--text)' }}>
                    {isPaused ? '⏸' : `${timerSeconds}s`}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
                    {answeredCount}/{participants.length} answered
                  </span>
                </div>
                {!isPaused && (
                  <>
                    <div className="w-full rounded-full h-2.5 overflow-hidden mb-3" style={{ background: 'var(--bg-3)' }}>
                      <div className="h-2.5 rounded-full transition-all duration-1000"
                        style={{ width: `${timerPercent}%`, background: timerColor }} />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs w-20" style={{ color: 'var(--text-3)' }}>Answered:</span>
                      <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--bg-3)' }}>
                        <div className="h-1.5 rounded-full transition-all duration-300"
                          style={{ width: participants.length > 0 ? `${(answeredCount / participants.length) * 100}%` : '0%', background: 'var(--accent)' }} />
                      </div>
                      <span className="text-xs font-bold w-14 text-right" style={{ color: 'var(--accent)' }}>
                        {answeredCount}/{participants.length}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {!quizStarted && participants.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {participants.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm"
                    style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                    <span>{p.avatar_emoji || '😀'}</span>
                    {p.nickname}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              {!quizStarted ? (
                <>
                  <button onClick={handleStartQuiz} disabled={participants.length === 0} className="btn-primary disabled:opacity-40">
                    ▶ Start Quiz
                  </button>
                  {participants.length === 0 && (
                    <span className="text-sm self-center" style={{ color: 'var(--text-3)' }}>Waiting for players to join...</span>
                  )}
                </>
              ) : isPaused ? (
                <button onClick={handleResumeQuiz} disabled={activeParticipantCount === 0}
                  className="btn-primary disabled:opacity-40">
                  ▶ Resume Quiz
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                  style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)' }}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--green)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--green)' }}>
                    Quiz in progress — auto-advancing
                  </span>
                </div>
              )}
              <button onClick={handleEndQuiz} className="btn-danger">⏹ End Quiz</button>
            </div>

            <p className="text-xs mt-4" style={{ color: 'var(--text-3)' }}>
              🔒 Session saved — refreshing will restore your live quiz
            </p>
          </div>
        )}

       <div className="flex items-center justify-between mb-8">
  <h1 className="text-3xl font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>My Quizzes</h1>
  <div className="flex items-center gap-2">
    <button onClick={() => navigate('/quiz/from-file')} className="btn-secondary text-sm px-4 py-2.5">
      📄 From File
    </button>
    <button onClick={() => navigate('/quiz/ai')} className="btn-secondary text-sm px-4 py-2.5">
      ✨ AI Generate
    </button>
    <Link to="/quiz/create" className="btn-primary text-sm px-4 py-2.5">+ Create Quiz</Link>
  </div>
</div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--accent-border)', borderTopColor: 'var(--accent)' }} />
          </div>
        ) : quizzes.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>No quizzes yet</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>Create your first quiz to get started</p>
            <Link to="/quiz/create" className="btn-primary">Create Quiz</Link>
          </div>
        ) : (
          <>
            {draftQuizzes.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2.5 mb-4">
                  <h2 className="text-lg font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Drafts</h2>
                  <span className="badge-yellow">{draftQuizzes.length}</span>
                  <span className="text-sm" style={{ color: 'var(--text-3)' }}>— Publish to let players join</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {draftQuizzes.map((quiz, i) => (
                    <div key={quiz.id} className="card p-5 animate-slide-up"
                      style={{ animationDelay: `${i * 50}ms`, borderColor: 'var(--yellow-border)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{ background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)' }}>📝</div>
                        <span className="badge-yellow">Draft</span>
                      </div>
                      <h3 className="font-bold text-base mb-1" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>{quiz.title}</h3>
                      <p className="text-sm mb-1 line-clamp-2" style={{ color: 'var(--text-3)' }}>{quiz.description || 'No description'}</p>
                      <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>{quiz.time_per_question}s per question</p>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Link to={`/quiz/edit/${quiz.id}`} className="btn-secondary flex-1 py-2 text-sm text-center">✏️ Edit</Link>
                          <button onClick={() => handlePublish(quiz.id)}
                            className="flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all"
                            style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)', fontFamily: 'Sora, sans-serif' }}>
                            🚀 Publish
                          </button>
                        </div>
                        <button onClick={() => handleDelete(quiz.id)} className="btn-danger py-2 text-sm w-full">🗑 Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {publishedQuizzes.length > 0 && (
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <h2 className="text-lg font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Published</h2>
                  <span className="badge-green">{publishedQuizzes.length}</span>
                  <span className="text-sm" style={{ color: 'var(--text-3)' }}>— Players can join with PIN</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publishedQuizzes.map((quiz, i) => (
                    <div key={quiz.id} className="card p-5 animate-slide-up"
                      style={{ animationDelay: `${i * 50}ms`, borderColor: 'var(--green-border)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)' }}>✅</div>
                        <span className="text-xs font-mono px-2 py-1 rounded-lg"
                          style={{ background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                          PIN: {quiz.pin}
                        </span>
                      </div>
                      <h3 className="font-bold text-base mb-1" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>{quiz.title}</h3>
                      <p className="text-sm mb-1 line-clamp-2" style={{ color: 'var(--text-3)' }}>{quiz.description || 'No description'}</p>
                      <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>{quiz.time_per_question}s per question</p>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button onClick={() => handleHostQuiz(quiz)} className="btn-primary flex-1 py-2 text-sm">🎮 Host</button>
                          <Link to={`/quiz/edit/${quiz.id}`} className="btn-secondary py-2 px-4 text-sm text-center">✏️</Link>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleUnpublish(quiz.id)}
                            className="flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all"
                            style={{ background: 'var(--yellow-bg)', color: 'var(--yellow)', border: '1px solid var(--yellow-border)', fontFamily: 'Sora, sans-serif' }}>
                            📝 Unpublish
                          </button>
                          <button onClick={() => handleDelete(quiz.id)} className="btn-danger py-2 px-3 text-sm">🗑</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}