import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first');

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import quizRoutes from './routes/quiz.js';
import sessionRoutes from './routes/session.js';

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/session', sessionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;