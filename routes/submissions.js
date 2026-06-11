const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');
const { buildReadableExcel } = require('./excelExport');

// POST /api/submissions - Nop ho so
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

// GET /api/submissions/my - Lay ho so cua user hien tai
router.get('/my', authMiddleware, (req, res) => {
  const submissions = db.prepare(
    'SELECT * FROM submissions WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json({ success: true, submissions });
});

// GET /api/submissions - Admin: lay tat ca ho so
router.get('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Không có quyền.' });
  const submissions = db.prepare('SELECT * FROM submissions ORDER BY created_at DESC').all();
  res.json({ success: true, total: submissions.length, submissions });
});

// GET /api/submissions/export - Admin: xuat Excel ho so
router.get('/export', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Không có quyền.' });

  const submissions = db.prepare('SELECT * FROM submissions ORDER BY created_at DESC').all();

  const buf = buildReadableExcel({
    sheetName: 'Ho so',
    title: 'DANH SÁCH HỒ SƠ ĐÃ NỘP',
    rows: submissions,
    columns: [
      { header: 'Mã hồ sơ', width: 14, value: s => String(s.id).padStart(8, '0') },
      { header: 'Họ tên', width: 28, value: s => s.ho_ten },
      { header: 'Số CCCD', width: 18, value: s => s.cccd },
      { header: 'Ngày sinh', width: 14, value: s => s.ngay_sinh },
      { header: 'Số điện thoại', width: 18, value: s => s.so_dien_thoai },
      { header: 'Địa chỉ', width: 34, value: s => s.dia_chi },
      { header: 'Đơn vị tiếp nhận', width: 30, value: s => s.don_vi_tiep_nhan },
      { header: 'Lĩnh vực', width: 24, value: s => s.linh_vuc },
      { header: 'Thủ tục hành chính', width: 34, value: s => s.thu_tuc_hanh_chinh },
      { header: 'Loại dịch vụ', width: 18, value: s => s.loai_dich_vu },
      { header: 'Nội dung', width: 42, value: s => s.noi_dung },
      { header: 'Ghi chú', width: 28, value: s => s.ghi_chu },
      { header: 'Trạng thái', width: 18, value: s => s.trang_thai },
      { header: 'Ngày nộp', width: 24, value: s => s.created_at }
    ]
  });
  const filename = `HoSo_${new Date().toISOString().slice(0, 10)}.xlsx`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

module.exports = router;
