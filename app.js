const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Import routes
const authRoutes = require('./routes/auth');
const salesRoutes = require('./routes/sales');
const managementRoutes = require('./routes/management');

// Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình session
app.use(session({
  secret: 'cinema-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 giờ
}));

// Routes
app.use('/', authRoutes);
app.use('/sales', salesRoutes);
app.use('/management', managementRoutes);

// Trang chủ - chuyển hướng theo role
app.get('/', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  if (req.session.userRole === 'management') {
    res.redirect('/management/schedule');
  } else if (req.session.userRole === 'sales') {
    res.redirect('/sales');
  } else {
    res.redirect('/login');
  }
});

// Xử lý 404
app.use((req, res) => {
  res.status(404).send('Trang không tồn tại');
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
  console.log('Tài khoản demo:');
  console.log('- Manager: manager1 / 123456');
  console.log('- Sales: sales1 / 123456');
});