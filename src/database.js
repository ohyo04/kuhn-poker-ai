require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// データベース初期化関数
async function initializeDatabase() {
  try {
    // ユーザーテーブル作成
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ゲーム統計テーブル作成
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        games_played INTEGER DEFAULT 0,
        player_wins INTEGER DEFAULT 0,
        total_profit DECIMAL(10,2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ゲーム履歴テーブル作成
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        player_card VARCHAR(1) NOT NULL,
        opponent_card VARCHAR(1) NOT NULL,
        history VARCHAR(10) NOT NULL,
        is_player_first BOOLEAN NOT NULL,
        winner VARCHAR(10) NOT NULL,
        profit DECIMAL(10,2) NOT NULL,
        player_ai VARCHAR(50) NOT NULL,
        opponent_ai VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI設定テーブル作成
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_ai_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ai_type VARCHAR(50) NOT NULL,
        role VARCHAR(20) NOT NULL, -- 'player' or 'opponent'
        settings JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, role)
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

module.exports = { pool, initializeDatabase };
