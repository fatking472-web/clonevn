const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'users.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Bảng users (đăng nhập bằng CCCD)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    cccd TEXT UNIQUE NOT NULL,
    phone TEXT,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Bảng hồ sơ "Dịch vụ công trực tuyến" (/kekhai)
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    -- Thông tin chung
    don_vi_tiep_nhan TEXT,
    linh_vuc TEXT,
    thu_tuc_hanh_chinh TEXT,
    loai_dich_vu TEXT,
    -- Thông tin người nộp
    ho_ten TEXT NOT NULL,
    ngay_sinh TEXT,
    cccd TEXT,
    ngay_cap TEXT,
    noi_cap TEXT,
    so_dien_thoai TEXT,
    dia_chi TEXT,
    -- Nội dung khai
    noi_dung TEXT,
    ghi_chu TEXT,
    -- Trạng thái
    trang_thai TEXT DEFAULT 'Chờ xử lý',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Thêm tài khoản admin mặc định nếu chưa có
const bcrypt = require('bcryptjs');
const adminExists = db.prepare("SELECT id FROM users WHERE cccd = '000000000000' AND role = 'admin'").get();
if (!adminExists) {
  const hashed = bcrypt.hashSync('Admin@123', 12);
  db.prepare(`
    INSERT INTO users (full_name, cccd, phone, password, role)
    VALUES ('Quản trị viên', '000000000000', '0000000000', ?, 'admin')
  `).run(hashed);
  console.log('✅ Tạo tài khoản admin: CCCD=000000000000 / Pass=Admin@123');
}

console.log('✅ Database khởi tạo thành công:', dbPath);
module.exports = db;
