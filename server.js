require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================
// Security & Middleware
// ========================
app.use(cors({
  origin: process.env.CORS_ORIGIN || false,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ========================
// Serve static files SAFELY
// Chỉ serve các thư mục cụ thể, KHÔNG serve toàn bộ root
// ========================
app.use('/css',    express.static(path.join(__dirname, 'css')));
app.use('/js',     express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/fonts',  express.static(path.join(__dirname, 'fonts')));
app.use('/favicon.ico', express.static(path.join(__dirname, 'favicon.ico')));

// ========================
// API Routes
// ========================
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/submissions', require('./routes/submissions'));

app.get('/api/health', (req, res) => res.json({
  success: true,
  message: 'OK',
  time: new Date().toISOString()
}));

// ========================
// Page routes
// ========================
const pages = ['kekhai', 'lienket', 'admin'];
pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', `${page}.html`));
  });
});

// Fallback → index.html
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========================
// Start Server
// ========================
app.listen(PORT, () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`\n✅ Server chạy tại cổng ${PORT} [${env}]`);
  if (env !== 'production') {
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`🔑 Admin: /admin  |  CCCD: ${process.env.ADMIN_CCCD || '000000000000'}`);
  }
});

module.exports = app;
