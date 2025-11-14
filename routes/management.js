const express = require('express');
const router = express.Router();
const { loadDb, saveDb, generateId } = require('../services/dbService');
const { isAuthenticated, isManager } = require('../middleware/authMiddleware');

// Trang lập lịch chiếu
router.get('/schedule', isAuthenticated, isManager, (req, res) => {
  const db = loadDb();
  const theaterId = req.session.theaterId;

  // Lấy danh sách phòng chiếu của rạp
  const rooms = db.screeningRooms.filter(r => r.theaterId === theaterId);

  // Lấy danh sách suất chiếu của rạp
  const roomIds = rooms.map(r => r.id);
  const showtimes = db.showtimes.filter(st => roomIds.includes(st.roomId));

  // Bổ sung thông tin chi tiết
  const showtimeDetails = showtimes.map(st => {
    const movie = db.movies.find(m => m.id === st.movieId);
    const room = db.screeningRooms.find(r => r.id === st.roomId);
    const shift = db.shifts.find(s => s.id === st.shiftId);
    
    return {
      ...st,
      movieTitle: movie?.title,
      roomName: room?.name,
      shiftName: shift?.name,
      shiftTime: shift?.time
    };
  });

  res.render('pages/schedule', {
    user: req.session,
    movies: db.movies,
    rooms,
    shifts: db.shifts,
    showtimes: showtimeDetails,
    message: null
  });
});

// Thêm suất chiếu mới
router.post('/schedule/add', isAuthenticated, isManager, (req, res) => {
  const { movieId, roomId, shiftId, date } = req.body;
  const db = loadDb();
  const theaterId = req.session.theaterId;

  // Kiểm tra phòng có thuộc rạp của quản lý không
  const room = db.screeningRooms.find(r => r.id === roomId && r.theaterId === theaterId);
  if (!room) {
    return res.status(403).send('Phòng chiếu không thuộc rạp của bạn');
  }

  // Kiểm tra trùng lịch
  const conflict = db.showtimes.find(st => 
    st.roomId === roomId && st.shiftId === shiftId && st.date === date
  );

  if (conflict) {
    const rooms = db.screeningRooms.filter(r => r.theaterId === theaterId);
    const showtimes = db.showtimes.filter(st => rooms.map(r => r.id).includes(st.roomId));
    
    return res.render('pages/schedule', {
      user: req.session,
      movies: db.movies,
      rooms,
      shifts: db.shifts,
      showtimes,
      message: { type: 'error', text: 'Phòng chiếu đã có lịch vào ca này' }
    });
  }

  // Tạo suất chiếu mới
  const newShowtime = {
    id: generateId('st'),
    movieId,
    roomId,
    shiftId,
    date
  };

  db.showtimes.push(newShowtime);
  saveDb(db);

  res.redirect('/management/schedule');
});

// Xóa suất chiếu
router.post('/schedule/delete/:id', isAuthenticated, isManager, (req, res) => {
  const showtimeId = req.params.id;
  const db = loadDb();
  const theaterId = req.session.theaterId;

  // Kiểm tra suất chiếu có thuộc rạp của quản lý không
  const showtime = db.showtimes.find(st => st.id === showtimeId);
  if (!showtime) {
    return res.status(404).send('Không tìm thấy suất chiếu');
  }

  const room = db.screeningRooms.find(r => r.id === showtime.roomId);
  if (room.theaterId !== theaterId) {
    return res.status(403).send('Bạn không có quyền xóa suất chiếu này');
  }

  // Xóa suất chiếu
  db.showtimes = db.showtimes.filter(st => st.id !== showtimeId);
  saveDb(db);

  res.redirect('/management/schedule');
});

// Trang báo cáo
router.get('/reports', isAuthenticated, isManager, (req, res) => {
  res.render('pages/reports', {
    user: req.session,
    report: null
  });
});

// Xem báo cáo BM2
router.post('/reports/generate', isAuthenticated, isManager, (req, res) => {
  const { month } = req.body; // Format: YYYY-MM
  const db = loadDb();

  // Lọc vé theo tháng
  const tickets = db.tickets.filter(t => {
    const soldDate = new Date(t.soldAt);
    const soldMonth = `${soldDate.getFullYear()}-${String(soldDate.getMonth() + 1).padStart(2, '0')}`;
    return soldMonth === month;
  });

  const totalTickets = tickets.length;

  // Nhóm vé theo ca chiếu
  const shiftStats = {};
  
  tickets.forEach(ticket => {
    const showtime = db.showtimes.find(st => st.id === ticket.showtimeId);
    if (showtime) {
      const shift = db.shifts.find(s => s.id === showtime.shiftId);
      if (shift) {
        if (!shiftStats[shift.name]) {
          shiftStats[shift.name] = 0;
        }
        shiftStats[shift.name]++;
      }
    }
  });

  // Tính tỷ lệ phần trăm
  const report = Object.entries(shiftStats).map(([shiftName, count]) => ({
    shiftName,
    count,
    percentage: totalTickets > 0 ? ((count / totalTickets) * 100).toFixed(2) : 0
  }));

  res.render('pages/reports', {
    user: req.session,
    report: {
      month,
      totalTickets,
      shifts: report
    }
  });
});

module.exports = router;