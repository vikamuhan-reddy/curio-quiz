import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'multi_select', label: 'Multi Select' },
];

export default function CreateQuizFromFile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [quizSubtitle, setQuizSubtitle] = useState('');
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [questions, setQuestions] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const validExt = f.name.endsWith('.pdf') || f.name.endsWith('.txt') || f.name.endsWith('.csv');
    if (!validExt) { setError('Please upload a PDF, TXT, or CSV file'); return; }
    setFile(f); setError('');
  };

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true); setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/api/quiz/extract-from-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setQuestions(res.data.questions);
      setQuizTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      setStep('edit'); setExpandedIndex(0);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse file.');
    } finally {
      setExtracting(false);
    }
  };

  const updateQuestion = (index, field, value) =>
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));

  const updateOption = (qIndex, optIndex, value) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      return { ...q, options: q.options.map((o, oi) => oi === optIndex ? { ...o, text: value } : o) };
    }));

  const toggleCorrect = (qIndex, optId) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      if (q.question_type === 'mcq' || q.question_type === 'true_false') return { ...q, correct_answers: [optId] };
      const already = q.correct_answers.includes(optId);
      return { ...q, correct_answers: already ? q.correct_answers.filter(id => id !== optId) : [...q.correct_answers, optId] };
    }));

  const addOption = (qIndex) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const newId = String.fromCharCode(97 + q.options.length);
      return { ...q, options: [...q.options, { id: newId, text: '' }] };
    }));

  const removeOption = (qIndex, optId) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      return { ...q, options: q.options.filter(o => o.id !== optId), correct_answers: q.correct_answers.filter(id => id !== optId) };
    }));

  const removeQuestion = (index) => { setQuestions(prev => prev.filter((_, i) => i !== index)); setExpandedIndex(null); };

  const addQuestion = () => {
    setQuestions(prev => [...prev, { question_text: '', question_type: 'mcq', options: [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }], correct_answers: ['a'], points: 100 }]);
    setExpandedIndex(questions.length);
  };

  const handleSave = async (status) => {
    if (!quizTitle.trim()) { setError('Please enter a quiz title'); return; }
    if (questions.length === 0) { setError('Add at least one question'); return; }
    for (const [i, q] of questions.entries()) {
      if (!q.question_text.trim()) { setError(`Question ${i + 1} is empty`); return; }
      if (q.correct_answers.length === 0) { setError(`Question ${i + 1} has no correct answer`); return; }
    }
    setStep('saving'); setError('');
    try {
      const res = await axios.post('/api/quiz/save-from-file', { title: quizTitle, description: quizSubtitle, time_per_question: timePerQuestion, questions });
      if (status === 'published') await axios.patch(`/api/quiz/${res.data.quiz.id}/publish`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save quiz');
      setStep('edit');
    }
  };

  // ─── Upload ─────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
              style={{ background: 'var(--accent-bg)', border: '1.5px solid var(--accent-border)' }}>✨</div>
            <h1 className="text-3xl font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>AI Quiz from File</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Upload any document — Gemini AI generates questions automatically</p>
          </div>

          <div className="card p-6">
            {error && (
              <div className="px-4 py-3 rounded-xl mb-4 text-sm"
                style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>{error}</div>
            )}

            <div className="px-4 py-3 rounded-xl mb-4 flex gap-3"
              style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
              <span className="text-lg">🤖</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--accent)', fontFamily: 'Sora, sans-serif' }}>Powered by Gemini AI</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                  Upload your notes or any document — AI will read it and generate MCQs automatically.
                </p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              {['📄 PDF', '📝 TXT', '📊 CSV'].map(f => (
                <span key={f} className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>{f}</span>
              ))}
            </div>

            <div onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all"
              style={{
                borderColor: file ? 'var(--accent)' : 'var(--border-2)',
                background: file ? 'var(--accent-bg)' : 'var(--bg-2)'
              }}>
              <input ref={fileInputRef} type="file" accept=".pdf,.txt,.csv" onChange={handleFileChange} className="hidden" />
              {file ? (
                <>
                  <div className="text-4xl mb-3">✅</div>
                  <p className="font-bold" style={{ color: 'var(--text)', fontFamily: 'Sora, sans-serif' }}>{file.name}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-3">📂</div>
                  <p className="font-semibold" style={{ color: 'var(--text-2)', fontFamily: 'Sora, sans-serif' }}>Click to upload or drag & drop</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>PDF · TXT · CSV</p>
                </>
              )}
            </div>

            <button onClick={handleExtract} disabled={!file || extracting} className="btn-primary w-full mt-4 py-4">
              {extracting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  AI is generating questions...
                </span>
              ) : '✨ Generate Questions with AI'}
            </button>

            <button onClick={() => navigate('/dashboard')}
              className="w-full mt-3 py-3 text-sm transition-colors" style={{ color: 'var(--text-3)' }}>
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Saving ──────────────────────────────────────────────
  if (step === 'saving') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'var(--accent-border)', borderTopColor: 'var(--accent)' }} />
          <p style={{ color: 'var(--text-2)' }}>Saving your quiz...</p>
        </div>
      </div>
    );
  }

  // ─── Edit ────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-10 max-w-3xl mx-auto" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => setStep('upload')} className="text-2xl" style={{ color: 'var(--text-3)' }}>←</button>
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Review AI-Generated Questions
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{questions.length} questions · review before saving</p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl mb-6 text-sm"
          style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>{error}</div>
      )}

      {/* Settings */}
      <div className="card p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-3)', fontFamily: 'Sora, sans-serif' }}>
          Quiz Settings
        </h2>
        <div className="space-y-3">
          <input type="text" value={quizTitle} onChange={e => setQuizTitle(e.target.value)}
            placeholder="Quiz title *" className="input-field font-semibold" />
          <input type="text" value={quizSubtitle} onChange={e => setQuizSubtitle(e.target.value)}
            placeholder="Subtitle (optional)" className="input-field" />
          <div className="flex items-center gap-3">
            <label className="text-sm whitespace-nowrap" style={{ color: 'var(--text-3)' }}>⏱ Seconds per question:</label>
            <input type="number" value={timePerQuestion} onChange={e => setTimePerQuestion(Number(e.target.value))}
              min={5} max={120} className="input-field w-24 text-center" />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3 mb-6">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="card overflow-hidden">
            <div className="flex items-center gap-3 p-4 cursor-pointer transition-colors"
              style={{ background: expandedIndex === qIndex ? 'var(--bg-2)' : 'var(--surface)' }}
              onClick={() => setExpandedIndex(expandedIndex === qIndex ? null : qIndex)}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0"
                style={{ background: 'var(--accent-bg)', color: 'var(--accent)', fontFamily: 'Sora, sans-serif' }}>
                {qIndex + 1}
              </span>
              <p className="flex-1 text-sm font-medium truncate" style={{ color: q.question_text ? 'var(--text)' : 'var(--text-3)' }}>
                {q.question_text || 'Empty question'}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-lg"
                  style={{
                    background: q.correct_answers.length > 0 ? 'var(--green-bg)' : 'var(--yellow-bg)',
                    color: q.correct_answers.length > 0 ? 'var(--green)' : 'var(--yellow)',
                    border: `1px solid ${q.correct_answers.length > 0 ? 'var(--green-border)' : 'var(--yellow-border)'}`
                  }}>
                  {q.correct_answers.length > 0 ? '✓ ok' : '⚠ missing'}
                </span>
                <span style={{ color: 'var(--text-3)' }}>{expandedIndex === qIndex ? '▲' : '▼'}</span>
              </div>
            </div>

            {expandedIndex === qIndex && (
              <div className="p-4 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
                <textarea value={q.question_text} onChange={e => updateQuestion(qIndex, 'question_text', e.target.value)}
                  placeholder="Question text..." rows={2} className="input-field resize-none" />

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-3)' }}>Type</label>
                    <select value={q.question_type} onChange={e => updateQuestion(qIndex, 'question_type', e.target.value)}
                      className="input-field">
                      {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-3)' }}>Points</label>
                    <input type="number" value={q.points} onChange={e => updateQuestion(qIndex, 'points', Number(e.target.value))}
                      min={10} max={1000} step={10} className="input-field text-center" />
                  </div>
                </div>

                <div>
                  <label className="text-xs mb-2 block" style={{ color: 'var(--text-3)' }}>
                    Options — click to mark correct
                    {q.question_type === 'multi_select' && (
                      <span className="ml-1 font-medium" style={{ color: 'var(--accent)' }}>(multiple allowed)</span>
                    )}
                  </label>
                  <div className="space-y-2">
                    {q.options.map((opt, optIndex) => {
                      const isCorrect = q.correct_answers.includes(opt.id);
                      return (
                        <div key={opt.id} className="flex items-center gap-2">
                          <button onClick={() => toggleCorrect(qIndex, opt.id)}
                            className="w-8 h-8 rounded-lg border-2 flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all"
                            style={{
                              background: isCorrect ? 'var(--green)' : 'var(--surface)',
                              borderColor: isCorrect ? 'var(--green)' : 'var(--border-2)',
                              color: isCorrect ? 'white' : 'var(--text-3)'
                            }}>
                            {isCorrect ? '✓' : opt.id.toUpperCase()}
                          </button>
                          <input type="text" value={opt.text} onChange={e => updateOption(qIndex, optIndex, e.target.value)}
                            placeholder={`Option ${opt.id.toUpperCase()}`} className="input-field flex-1 py-2" />
                          {q.options.length > 2 && (
                            <button onClick={() => removeOption(qIndex, opt.id)}
                              className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-sm"
                              style={{ color: 'var(--red)' }}>✕</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {q.options.length < 6 && (
                    <button onClick={() => addOption(qIndex)} className="mt-2 text-sm font-medium"
                      style={{ color: 'var(--accent)' }}>+ Add option</button>
                  )}
                </div>

                <div className="flex justify-end pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <button onClick={() => removeQuestion(qIndex)} className="text-sm font-medium" style={{ color: 'var(--red)' }}>
                    🗑 Remove question
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={addQuestion}
        className="w-full border-2 border-dashed rounded-2xl py-4 text-sm font-medium transition-all mb-8"
        style={{ borderColor: 'var(--border-2)', color: 'var(--text-3)' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-3)'; }}>
        + Add Question
      </button>

      <div className="flex gap-3 sticky bottom-4">
        <button onClick={() => handleSave('draft')} className="btn-secondary flex-1 py-4">Save as Draft</button>
        <button onClick={() => handleSave('published')} className="btn-primary flex-1 py-4">Publish Quiz 🚀</button>
      </div>
    </div>
  );
}