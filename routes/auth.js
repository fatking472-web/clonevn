const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { full_name, cccd, phone, password, confirm_password } = req.body;

    if (!full_name || !cccd || !password)
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ họ tên, số CCCD và mật khẩu.' });

    if (password !== confirm_password)
      return res.status(400).json({ success: false, message: 'Mật khẩu xác nhận không khớp.' });

    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' });

    const cccdClean = cccd.replace(/\s/g, '');
    if (!/^\d{9}$|^\d{12}$/.test(cccdClean))
      return res.status(400).json({ success: false, message: 'Số CCCD/CMND phải có 9 hoặc 12 chữ số.' });

    const existing = db.prepare('SELECT id FROM users WHERE cccd = ?').get(cccdClean);
    if (existing)
      return res.status(409).json({ success: false, message: 'Số CCCD/CMND này đã được đăng ký.' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = db.prepare(
      'INSERT INTO users (full_name, cccd, phone, password) VALUES (?, ?, ?, ?)'
    ).run(full_name.trim(), cccdClean, phone || null, hashedPassword);

    const token = jwt.sign(
      { id: result.lastInsertRowid, cccd: cccdClean, role: 'user' },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công!',
      token,
      user: { id: result.lastInsertRowid, full_name: full_name.trim(), cccd: cccdClean, phone: phone || null, role: 'user' }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ. Vui lòng thử lại sau.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { cccd, password } = req.body;

    if (!cccd || !password)
      return res.status(400).json({ success: false, message: 'Vui lòng nhập số CCCD/CMND và mật khẩu.' });

    const cccdClean = cccd.replace(/\s/g, '');
    const user = db.prepare('SELECT * FROM users WHERE cccd = ?').get(cccdClean);

    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ success: false, message: 'Số CCCD/CMND hoặc mật khẩu không đúng.' });

    const token = jwt.sign(
      { id: user.id, cccd: user.cccd, role: user.role },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true, message: 'Đăng nhập thành công!', token,
      user: { id: user.id, full_name: user.full_name, cccd: user.cccd, phone: user.phone, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, full_name, cccd, phone, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
  res.json({ success: true, user });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Đăng xuất thành công.' });
});

module.exports = router;
