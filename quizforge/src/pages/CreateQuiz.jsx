import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api.js';

const defaultQuestion = () => ({
  question_text: '',
  question_type: 'mcq',
  options: [
    { id: 'a', text: '' }, { id: 'b', text: '' },
    { id: 'c', text: '' }, { id: 'd', text: '' }
  ],
  correct_answers: [],
  points: 100
});

export default function CreateQuiz() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [questions, setQuestions] = useState([defaultQuestion()]);
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [loadingQuiz, setLoadingQuiz] = useState(isEditing);

  useEffect(() => {
    if (!isEditing) return;
    api.get(`/api/quiz/${id}`)
      .then(res => {
        const { quiz, questions: qs } = res.data;
        setTitle(quiz.title);
        setDescription(quiz.description || '');
        setTimePerQuestion(quiz.time_per_question);
        setStatus(quiz.status || 'draft');
        if (qs?.length > 0) {
          setQuestions(qs.map(q => ({
            question_text: q.question_text,
            question_type: q.question_type,
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
            correct_answers: typeof q.correct_answers === 'string' ? JSON.parse(q.correct_answers) : q.correct_answers,
            points: q.points
          })));
        }
      })
      .catch(() => setError('Failed to load quiz'))
      .finally(() => setLoadingQuiz(false));
  }, [id, isEditing]);

  const validate = () => {
    if (!title.trim()) { setError('Quiz title is required'); return false; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) { setError(`Question ${i + 1} text is empty`); return false; }
      if (q.question_type !== 'true_false' && q.options.some(o => !o.text.trim())) {
        setError(`Fill all options in question ${i + 1}`); return false;
      }
      if (q.correct_answers.length === 0) { setError(`Select correct answer for question ${i + 1}`); return false; }
    }
    return true;
  };

  const saveQuiz = async (newStatus) => {
    const payload = { title, description, time_per_question: timePerQuestion, questions, status: newStatus };
    if (isEditing) return (await api.put(`/api/quiz/${id}`, payload)).data;
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

  const updateQuestion = (index, field, value) =>
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));

  const updateOption = (qIndex, optIndex, value) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      return { ...q, options: q.options.map((o, j) => j === optIndex ? { ...o, text: value } : o) };
    }));

  const toggleCorrect = (qIndex, optId) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      let correct;
      if (q.question_type === 'mcq' || q.question_type === 'true_false') correct = [optId];
      else correct = q.correct_answers.includes(optId)
        ? q.correct_answers.filter(x => x !== optId)
        : [...q.correct_answers, optId];
      return { ...q, correct_answers: correct };
    }));

  if (loadingQuiz) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--accent-border)', borderTopColor: 'var(--accent)' }} />
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-10 max-w-3xl mx-auto" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/dashboard" className="text-sm font-medium hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-3)' }}>← Back</Link>
        <h1 className="text-3xl font-black flex-1" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
          {isEditing ? '✏️ Edit Quiz' : ' Create Quiz'}
        </h1>
        <span className={status === 'published' ? 'badge-green' : 'badge-yellow'}>
          {status === 'published' ? '✅ Published' : '📝 Draft'}
        </span>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl mb-6 text-sm"
          style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>
          {error}
        </div>
      )}

      {/* Quiz Details */}
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-base mb-4" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>Quiz Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="input-field" placeholder="My Awesome Quiz" />
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

      {/* Questions */}
      {questions.map((q, qi) => (
        <div key={qi} className="card p-6 mb-4 animate-slide-up" style={{ animationDelay: `${qi * 40}ms` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--accent)' }}>
              Question {qi + 1}
            </h3>
            <div className="flex items-center gap-3">
              <select value={q.question_type} onChange={e => updateQuestion(qi, 'question_type', e.target.value)}
                className="input-field py-1.5 text-sm" style={{ width: 'auto' }}>
                <option value="mcq">MCQ</option>
                <option value="true_false">True / False</option>
                <option value="multi_select">Multi-Select</option>
              </select>
              {questions.length > 1 && (
                <button onClick={() => setQuestions(prev => prev.filter((_, idx) => idx !== qi))}
                  className="text-sm font-medium" style={{ color: 'var(--red)' }}>Remove</button>
              )}
            </div>
          </div>

          <textarea value={q.question_text} onChange={e => updateQuestion(qi, 'question_text', e.target.value)}
            className="input-field resize-none mb-4" rows={2} placeholder="Enter your question here..." />

          <div className="space-y-2 mb-4">
            {(q.question_type === 'true_false'
              ? [{ id: 'a', text: 'True' }, { id: 'b', text: 'False' }]
              : q.options
            ).map((opt, oi) => (
              <div key={opt.id} className="flex items-center gap-3">
                <button type="button" onClick={() => toggleCorrect(qi, opt.id)}
                  className="w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                  style={{
                    background: q.correct_answers.includes(opt.id) ? 'var(--green)' : 'var(--surface)',
                    borderColor: q.correct_answers.includes(opt.id) ? 'var(--green)' : 'var(--border-2)'
                  }}>
                  {q.correct_answers.includes(opt.id) && <span className="text-white text-xs font-bold">✓</span>}
                </button>
                {q.question_type === 'true_false' ? (
                  <span className="input-field py-2 text-sm cursor-default select-none">{opt.text}</span>
                ) : (
                  <input type="text" value={opt.text} onChange={e => updateOption(qi, oi, e.target.value)}
                    className="input-field py-2 text-sm" placeholder={`Option ${opt.id.toUpperCase()}`} />
                )}
              </div>
            ))}
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
              {q.question_type === 'multi_select' ? '🔵 Click circles to mark all correct answers' : '🟢 Click circle to mark the correct answer'}
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

      <button onClick={() => setQuestions(prev => [...prev, defaultQuestion()])}
        className="btn-secondary w-full py-4 text-base mt-2 mb-6">
        + Add Question
      </button>

      <div className="flex gap-3">
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
    </div>
  );
}