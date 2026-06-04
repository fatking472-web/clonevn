const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/vietqr/config — Public: Lấy cấu hình VietQR hiển thị trên trang chủ
router.get('/config', (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM vietqr_config WHERE id = 1').get();
    if (!config) {
      return res.status(404).json({ success: false, message: 'Chưa có cấu hình VietQR.' });
    }
    // Không trả về api_key ra ngoài public
    const { api_key, ...safeConfig } = config;
    res.json({ success: true, config: safeConfig });
  } catch (err) {
    console.error('VietQR config GET error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// PUT /api/vietqr/config — Admin-only: Cập nhật cấu hình VietQR
router.put('/config', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Không có quyền chỉnh sửa cấu hình.' });
  }
  try {
    const {
      bank_id, bank_name, account_no, account_name,
      amount, description, title, subtitle, instruction, button_text, api_key
    } = req.body;

    // Upsert: cập nhật hoặc tạo mới nếu chưa có
    db.prepare(`
      INSERT INTO vietqr_config
        (id, bank_id, bank_name, account_no, account_name, amount, description, title, subtitle, instruction, button_text, api_key)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        bank_id      = excluded.bank_id,
        bank_name    = excluded.bank_name,
        account_no   = excluded.account_no,
        account_name = excluded.account_name,
        amount       = excluded.amount,
        description  = excluded.description,
        title        = excluded.title,
        subtitle     = excluded.subtitle,
        instruction  = excluded.instruction,
        button_text  = excluded.button_text,
        api_key      = excluded.api_key
    `).run(
      bank_id || 'vcb',
      bank_name || 'Vietcombank',
      account_no || '',
      account_name || '',
      parseInt(amount) || 0,
      description || '',
      title || 'Ngân hàng Nhà nước Việt Nam',
      subtitle || '',
      instruction || '',
      button_text || 'Tải app VNeID để xác thực',
      api_key || ''
    );

    res.json({ success: true, message: 'Đã lưu cấu hình VietQR thành công.' });
  } catch (err) {
    console.error('VietQR config PUT error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi lưu cấu hình.' });
  }
});

module.exports = router;
