const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('./database');
const { generateToken, authenticateToken } = require('./auth');

const router = express.Router();

// ユーザー登録
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3 || password.length < 6) {
      return res.status(400).json({ error: 'Username must be at least 3 characters and password at least 6 characters' });
    }

    // ユーザー名の重複チェック
    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // パスワードハッシュ化
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // ユーザー作成
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, passwordHash]
    );

    const user = result.rows[0];

    // 初期統計データ作成
    await pool.query(
      'INSERT INTO user_stats (user_id) VALUES ($1)',
      [user.id]
    );

    // JWTトークン生成
    const token = generateToken(user.id, user.username);

    res.status(201).json({
      success: true,
      user: { id: user.id, username: user.username },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ユーザーログイン
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // ユーザー検索
    const result = await pool.query('SELECT id, username, password_hash FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];

    // パスワード検証
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // JWTトークン生成
    const token = generateToken(user.id, user.username);

    res.json({
      success: true,
      user: { id: user.id, username: user.username },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ユーザー統計取得
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT games_played, player_wins, total_profit FROM user_stats WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({ gamesPlayed: 0, playerWins: 0, totalProfit: 0 });
    }

    const stats = result.rows[0];
    res.json({
      gamesPlayed: stats.games_played,
      playerWins: stats.player_wins,
      totalProfit: parseFloat(stats.total_profit)
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ゲーム履歴取得
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM game_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );

    const history = result.rows.map(row => ({
      id: row.id,
      playerCard: row.player_card,
      opponentCard: row.opponent_card,
      history: row.history,
      isPlayerFirst: row.is_player_first,
      winner: row.winner,
      profit: parseFloat(row.profit),
      playerAi: row.player_ai,
      opponentAi: row.opponent_ai,
      createdAt: row.created_at
    }));

    res.json(history);

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ゲーム結果保存
router.post('/game-result', authenticateToken, async (req, res) => {
  try {
    const {
      playerCard,
      opponentCard,
      history,
      isPlayerFirst,
      winner,
      profit,
      playerAi,
      opponentAi
    } = req.body;

    // ゲーム履歴保存
    await pool.query(
      `INSERT INTO game_history 
       (user_id, player_card, opponent_card, history, is_player_first, winner, profit, player_ai, opponent_ai) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [req.user.id, playerCard, opponentCard, history, isPlayerFirst, winner, profit, playerAi, opponentAi]
    );

    // 統計更新
    const winIncrement = winner === 'player' ? 1 : 0;
    await pool.query(
      `UPDATE user_stats 
       SET games_played = games_played + 1, 
           player_wins = player_wins + $1, 
           total_profit = total_profit + $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3`,
      [winIncrement, profit, req.user.id]
    );

    res.json({ success: true });

  } catch (error) {
    console.error('Save game result error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI設定保存
router.post('/ai-settings', authenticateToken, async (req, res) => {
  try {
    const { role, aiType, settings } = req.body;

    await pool.query(
      `INSERT INTO user_ai_settings (user_id, ai_type, role, settings) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, role) 
       DO UPDATE SET ai_type = $2, settings = $4, updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, aiType, role, JSON.stringify(settings)]
    );

    res.json({ success: true });

  } catch (error) {
    console.error('Save AI settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI設定取得
router.get('/ai-settings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT role, ai_type, settings FROM user_ai_settings WHERE user_id = $1',
      [req.user.id]
    );

    const aiSettings = {};
    result.rows.forEach(row => {
      aiSettings[row.role] = {
        aiType: row.ai_type,
        settings: row.settings
      };
    });

    res.json(aiSettings);

  } catch (error) {
    console.error('Get AI settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
