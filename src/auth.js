const jwt = require('jsonwebtoken');
const { query } = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// JWTトークンを生成
function generateToken(userId, username) {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });
}

// JWTトークンを検証
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// 認証ミドルウェア
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  // ユーザー情報をデータベースから取得
  try {
    const result = await query('SELECT id, username FROM users WHERE id = ?', [decoded.userId]);
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { generateToken, verifyToken, authenticateToken };
