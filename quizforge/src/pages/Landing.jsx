import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Nav */}
      <nav className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
            style={{ background: 'var(--accent)', fontFamily: 'Sora, sans-serif' }}>C</div>
          <span className="font-bold text-lg" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Curio</span>
        </div>
        <div className="flex gap-2">
          {user ? (
            <Link to="/dashboard" className="btn-primary py-2 px-4 text-sm">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn-secondary py-2 px-4 text-sm">Login</Link>
              <Link to="/register" className="btn-primary py-2 px-4 text-sm">Sign Up Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">

        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 text-sm px-4 py-1.5 rounded-full mb-8 font-medium"
            style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)', fontFamily: 'Sora, sans-serif' }}>
            ⚡ Real-time multiplayer quizzes
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight animate-slide-up"
          style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)', letterSpacing: '-0.03em' }}>
          Quiz Together,<br />
          <span style={{ color: 'var(--accent)' }}>Win Together</span>
        </h1>

        <p className="text-lg max-w-xl mb-10 animate-slide-up" style={{ color: 'var(--text-2)', animationDelay: '80ms' }}>
          Host live quizzes for your team, classroom, or friends. Real-time leaderboards, speed bonuses, and instant results.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-20 animate-slide-up" style={{ animationDelay: '140ms' }}>
          <Link to="/join" className="btn-primary text-base py-3.5 px-8">🎮 Join a Quiz</Link>
          <Link to="/register" className="btn-secondary text-base py-3.5 px-8">🚀 Host a Quiz</Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl w-full">
          {[
            { icon: '⚡', title: 'Real-time', desc: 'Socket.IO powered live updates — answers, scores, and leaderboard all instant.' },
            { icon: '🏆', title: 'Leaderboards', desc: 'Live rankings with speed bonuses. The faster you answer, the more points!' },
            { icon: '🎨', title: 'Any Question Type', desc: 'MCQ, True/False, Multi-select — build engaging quizzes in minutes.' }
          ].map((f, i) => (
            <div key={i} className="card p-6 text-left animate-slide-up" style={{ animationDelay: `${200 + i * 80}ms` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                style={{ background: 'var(--accent-bg)' }}>{f.icon}</div>
              <h3 className="font-bold text-base mb-1.5" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-6 text-sm border-t" style={{ color: 'var(--text-3)', borderColor: 'var(--border)' }}>
        Built with React · Socket.IO · PostgreSQL
      </footer>
    </div>
  );
}