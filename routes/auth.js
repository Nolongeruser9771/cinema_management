const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { loadDb } = require('../services/dbService');

// Trang đăng nhập
router.get('/login', (req, res) => {
  if (req.session.userId) {
    // Redirect dựa vào role
    if (req.session.userRole === 'management') {
      return res.redirect('/management/schedule');
    } else if (req.session.userRole === 'sales') {
      return res.redirect('/sales');
    }
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

  const isValidPassword = await bcrypt.compare(password, user.password);
  
  if (!isValidPassword) {
    return res.render('pages/login', { error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
  }

  // Lấy danh sách rạp được quản lý
  let managedTheaters = [];
  if (user.role === 'management') {
    const managerInfo = db.theaterManagers.find(tm => tm.userId === user.id);
    managedTheaters = managerInfo ? managerInfo.theaterIds : [];
  }

  // Lưu thông tin vào session với cookie được cấu hình lại
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.userRole = user.role;
  req.session.managedTheaters = managedTheaters;
  
  // Lưu session trước khi redirect
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.render('pages/login', { error: 'Lỗi khi lưu phiên đăng nhập' });
    }

    // Điều hướng theo vai trò
    if (user.role === 'management') {
      res.redirect('/management/schedule');
    } else if (user.role === 'sales') {
      res.redirect('/sales');
    } else {
      res.redirect('/');
    }
  });
});

// Đăng xuất
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

module.exports = router;