const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');

const ENV_PATH = path.join(__dirname, '..', '.env');

// ========================
// Đọc file .env thành object
// ========================
function readEnv() {
  const content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  const result = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.substring(0, idx).trim();
    const val = trimmed.substring(idx + 1).trim();
    result[key] = val;
  });
  return result;
}

// ========================
// Ghi lại file .env (chỉ cập nhật key chỉ định, giữ nguyên phần còn lại)
// ========================
function writeEnvKeys(updates) {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';

  Object.entries(updates).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content = content.trimEnd() + `\n${key}=${value}\n`;
    }
  });

  fs.writeFileSync(ENV_PATH, content, 'utf8');
}

// ========================
// Middleware kiểm tra quyền admin
// ========================
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền thực hiện.' });
  }
  next();
}

// ========================
// GET /api/settings/telegram
// Lấy trạng thái cấu hình (không trả về token đầy đủ)
// ========================
router.get('/telegram', authMiddleware, requireAdmin, (req, res) => {
  const env = readEnv();
  const botToken = env.TELEGRAM_BOT_TOKEN || '';
  const chatId   = env.TELEGRAM_CHAT_ID   || '';
  const seToken  = env.SEPAY_WEBHOOK_TOKEN || '';

  const isPlaceholder = (val, placeholder) => !val || val === placeholder;

  const telegramOk = !isPlaceholder(botToken, 'your_bot_token_here') && !isPlaceholder(chatId, 'your_chat_id_here');
  const sepayOk    = !isPlaceholder(seToken, 'your_sepay_api_token_here');

  res.json({
    success: true,
    config: {
      telegram_configured: telegramOk,
      sepay_configured: sepayOk,
      // Chỉ hiển thị một phần để confirm đã có token
      telegram_bot_token_hint: telegramOk ? botToken.substring(0, 10) + '••••' + botToken.slice(-4) : '',
      telegram_chat_id: telegramOk ? chatId : '',
      sepay_webhook_token_hint: sepayOk ? seToken.substring(0, 6) + '••••' + seToken.slice(-4) : ''
    }
  });
});

// ========================
// PUT /api/settings/telegram
// Lưu token mới vào .env và cập nhật process.env ngay (không cần restart)
// ========================
router.put('/telegram', authMiddleware, requireAdmin, (req, res) => {
  const { telegram_bot_token, telegram_chat_id, sepay_webhook_token } = req.body;

  const updates = {};
  if (telegram_bot_token  && telegram_bot_token.trim())  updates.TELEGRAM_BOT_TOKEN  = telegram_bot_token.trim();
  if (telegram_chat_id    && telegram_chat_id.trim())    updates.TELEGRAM_CHAT_ID    = telegram_chat_id.trim();
  if (sepay_webhook_token && sepay_webhook_token.trim()) updates.SEPAY_WEBHOOK_TOKEN = sepay_webhook_token.trim();

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, message: 'Không có dữ liệu để lưu' });
  }

  try {
    writeEnvKeys(updates);
    // Cập nhật process.env ngay không cần restart server
    Object.entries(updates).forEach(([k, v]) => { process.env[k] = v; });
    res.json({ success: true, message: 'Đã lưu cấu hình! Có hiệu lực ngay, không cần restart.' });
  } catch (e) {
    console.error('Lỗi ghi .env:', e);
    res.status(500).json({ success: false, message: 'Lỗi khi ghi file cấu hình: ' + e.message });
  }
});

module.exports = router;
