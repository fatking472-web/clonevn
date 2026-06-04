const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');
const XLSX = require('xlsx');

// POST /api/submissions - Nộp hồ sơ
router.post('/', authMiddleware, (req, res) => {
  try {
    const {
      don_vi_tiep_nhan, linh_vuc, thu_tuc_hanh_chinh, loai_dich_vu,
      ho_ten, ngay_sinh, cccd, ngay_cap, noi_cap,
      so_dien_thoai, dia_chi, noi_dung, ghi_chu
    } = req.body;

    if (!ho_ten) return res.status(400).json({ success: false, message: 'Vui lòng nhập họ tên.' });

    const result = db.prepare(`
      INSERT INTO submissions
        (user_id, don_vi_tiep_nhan, linh_vuc, thu_tuc_hanh_chinh, loai_dich_vu,
         ho_ten, ngay_sinh, cccd, ngay_cap, noi_cap, so_dien_thoai, dia_chi, noi_dung, ghi_chu)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id, don_vi_tiep_nhan, linh_vuc, thu_tuc_hanh_chinh, loai_dich_vu,
      ho_ten, ngay_sinh, cccd, ngay_cap, noi_cap, so_dien_thoai, dia_chi, noi_dung, ghi_chu
    );

    res.status(201).json({
      success: true,
      message: 'Nộp hồ sơ thành công! Mã hồ sơ: ' + String(result.lastInsertRowid).padStart(8, '0'),
      submission_id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
});

// GET /api/submissions/my - Lấy hồ sơ của user hiện tại
router.get('/my', authMiddleware, (req, res) => {
  const submissions = db.prepare(
    'SELECT * FROM submissions WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json({ success: true, submissions });
});

// GET /api/submissions - Admin: lấy tất cả hồ sơ
router.get('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Không có quyền.' });
  const submissions = db.prepare('SELECT * FROM submissions ORDER BY created_at DESC').all();
  res.json({ success: true, total: submissions.length, submissions });
});

// GET /api/submissions/export - Admin: xuất Excel hồ sơ
router.get('/export', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Không có quyền.' });

  const submissions = db.prepare('SELECT * FROM submissions ORDER BY created_at DESC').all();

  const data = submissions.map(s => ({
    'Mã hồ sơ': String(s.id).padStart(8, '0'),
    'Họ tên': s.ho_ten,
    'Số CCCD': s.cccd,
    'Ngày sinh': s.ngay_sinh,
    'Số điện thoại': s.so_dien_thoai,
    'Địa chỉ': s.dia_chi,
    'Đơn vị tiếp nhận': s.don_vi_tiep_nhan,
    'Lĩnh vực': s.linh_vuc,
    'Thủ tục hành chính': s.thu_tuc_hanh_chinh,
    'Loại dịch vụ': s.loai_dich_vu,
    'Nội dung': s.noi_dung,
    'Ghi chú': s.ghi_chu,
    'Trạng thái': s.trang_thai,
    'Ngày nộp': s.created_at
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hồ sơ');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `HoSo_${new Date().toISOString().slice(0,10)}.xlsx`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

module.exports = router;
