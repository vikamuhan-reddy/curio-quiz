import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth.js";
import quizRoutes from "./routes/quiz.js";
import sessionRoutes from "./routes/session.js";
import aiRoutes from "./routes/ai.js";
import { initSocketHandlers } from "./socket/handlers.js";


// --------------------
// Validate environment
// --------------------

const requiredEnv = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "JWT_SECRET"];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required env variable: ${key}`);
    process.exit(1);
  }
});


// --------------------
// App Setup
// --------------------

const app = express();
const httpServer = createServer(app);


// --------------------
// Allowed Origins
// --------------------

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_WWW,
  "https://13.232.44.169.nip.io",
  "http://localhost:5173",
  "http://localhost:4173",
].filter(Boolean);


// --------------------
// CORS Configuration
// --------------------

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked: ${origin}`);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};


// --------------------
// Socket.IO Setup
// --------------------

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // AWS safe fallback
});


// --------------------
// Middleware
// --------------------

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "10mb" }));


// --------------------
// Routes
// --------------------

app.use("/api/auth", authRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/ai", aiRoutes);


// --------------------
// Health Check
// --------------------

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});


// --------------------
// Error Handler
// --------------------

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});


// --------------------
// Socket Handlers
// --------------------

initSocketHandlers(io);


// --------------------
// Start Server
// --------------------

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Allowed origins: ${allowedOrigins.join(", ")}`);
});


export default app;