const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');
const { buildReadableExcel } = require('./excelExport');

// GET /api/users - Admin: danh sach tat ca users
router.get('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Không có quyền.' });
  const users = db.prepare('SELECT id, full_name, cccd, phone, role, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ success: true, total: users.length, users });
});

// GET /api/users/export - Admin: xuat danh sach user ra Excel
router.get('/export', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Không có quyền.' });

  const users = db.prepare('SELECT id, full_name, cccd, phone, role, created_at FROM users ORDER BY created_at DESC').all();

  const buf = buildReadableExcel({
    sheetName: 'Nguoi dung',
    title: 'DANH SÁCH NGƯỜI DÙNG',
    rows: users,
    columns: [
      { header: 'STT', width: 10, value: u => u.id },
      { header: 'Họ và tên', width: 28, value: u => u.full_name },
      { header: 'Số CCCD/CMND', width: 18, value: u => u.cccd },
      { header: 'Số điện thoại', width: 18, value: u => u.phone || '' },
      { header: 'Vai trò', width: 18, value: u => u.role === 'admin' ? 'Quản trị viên' : 'Người dùng' },
      { header: 'Ngày đăng ký', width: 24, value: u => u.created_at }
    ]
  });
  const filename = `NguoiDung_${new Date().toISOString().slice(0, 10)}.xlsx`;

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
