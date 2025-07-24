require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// データベースファイルのパス
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/opt/render/project/src/database.sqlite'
  : path.join(__dirname, 'database.sqlite');

// SQLiteデータベース接続
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('SQLite connection error:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// プロミス化されたクエリ関数
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve({ rows });
      }
    });
  });
}

// INSERT文用のプロミス化関数
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ 
          lastID: this.lastID,
          changes: this.changes,
          rows: [{ id: this.lastID }]
        });
      }
    });
  });
}

// データベース初期化関数
async function initializeDatabase() {
  try {
    // ユーザーテーブル作成
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ゲーム統計テーブル作成
    await run(`
      CREATE TABLE IF NOT EXISTS user_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        games_played INTEGER DEFAULT 0,
        player_wins INTEGER DEFAULT 0,
        opponent_wins INTEGER DEFAULT 0,
        total_profit REAL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 既存のテーブルにopponent_winsカラムが存在しない場合は追加
    try {
      await run(`ALTER TABLE user_stats ADD COLUMN opponent_wins INTEGER DEFAULT 0`);
      console.log('Added opponent_wins column to user_stats table');
    } catch (error) {
      // カラムが既に存在する場合はエラーを無視
      if (!error.message.includes('duplicate column name')) {
        throw error;
      }
    }

    // ゲーム履歴テーブル作成
    await run(`
      CREATE TABLE IF NOT EXISTS game_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        player_card TEXT NOT NULL,
        opponent_card TEXT NOT NULL,
        history TEXT NOT NULL,
        is_player_first INTEGER NOT NULL,
        winner TEXT NOT NULL,
        profit REAL NOT NULL,
        player_ai TEXT NOT NULL,
        opponent_ai TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI設定テーブル作成
    await run(`
      CREATE TABLE IF NOT EXISTS user_ai_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ai_type TEXT NOT NULL,
        role TEXT NOT NULL,
        settings TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, role)
      )
    `);

    console.log('SQLite database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

module.exports = { 
  query, 
  run,
  initializeDatabase,
  db 
};
