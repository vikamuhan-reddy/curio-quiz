import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4  // 👈 force IPv4
});

pool.on('connect', () => console.log('✅ Connected to Supabase'));
pool.on('error', (err) => console.error('❌ DB Error:', err));

export const query = (text, params) => pool.query(text, params);
export default pool;