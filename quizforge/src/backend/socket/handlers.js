import { query } from '../db/index.js';

const activeSessions = new Map();

function getParticipant(session, socketId) {
  const participantId = session.socketToParticipant.get(socketId);
  return participantId ? session.participants.get(participantId) : null;
}

export const initSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Connected: ${socket.id}`);

    socket.on('host:create-lobby', async ({ sessionId, quizId }) => {
      try {
        const questionsResult = await query('SELECT * FROM questions WHERE quiz_id = $1 ORDER BY order_index', [quizId]);
        const quizResult = await query('SELECT * FROM quizzes WHERE id = $1', [quizId]);

        if (!activeSessions.has(sessionId)) {
          activeSessions.set(sessionId, {
            quiz: quizResult.rows[0],
            questions: questionsResult.rows,
            participants: new Map(),
            socketToParticipant: new Map(),
            answeredThisRound: new Set(),
            currentQuestionIndex: -1,
            questionTimer: null,
            countdownTimer: null,
            questionStartedAt: null,
            hostSocketId: socket.id,
            isPaused: false,
            activeParticipantCount: 0
          });
        } else {
          // Update host socket on rejoin
          activeSessions.get(sessionId).hostSocketId = socket.id;
        }

        socket.join(sessionId);
        socket.emit('host:lobby-ready', { sessionId });

        const existing = await query(
          `SELECT * FROM participants WHERE session_id = $1 ORDER BY joined_at ASC`, [sessionId]
        );
        if (existing.rows.length > 0) {
          const session = activeSessions.get(sessionId);
          existing.rows.forEach(p => {
            if (!session.participants.has(p.id))
              session.participants.set(p.id, { ...p, socketId: null });
          });
          socket.emit('lobby:update', { participants: existing.rows });
          socket.emit('host:participant-count', {
            count: session.activeParticipantCount,
            total: session.participants.size
          });
        }
      } catch (err) {
        console.error('host:create-lobby error:', err.message);
        socket.emit('error', { message: 'Failed to create lobby' });
      }
    });

    // ─── PLAYER: Rejoin after reload ──────────────────────
    socket.on('player:rejoin', ({ sessionId, participantId }) => {
      socket.join(sessionId);

      const session = activeSessions.get(sessionId);

      if (!session) {
        socket.emit('quiz:ended', { leaderboard: [] });
        return;
      }

      if (participantId && session.participants.has(participantId)) {
        const p = session.participants.get(participantId);
        const wasDisconnected = !p.socketId || !p.isActive;

        if (p.socketId) session.socketToParticipant.delete(p.socketId);
        p.socketId = socket.id;
        p.isActive = true;
        session.socketToParticipant.set(socket.id, participantId);

        // Update active count if they were previously disconnected
        if (wasDisconnected) {
          session.activeParticipantCount = Math.min(
            session.participants.size,
            session.activeParticipantCount + 1
          );
          broadcastParticipantCount(io, sessionId, session);

          // If quiz was paused due to zero participants, notify host
          if (session.isPaused && session.activeParticipantCount > 0) {
            const hostSocket = io.sockets.sockets.get(session.hostSocketId);
            if (hostSocket) {
              hostSocket.emit('host:quiz-can-resume', {
                count: session.activeParticipantCount
              });
            }
          }
        }

        console.log(`✅ Remapped ${p.nickname} → socket ${socket.id}`);
      }

      if (session.currentQuestionIndex < 0) return;

      const q = session.questions[session.currentQuestionIndex];
      if (!q) return;

      const timeLimit = session.quiz.time_per_question;
      const alreadyAnswered = session.answeredThisRound.has(participantId);

      socket.emit('quiz:question', {
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        points: q.points,
        time_limit: timeLimit,
        question_started_at: session.questionStartedAt,
        index: session.currentQuestionIndex,
        total: session.questions.length,
        alreadyAnswered
      });
    });

    socket.on('player:join', async ({ sessionId, nickname, avatarColor, avatarEmoji }) => {
      try {
        let session = activeSessions.get(sessionId);
        if (!session) {
          const sessionRes = await query(
            'SELECT * FROM quiz_sessions WHERE id = $1 AND status != $2', [sessionId, 'ended']
          );
          if (sessionRes.rows.length === 0) {
            socket.emit('error', { message: 'Session not found or already ended' });
            return;
          }
          const dbSession = sessionRes.rows[0];
          const questionsResult = await query('SELECT * FROM questions WHERE quiz_id = $1 ORDER BY order_index', [dbSession.quiz_id]);
          const quizResult = await query('SELECT * FROM quizzes WHERE id = $1', [dbSession.quiz_id]);
          session = {
            quiz: quizResult.rows[0],
            questions: questionsResult.rows,
            participants: new Map(),
            socketToParticipant: new Map(),
            answeredThisRound: new Set(),
            currentQuestionIndex: -1,
            questionTimer: null,
            countdownTimer: null,
            questionStartedAt: null,
            hostSocketId: null,
            isPaused: false,
            activeParticipantCount: 0
          };
          activeSessions.set(sessionId, session);
        }

        const result = await query(
          `INSERT INTO participants (session_id, nickname, avatar_color, avatar_emoji) VALUES ($1, $2, $3, $4) RETURNING *`,
          [sessionId, nickname, avatarColor || '#6366f1', avatarEmoji || '😀']
        );
        const participant = result.rows[0];
        session.participants.set(participant.id, { ...participant, socketId: socket.id, isActive: true });
        session.socketToParticipant.set(socket.id, participant.id);
        session.activeParticipantCount++;

        socket.join(sessionId);
        socket.emit('player:joined', { participant });

        const allParticipants = await query(
          'SELECT * FROM participants WHERE session_id = $1 ORDER BY joined_at ASC', [sessionId]
        );
        io.to(sessionId).emit('lobby:update', { participants: allParticipants.rows });
        broadcastParticipantCount(io, sessionId, session);
      } catch (err) {
        console.error('player:join error:', err.message);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    socket.on('host:start-quiz', async ({ sessionId }) => {
      try {
        const session = activeSessions.get(sessionId);
        if (!session) { socket.emit('error', { message: 'Session not found' }); return; }
        await query('UPDATE quiz_sessions SET status = $1, started_at = NOW() WHERE id = $2', ['active', sessionId]);
        session.currentQuestionIndex = 0;
        session.isPaused = false;
        sendQuestion(io, sessionId, session);
      } catch (err) {
        console.error('host:start-quiz error:', err.message);
      }
    });

    // ─── HOST: Manual resume after auto-pause ──────────────
    socket.on('host:resume-quiz', ({ sessionId }) => {
      const session = activeSessions.get(sessionId);
      if (!session || !session.isPaused) return;
      if (session.activeParticipantCount === 0) {
        socket.emit('error', { message: 'Cannot resume: no active participants' });
        return;
      }
      session.isPaused = false;
      io.to(sessionId).emit('quiz:resumed', { by: 'host' });
      sendQuestion(io, sessionId, session);
    });

    socket.on('player:submit-answer', async ({ sessionId, selectedAnswers, responseTimeMs }) => {
      try {
        const session = activeSessions.get(sessionId);
        if (!session) return;

        const participant = getParticipant(session, socket.id);
        if (!participant) return;
        if (session.answeredThisRound.has(participant.id)) return;

        const currentQ = session.questions[session.currentQuestionIndex];
        if (!currentQ) return;

        const correctAnswers = typeof currentQ.correct_answers === 'string'
          ? JSON.parse(currentQ.correct_answers) : currentQ.correct_answers;

        const isCorrect = JSON.stringify([...selectedAnswers].sort()) === JSON.stringify([...correctAnswers].sort());
        const maxTime = session.quiz.time_per_question * 1000;
        const timeBonus = isCorrect ? Math.round((1 - responseTimeMs / maxTime) * currentQ.points * 0.5) : 0;
        const pointsEarned = isCorrect ? currentQ.points + timeBonus : 0;

        await query(
          `INSERT INTO attempts (session_id, participant_id, question_id, selected_answers, is_correct, points_earned, response_time_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [sessionId, participant.id, currentQ.id, JSON.stringify(selectedAnswers), isCorrect, pointsEarned, responseTimeMs]
        );
        await query('UPDATE participants SET total_score = total_score + $1 WHERE id = $2', [pointsEarned, participant.id]);
        participant.total_score = (participant.total_score || 0) + pointsEarned;

        session.answeredThisRound.add(participant.id);
        socket.emit('player:answer-result', { isCorrect, pointsEarned, correctAnswers });

        const answeredCount = session.answeredThisRound.size;
        const totalPlayers = session.participants.size;
        io.to(sessionId).emit('host:answer-progress', { answered: answeredCount, total: totalPlayers });

        if (answeredCount >= totalPlayers) {
          clearTimeout(session.questionTimer);
          clearInterval(session.countdownTimer);
          setTimeout(() => advanceQuestion(io, sessionId, session), 2000);
        }
      } catch (err) {
        console.error('player:submit-answer error:', err.message);
      }
    });

    socket.on('host:end-quiz', ({ sessionId }) => {
      const session = activeSessions.get(sessionId);
      if (session) {
        endQuiz(io, sessionId, session);
      } else {
        io.to(sessionId).emit('quiz:ended', { leaderboard: [] });
      }
    });

    // ─── DISCONNECT: Track active participants ─────────────
    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected: ${socket.id}`);

      // Check all sessions for this socket
      for (const [sessionId, session] of activeSessions.entries()) {
        const participantId = session.socketToParticipant.get(socket.id);
        if (participantId) {
          const participant = session.participants.get(participantId);
          if (participant) {
            participant.isActive = false;
            participant.socketId = null;
            session.activeParticipantCount = Math.max(0, session.activeParticipantCount - 1);
            console.log(`👤 ${participant.nickname} disconnected from ${sessionId}. Active: ${session.activeParticipantCount}`);

            broadcastParticipantCount(io, sessionId, session);

            // Auto-pause if no active participants and quiz is running
            if (session.activeParticipantCount === 0 && session.currentQuestionIndex >= 0 && !session.isPaused) {
              session.isPaused = true;
              clearTimeout(session.questionTimer);
              clearInterval(session.countdownTimer);
              io.to(sessionId).emit('quiz:auto-paused', {
                reason: 'All participants disconnected'
              });
              console.log(`⏸ Quiz ${sessionId} auto-paused — no active participants`);
            }
          }
          session.socketToParticipant.delete(socket.id);
          break;
        }
      }
    });
  });
};

function broadcastParticipantCount(io, sessionId, session) {
  io.to(sessionId).emit('host:participant-count', {
    count: session.activeParticipantCount,
    total: session.participants.size
  });
}

function sendQuestion(io, sessionId, session) {
  const q = session.questions[session.currentQuestionIndex];
  const timeLimit = session.quiz.time_per_question;

  session.answeredThisRound = new Set();
  session.questionStartedAt = Date.now();

  io.to(sessionId).emit('quiz:question', {
    id: q.id,
    question_text: q.question_text,
    question_type: q.question_type,
    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    points: q.points,
    time_limit: timeLimit,
    question_started_at: session.questionStartedAt,
    index: session.currentQuestionIndex,
    total: session.questions.length,
    alreadyAnswered: false
  });

  let secondsLeft = timeLimit;
  session.countdownTimer = setInterval(() => {
    secondsLeft--;
    io.to(sessionId).emit('host:timer-tick', { secondsLeft, total: timeLimit });
    if (secondsLeft <= 0) clearInterval(session.countdownTimer);
  }, 1000);

  session.questionTimer = setTimeout(() => {
    clearInterval(session.countdownTimer);
    io.to(sessionId).emit('quiz:time-up', {
      correctAnswers: typeof q.correct_answers === 'string' ? JSON.parse(q.correct_answers) : q.correct_answers,
      questionIndex: session.currentQuestionIndex
    });
    setTimeout(() => advanceQuestion(io, sessionId, session), 2000);
  }, timeLimit * 1000);
}

function advanceQuestion(io, sessionId, session) {
  if (session.isPaused) return; // Don't advance if paused

  session.currentQuestionIndex++;
  session.questionStartedAt = null;

  if (session.currentQuestionIndex >= session.questions.length) {
    endQuiz(io, sessionId, session);
  } else {
    const leaderboard = Array.from(session.participants.values())
      .sort((a, b) => b.total_score - a.total_score).slice(0, 5)
      .map(p => ({
        nickname: p.nickname,
        avatar_color: p.avatar_color,
        avatar_emoji: p.avatar_emoji,
        total_score: p.total_score || 0
      }));

    io.to(sessionId).emit('quiz:between-questions', {
      leaderboard,
      nextIn: 3,
      questionIndex: session.currentQuestionIndex,
      total: session.questions.length
    });
    setTimeout(() => {
      if (!session.isPaused) sendQuestion(io, sessionId, session);
    }, 3000);
  }
}

async function endQuiz(io, sessionId, session) {
  if (session.questionTimer) clearTimeout(session.questionTimer);
  if (session.countdownTimer) clearInterval(session.countdownTimer);

  await query('UPDATE quiz_sessions SET status = $1, ended_at = NOW() WHERE id = $2', ['ended', sessionId]);

  const result = await query(
    `SELECT p.nickname, p.avatar_color, p.avatar_emoji, p.total_score,
     COUNT(a.id) as total_answers,
     SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_answers
     FROM participants p
     LEFT JOIN attempts a ON a.participant_id = p.id
     WHERE p.session_id = $1
     GROUP BY p.id, p.nickname, p.avatar_color, p.avatar_emoji, p.total_score
     ORDER BY p.total_score DESC`, [sessionId]
  );

  io.to(sessionId).emit('quiz:ended', { leaderboard: result.rows });
  activeSessions.delete(sessionId);
}