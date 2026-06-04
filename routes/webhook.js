const express = require('express');
const router = express.Router();
const https = require('https');

// ========================
// Helper: Gửi tin nhắn Telegram
// ========================
function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('⚠️  Chưa cấu hình TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID trong .env');
    return;
  }

  const body = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  });

  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req = https.request(options, (res) => {
    res.on('data', (d) => {
      const json = JSON.parse(d.toString());
      if (!json.ok) {
        console.error('❌ Telegram API lỗi:', json.description);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Lỗi kết nối Telegram:', e.message);
  });

  req.write(body);
  req.end();
}

// ========================
// Helper: Format số tiền VND
// ========================
function formatMoney(amount) {
  return Number(amount).toLocaleString('vi-VN') + ' VND';
}

// ========================
// POST /api/webhook/sepay
// Nhận thông báo từ SePay khi có tiền vào tài khoản
// ========================
router.post('/sepay', (req, res) => {
  // Xác thực token từ SePay (nếu đã cấu hình)
  const sepayToken = process.env.SEPAY_WEBHOOK_TOKEN;
  if (sepayToken) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Apikey ${sepayToken}`) {
      console.warn('⚠️  Webhook nhận được nhưng token không hợp lệ');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  }

  const data = req.body;
  console.log('📩 Webhook SePay nhận được:', JSON.stringify(data, null, 2));

  // Chỉ xử lý giao dịch tiền vào (credit)
  if (data.transferType !== 'in') {
    return res.json({ success: true, message: 'Giao dịch tiền ra, bỏ qua' });
  }

  // Chuẩn bị nội dung tin nhắn Telegram
  const soTien = formatMoney(data.transferAmount || 0);
  const noiDung = data.content || 'Không có nội dung';
  const taiKhoan = data.accountNumber || 'N/A';
  const ngayGio = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const maNganHang = data.bankCode || '';
  const soGiaoDich = data.referenceCode || 'N/A';

  const message = [
    `💰 <b>NHẬN TIỀN THÀNH CÔNG!</b>`,
    ``,
    `📌 <b>Số tiền:</b> ${soTien}`,
    `🏦 <b>Tài khoản:</b> ${taiKhoan}${maNganHang ? ` (${maNganHang})` : ''}`,
    `📝 <b>Nội dung CK:</b> ${noiDung}`,
    `🔖 <b>Mã giao dịch:</b> ${soGiaoDich}`,
    `🕐 <b>Thời gian:</b> ${ngayGio}`
  ].join('\n');

  // Gửi thông báo Telegram
  sendTelegramMessage(message);

  // Trả về 200 cho SePay biết đã nhận thành công
  return res.json({ success: true, message: 'Đã nhận và xử lý webhook' });
});

// ========================
// GET /api/webhook/test
// Dùng để test bot Telegram có hoạt động không
// ========================
router.get('/test', (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token === 'your_bot_token_here' || chatId === 'your_chat_id_here') {
    return res.json({ success: false, message: 'Chưa cấu hình Bot Token hoặc Chat ID. Vui lòng lưu cấu hình trước!' });
  }

  sendTelegramMessage([
    `🧪 <b>TEST THÔNG BÁO</b>`,
    ``,
    `✅ Bot Telegram đã được kết nối thành công!`,
    `🕐 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
  ].join('\n'));

  return res.json({ success: true, message: 'Đã gửi tin nhắn test đến Telegram! Kiểm tra app Telegram của bạn.' });
});

module.exports = router;
