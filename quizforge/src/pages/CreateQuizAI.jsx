import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api.js';

export default function CreateQuizAI() {
  const navigate = useNavigate();

  // ─── Step 1: Generation config
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');

  // ─── Step 2: Generated quiz
  const [questions, setQuestions] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timePerQuestion, setTimePerQuestion] = useState(30);

  // ─── UI state
  const [step, setStep] = useState(1); // 1 = config, 2 = review
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  // ─── GENERATE ─────────────────────────────────────────
  const handleGenerate = async () => {
    if (!topic.trim()) { setError('Please enter a topic'); return; }
    setError(''); setGenerating(true);
    try {
      const res = await api.post('/api/ai/generate', { topic, numQuestions, difficulty });
      setQuestions(res.data.questions);
      setTitle(`${topic} Quiz`);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setGenerating(false);
    }
  };

  // ─── EDIT QUESTION ────────────────────────────────────
  const updateQuestion = (qi, field, value) =>
    setQuestions(prev => prev.map((q, i) => i === qi ? { ...q, [field]: value } : q));

  const updateOption = (qi, oi, value) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qi) return q;
      return { ...q, options: q.options.map((o, j) => j === oi ? { ...o, text: value } : o) };
    }));

  const toggleCorrect = (qi, optId) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qi) return q;
      return { ...q, correct_answers: [optId] };
    }));

  const removeQuestion = (qi) =>
    setQuestions(prev => prev.filter((_, i) => i !== qi));

  // ─── SAVE / PUBLISH ───────────────────────────────────
  const validate = () => {
    if (!title.trim()) { setError('Quiz title is required'); return false; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) { setError(`Question ${i + 1} text is empty`); return false; }
      if (q.correct_answers.length === 0) { setError(`Select correct answer for question ${i + 1}`); return false; }
    }
    return true;
  };

  const saveQuiz = async (status) => {
    const payload = { title, description, time_per_question: timePerQuestion, questions, status };
    return (await api.post('/api/quiz/create', payload)).data;
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) { setError('Add a title to save draft'); return; }
    setError(''); setSaving(true);
    try { await saveQuiz('draft'); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.error || 'Failed to save draft'); }
    finally { setSaving(false); }
  };

  const handlePublish = async () => {
    if (!validate()) return;
    setError(''); setPublishing(true);
    try { await saveQuiz('published'); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.error || 'Failed to publish'); }
    finally { setPublishing(false); }
  };

  // ─── RENDER ───────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-10 max-w-3xl mx-auto" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/dashboard" className="text-sm font-medium hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-3)' }}>← Back</Link>
        <h1 className="text-3xl font-black flex-1" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
          ✨ AI Quiz Generator
        </h1>
        {step === 2 && (
          <button onClick={() => { setStep(1); setQuestions([]); setError(''); }}
            className="text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: 'var(--accent)' }}>
            ↺ Regenerate
          </button>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl mb-6 text-sm"
          style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>
          {error}
        </div>
      )}

      {/* ── STEP 1: Config ── */}
      {step === 1 && (
        <div className="card p-6">
          <h2 className="font-bold text-base mb-5" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            What should the quiz be about?
          </h2>
          <div className="space-y-5">

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>
                Topic *
              </label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                className="input-field"
                placeholder="e.g. World War II, Python basics, Human anatomy..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>
                Number of questions: <span className="font-bold" style={{ color: 'var(--accent)' }}>{numQuestions}</span>
              </label>
              <input type="range" min={3} max={20} step={1} value={numQuestions}
                onChange={e => setNumQuestions(+e.target.value)}
                className="w-full" style={{ accentColor: 'var(--accent)' }} />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                <span>3</span><span>20</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>
                Difficulty
              </label>
              <div className="flex gap-2">
                {['easy', 'medium', 'hard'].map(d => (
                  <button key={d} type="button"
                    onClick={() => setDifficulty(d)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all"
                    style={{
                      background: difficulty === d ? 'var(--accent)' : 'var(--surface)',
                      color: difficulty === d ? '#fff' : 'var(--text-2)',
                      border: `1px solid ${difficulty === d ? 'var(--accent)' : 'var(--border)'}`,
                      fontFamily: 'Sora, sans-serif'
                    }}>
                    {d === 'easy' ? '😊 Easy' : d === 'medium' ? '🤔 Medium' : '🔥 Hard'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary w-full py-4 text-base mt-2">
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  Generating with AI...
                </span>
              ) : '✨ Generate Quiz'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Review & Edit ── */}
      {step === 2 && (
        <>
          {/* Quiz Details */}
          <div className="card p-6 mb-6">
            <h2 className="font-bold text-base mb-4" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
              Quiz Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>Title *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="input-field" placeholder="My AI Quiz" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  className="input-field resize-none" rows={2} placeholder="Optional description..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>
                  Time per question: <span className="font-bold" style={{ color: 'var(--accent)' }}>{timePerQuestion}s</span>
                </label>
                <input type="range" min={10} max={120} step={5} value={timePerQuestion}
                  onChange={e => setTimePerQuestion(+e.target.value)}
                  className="w-full" style={{ accentColor: 'var(--accent)' }} />
                <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                  <span>10s</span><span>120s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Generated Questions */}
          <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
            ✅ {questions.length} questions generated — review and edit before saving
          </p>

          {questions.map((q, qi) => (
            <div key={qi} className="card p-6 mb-4 animate-slide-up" style={{ animationDelay: `${qi * 30}ms` }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--accent)' }}>
                  Question {qi + 1}
                </h3>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(qi)}
                    className="text-sm font-medium" style={{ color: 'var(--red)' }}>
                    Remove
                  </button>
                )}
              </div>

              <textarea value={q.question_text}
                onChange={e => updateQuestion(qi, 'question_text', e.target.value)}
                className="input-field resize-none mb-4" rows={2} />

              <div className="space-y-2 mb-2">
                {q.options.map((opt, oi) => (
                  <div key={opt.id} className="flex items-center gap-3">
                    <button type="button" onClick={() => toggleCorrect(qi, opt.id)}
                      className="w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                      style={{
                        background: q.correct_answers.includes(opt.id) ? 'var(--green)' : 'var(--surface)',
                        borderColor: q.correct_answers.includes(opt.id) ? 'var(--green)' : 'var(--border-2)'
                      }}>
                      {q.correct_answers.includes(opt.id) && <span className="text-white text-xs font-bold">✓</span>}
                    </button>
                    <input type="text" value={opt.text}
                      onChange={e => updateOption(qi, oi, e.target.value)}
                      className="input-field py-2 text-sm" placeholder={`Option ${opt.id.toUpperCase()}`} />
                  </div>
                ))}
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                  🟢 Click circle to mark the correct answer
                </p>
              </div>

              <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <label className="text-sm" style={{ color: 'var(--text-3)' }}>Points:</label>
                <select value={q.points} onChange={e => updateQuestion(qi, 'points', +e.target.value)}
                  className="input-field py-1.5 text-sm" style={{ width: 'auto' }}>
                  {[50, 100, 200, 500].map(p => <option key={p} value={p}>{p} pts</option>)}
                </select>
              </div>
            </div>
          ))}

          <div className="flex gap-3 mt-6">
            <button onClick={handleSaveDraft} disabled={saving} className="btn-secondary flex-1 py-4">
              {saving ? '⏳ Saving...' : '💾 Save Draft'}
            </button>
            <button onClick={handlePublish} disabled={publishing} className="btn-primary flex-1 py-4">
              {publishing ? '⏳ Publishing...' : '🚀 Publish Quiz'}
            </button>
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'var(--text-3)' }}>
            💡 Drafts are only visible to you. Publish to let players join with the PIN.
          </p>
        </>
      )}
    </div>
  );
}