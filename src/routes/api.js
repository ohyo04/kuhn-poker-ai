const express = require('express');
const bcrypt = require('bcrypt');
const { query, run } = require('../database');
const { generateToken, authenticateToken } = require('../auth');

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
    const existingUser = await query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // パスワードハッシュ化
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // ユーザー作成
    const result = await run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    );

    const userId = result.lastID;

    // 初期統計データ作成
    await run('INSERT INTO user_stats (user_id) VALUES (?)', [userId]);

    // JWTトークン生成
    const token = generateToken(userId, username);

    res.status(201).json({
      success: true,
      user: { id: userId, username: username },
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
    const result = await query('SELECT id, username, password_hash FROM users WHERE username = ?', [username]);
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
    const result = await query(
      'SELECT games_played, player_wins, total_profit FROM user_stats WHERE user_id = ?',
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
    const result = await query(
      'SELECT * FROM game_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );

    const history = result.rows.map(row => ({
      id: row.id,
      playerCard: row.player_card,
      opponentCard: row.opponent_card,
      history: row.history,
      isPlayerFirst: Boolean(row.is_player_first),
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
    await run(
      `INSERT INTO game_history 
       (user_id, player_card, opponent_card, history, is_player_first, winner, profit, player_ai, opponent_ai) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, playerCard, opponentCard, history, isPlayerFirst ? 1 : 0, winner, profit, playerAi, opponentAi]
    );

    // 統計更新
    const winIncrement = winner === 'player' ? 1 : 0;
    await run(
      `UPDATE user_stats 
       SET games_played = games_played + 1, 
           player_wins = player_wins + ?, 
           total_profit = total_profit + ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
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

    // SQLiteではUPSERTを使用
    await run(
      `INSERT OR REPLACE INTO user_ai_settings (user_id, ai_type, role, settings, updated_at) 
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
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
    const result = await query(
      'SELECT role, ai_type, settings FROM user_ai_settings WHERE user_id = ?',
      [req.user.id]
    );

    const aiSettings = {};
    result.rows.forEach(row => {
      aiSettings[row.role] = {
        aiType: row.ai_type,
        settings: JSON.parse(row.settings)
      };
    });

    res.json(aiSettings);

  } catch (error) {
    console.error('Get AI settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
