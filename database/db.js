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

// Bảng cấu hình VietQR (chỉ 1 dòng duy nhất id=1)
db.exec(`
  CREATE TABLE IF NOT EXISTS vietqr_config (
    id          INTEGER PRIMARY KEY CHECK(id = 1),
    bank_id     TEXT    DEFAULT 'vcb',
    bank_name   TEXT    DEFAULT 'Vietcombank',
    account_no  TEXT    DEFAULT '',
    account_name TEXT   DEFAULT '',
    amount      INTEGER DEFAULT 0,
    description TEXT    DEFAULT 'Thanh toan phi dich vu',
    title       TEXT    DEFAULT 'Ngân hàng Nhà nước Việt Nam',
    subtitle    TEXT    DEFAULT 'Kết nối tài khoản ngân hàng với CCCD gắn chip để xác thực danh tính và sử dụng dịch vụ ngân hàng số.',
    instruction TEXT    DEFAULT 'Mở ứng dụng tương ứng trên điện thoại → Chọn "Quét mã QR" → Quét mã trên để kết nối dịch vụ hoặc sử dụng app VNeID để xác thực CCCD',
    button_text TEXT    DEFAULT 'Tải app VNeID để xác thực',
    api_key     TEXT    DEFAULT ''
  );
`);

// Chèn cấu hình mặc định nếu chưa có
const vietqrExists = db.prepare('SELECT id FROM vietqr_config WHERE id = 1').get();
if (!vietqrExists) {
  db.prepare(`
    INSERT INTO vietqr_config (id, bank_id, bank_name, account_no, account_name, amount, description, title, subtitle, instruction, button_text)
    VALUES (1, 'vcb', 'Vietcombank', '', '', 0, 'Thanh toan phi dich vu',
      'Ngân hàng Nhà nước Việt Nam',
      'Kết nối tài khoản ngân hàng với CCCD gắn chip để xác thực danh tính và sử dụng dịch vụ ngân hàng số.',
      'Mở ứng dụng tương ứng trên điện thoại → Chọn "Quét mã QR" → Quét mã trên để kết nối dịch vụ hoặc sử dụng app VNeID để xác thực CCCD',
      'Tải app VNeID để xác thực')
  `).run();
  console.log('✅ Tạo cấu hình VietQR mặc định');
}

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
