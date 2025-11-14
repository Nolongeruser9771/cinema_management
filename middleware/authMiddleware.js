// Middleware kiểm tra đã đăng nhập chưa
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    // Kiểm tra session timeout (24h không hoạt động)
    if (req.session.lastActivity) {
      const now = Date.now();
      const hoursSinceActivity = (now - req.session.lastActivity) / (1000 * 60 * 60);
      
      if (hoursSinceActivity > 24) {
        req.session.destroy();
        return res.redirect('/login');
      }
    }
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

// Middleware kiểm tra quyền truy cập rạp
function canAccessTheater(theaterId) {
  return (req, res, next) => {
    if (req.session.userRole === 'sales') {
      // Sales có thể truy cập tất cả rạp
      return next();
    }
    
    if (req.session.userRole === 'management') {
      const managedTheaters = req.session.managedTheaters || [];
      if (managedTheaters.includes(parseInt(theaterId))) {
        return next();
      }
      return res.status(403).send('Bạn không có quyền quản lý rạp này');
    }
    
    res.status(403).send('Không có quyền truy cập');
  };
}

module.exports = {
  isAuthenticated,
  isManager,
  isSales,
  canAccessTheater
};