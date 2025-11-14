// Middleware kiểm tra đã đăng nhập chưa
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

// Middleware kiểm tra có phải là quản lý không
function isManager(req, res, next) {
  if (req.session && req.session.userId && req.session.userRole === 'management') {
    return next();
  }
  res.status(403).send('Bạn không có quyền truy cập trang này');
}

// Middleware kiểm tra có phải là nhân viên bán vé không
function isSales(req, res, next) {
  if (req.session && req.session.userId && req.session.userRole === 'sales') {
    return next();
  }
  res.status(403).send('Bạn không có quyền truy cập trang này');
}

module.exports = {
  isAuthenticated,
  isManager,
  isSales
};