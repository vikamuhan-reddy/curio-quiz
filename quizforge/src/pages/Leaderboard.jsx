import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import api from '../api.js';

const MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_COLORS = ['#f59e0b', '#6366f1', '#10b981'];

function ScoreBarChart({ players }) {
  const maxScore = Math.max(...players.map(p => Number(p.total_score)), 1);

  return (
    <div className="card p-6 mb-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
      <h3 className="text-sm font-bold mb-5 text-center uppercase tracking-wider"
        style={{ color: 'var(--text-3)', fontFamily: 'Sora, sans-serif' }}>
        Score Comparison
      </h3>
      <div className="flex items-end justify-center gap-6">
        {players.map((p, i) => {
          const heightPct = (Number(p.total_score) / maxScore) * 100;
          const barHeight = Math.max(heightPct * 1.2, 20);

          return (
            <div key={i} className="flex flex-col items-center gap-2" style={{ minWidth: '72px' }}>
              <span className="font-black text-sm tabular-nums"
                style={{ fontFamily: 'DM Mono, monospace', color: PODIUM_COLORS[i] }}>
                {p.total_score}
              </span>
              <div className="relative w-14 rounded-t-xl overflow-hidden transition-all duration-700"
                style={{
                  height: `${barHeight}px`,
                  background: `${PODIUM_COLORS[i]}22`,
                  border: `2px solid ${PODIUM_COLORS[i]}55`,
                  borderBottom: 'none',
                }}>
                <div className="absolute bottom-0 left-0 right-0 rounded-t-xl"
                  style={{
                    height: '100%',
                    background: `linear-gradient(to top, ${PODIUM_COLORS[i]}, ${PODIUM_COLORS[i]}88)`,
                    animation: 'bar-grow 0.8s ease-out forwards',
                    animationDelay: `${i * 150}ms`,
                    transform: 'scaleY(0)',
                    transformOrigin: 'bottom',
                  }} />
              </div>
              <div style={{ backgroundColor: p.avatar_color || PODIUM_COLORS[i] }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm">
                {p.avatar_emoji || p.nickname[0].toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-center max-w-16 truncate"
                style={{ color: 'var(--text-2)' }}>
                {p.nickname}
              </span>
              <span className="text-xl">{MEDALS[i]}</span>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes bar-grow {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

function SuspenseScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--bg)' }}>
      <div className="card p-12 text-center max-w-sm animate-scale-in">
        <div className="text-6xl mb-5">🔒</div>
        <h2 className="text-2xl font-black mb-3"
          style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
          Leaderboard Locked
        </h2>
        <p className="text-sm mb-2" style={{ color: 'var(--text-3)' }}>
          Complete at least <span className="font-bold" style={{ color: 'var(--accent)' }}>5 questions</span> to reveal the rankings.
        </p>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          Keep playing — the suspense is part of the fun! 🎉
        </p>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const { sessionId } = useParams();
  const location = useLocation();
  const [leaderboard, setLeaderboard] = useState(location.state?.leaderboard || []);
  const [loading, setLoading] = useState(!location.state?.leaderboard);
  const [questionsCompleted, setQuestionsCompleted] = useState(location.state?.questionsCompleted ?? null);

  useEffect(() => {
    if (!location.state?.leaderboard) {
      api.get(`/api/session/${sessionId}/leaderboard`)
        .then(res => {
          setLeaderboard(res.data.leaderboard);
          setQuestionsCompleted(res.data.questions_completed ?? 999);
        })
        .finally(() => setLoading(false));
    } else {
      if (questionsCompleted === null) setQuestionsCompleted(999);
    }
  }, [sessionId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--accent-border)', borderTopColor: 'var(--accent)' }} />
    </div>
  );

  if (questionsCompleted !== null && questionsCompleted < 5) {
    return <SuspenseScreen />;
  }

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="min-h-screen px-4 py-12 max-w-xl mx-auto" style={{ background: 'var(--bg)' }}>

      <div className="text-center mb-10 animate-fade-in">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-4xl font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Final Results</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-3)' }}>Quiz complete! Here's the top 3.</p>
      </div>

      {top3.length >= 2 && <ScoreBarChart players={top3} />}

      {top3.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-8 animate-slide-up">
          {[top3[1], top3[0], top3[2]].map((p, pos) => {
            const heights = ['h-24', 'h-32', 'h-20'];
            const actualPos = pos === 0 ? 1 : pos === 1 ? 0 : 2;
            return p ? (
              <div key={actualPos} className="flex flex-col items-center gap-1.5">
                <div style={{ backgroundColor: p.avatar_color || PODIUM_COLORS[actualPos] }}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-md">
                  {p.avatar_emoji || p.nickname[0].toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-center max-w-16 truncate"
                  style={{ color: 'var(--text-2)' }}>
                  {p.nickname}
                </span>
                <span className="text-xs font-bold tabular-nums"
                  style={{ color: PODIUM_COLORS[actualPos], fontFamily: 'DM Mono, monospace' }}>
                  {p.total_score} pts
                </span>
                <div className={`${heights[pos]} w-20 rounded-t-xl flex items-start justify-center pt-2 text-2xl`}
                  style={{
                    background: `${PODIUM_COLORS[actualPos]}18`,
                    border: `2px solid ${PODIUM_COLORS[actualPos]}44`,
                    borderBottom: 'none'
                  }}>
                  {MEDALS[actualPos]}
                </div>
              </div>
            ) : null;
          })}
        </div>
      )}

      <div className="space-y-2.5 mb-8">
        {top3.map((p, i) => (
          <div key={i}
            className="card p-4 flex items-center gap-4 animate-slide-up"
            style={{
              animationDelay: `${i * 60}ms`,
              borderColor: i === 0 ? '#f59e0b55' : i === 1 ? '#6366f155' : '#10b98155',
              borderWidth: 2
            }}>
            <span className="text-xl font-black w-8 text-center">{MEDALS[i]}</span>
            <div style={{ backgroundColor: p.avatar_color || PODIUM_COLORS[i] }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
              {p.avatar_emoji || p.nickname[0].toUpperCase()}
            </div>
            <span className="flex-1 font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
              {p.nickname}
            </span>
            <div className="text-right">
              <p className="font-bold tabular-nums"
                style={{ color: PODIUM_COLORS[i], fontFamily: 'DM Mono, monospace' }}>
                {p.total_score} pts
              </p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                {p.correct_answers}/{p.total_answers} correct
              </p>
            </div>
          </div>
        ))}
      </div>

      {leaderboard.length > 3 && (
        <p className="text-center text-sm mb-6" style={{ color: 'var(--text-3)' }}>
          + {leaderboard.length - 3} more player{leaderboard.length - 3 !== 1 ? 's' : ''} competed
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <Link to="/join" className="btn-primary flex-1 text-center">Play Again 🎮</Link>
        <Link to="/" className="btn-secondary flex-1 text-center">Home</Link>
      </div>
    </div>
  );
}