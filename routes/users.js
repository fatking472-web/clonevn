const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');
const XLSX = require('xlsx');

// GET /api/users — Admin: danh sách tất cả users
router.get('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Không có quyền.' });
  const users = db.prepare('SELECT id, full_name, cccd, phone, role, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ success: true, total: users.length, users });
});

// GET /api/users/export — Admin: xuất danh sách user ra Excel
router.get('/export', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Không có quyền.' });

  const users = db.prepare('SELECT id, full_name, cccd, phone, role, created_at FROM users ORDER BY created_at DESC').all();

  const data = users.map(u => ({
    'STT': u.id,
    'Họ và tên': u.full_name,
    'Số CCCD/CMND': u.cccd,
    'Số điện thoại': u.phone || '',
    'Vai trò': u.role === 'admin' ? 'Quản trị viên' : 'Người dùng',
    'Ngày đăng ký': u.created_at
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh sách người dùng');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `NguoiDung_${new Date().toISOString().slice(0,10)}.xlsx`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// GET /api/users/stats
router.get('/stats', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Không có quyền.' });
  const total_users = db.prepare("SELECT COUNT(*) as c FROM users WHERE role != 'admin'").get().c;
  const total_submissions = db.prepare('SELECT COUNT(*) as c FROM submissions').get().c;
  const today_users = db.prepare("SELECT COUNT(*) as c FROM users WHERE DATE(created_at) = DATE('now') AND role != 'admin'").get().c;
  const today_submissions = db.prepare("SELECT COUNT(*) as c FROM submissions WHERE DATE(created_at) = DATE('now')").get().c;
  res.json({ success: true, stats: { total_users, total_submissions, today_users, today_submissions } });
});

module.exports = router;
