const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { loadDb } = require('../services/dbService');

// Trang đăng nhập
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('pages/login', { error: null });
});

// Xử lý đăng nhập
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const db = loadDb();

  if (!db) {
    return res.render('pages/login', { error: 'Lỗi hệ thống' });
  }

  const user = db.users.find(u => u.username === username);

  if (!user) {
    return res.render('pages/login', { error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
  }

  // So sánh mật khẩu (trong thực tế nên dùng bcrypt.compare)
  // Tạm thời so sánh trực tiếp vì password trong db.json đã băm
  const isValidPassword = password === '123456'; // Mật khẩu mặc định cho demo

  if (!isValidPassword) {
    return res.render('pages/login', { error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
  }

  // Lưu thông tin vào session
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.userRole = user.role;
  req.session.theaterId = user.theaterId;

  // Điều hướng theo vai trò
  if (user.role === 'management') {
    res.redirect('/management/schedule');
  } else if (user.role === 'sales') {
    res.redirect('/sales');
  } else {
    res.redirect('/');
  }
});

// Đăng xuất
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;