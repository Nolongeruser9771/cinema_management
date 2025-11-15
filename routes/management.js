const express = require('express');
const router = express.Router();
const { loadDb, saveDb, generateId } = require('../services/dbService');
const { isAuthenticated, isManager } = require('../middleware/authMiddleware');

// Trang lập lịch chiếu
router.get('/schedule', isAuthenticated, isManager, (req, res) => {
  const db = loadDb();
  const managedTheaterIds = req.session.managedTheaters || [];
  
  // Lấy danh sách rạp được quản lý
  const managedTheaters = db.theaters.filter(t => managedTheaterIds.includes(t.id));
  
  // Lấy danh sách phòng chiếu của các rạp được quản lý
  const rooms = db.screeningRooms.filter(r => managedTheaterIds.includes(r.theaterId));
  
  // Lấy danh sách suất chiếu của các phòng
  const roomIds = rooms.map(r => r.id);
  const showtimes = db.showtimes.filter(st => roomIds.includes(st.roomId));
  
  // Bổ sung thông tin chi tiết và tình trạng bán vé
  const showtimeDetails = showtimes.map(st => {
    const movie = db.movies.find(m => m.id === st.movieId);
    const room = db.screeningRooms.find(r => r.id === st.roomId);
    const theater = db.theaters.find(t => t.id === st.theaterId);
    const shift = db.shifts.find(s => s.id === st.shiftId);
    
    // Đếm số vé đã bán
    const soldTickets = db.tickets.filter(t => t.showtimeId === st.id).length;
    const totalSeats = st.totalSeats || room?.seats || 0;
    const isSoldOut = soldTickets >= totalSeats;
    
    return {
      ...st,
      movieTitle: movie?.title,
      theaterName: theater?.name,
      roomName: room?.name,
      shiftName: shift?.name,
      shiftTime: shift?.time,
      soldTickets,
      totalSeats,
      isSoldOut
    };
  });

  res.render('pages/schedule', {
    user: req.session,
    movies: db.movies,
    theaters: managedTheaters,
    rooms,
    shifts: db.shifts,
    showtimes: showtimeDetails,
    message: null
  });
});

// Thêm suất chiếu mới
router.post('/schedule/add', isAuthenticated, isManager, (req, res) => {
  const { movieId, theaterId, roomId, shiftId, date, standardPrice, vipPrice } = req.body;
  const db = loadDb();
  const managedTheaterIds = req.session.managedTheaters || [];
  
  // Kiểm tra quyền quản lý rạp
  if (!managedTheaterIds.includes(parseInt(theaterId))) {
    return res.status(403).send('Bạn không có quyền quản lý rạp này');
  }
  
  // Kiểm tra phòng có thuộc rạp không
  const room = db.screeningRooms.find(r => r.id === roomId && r.theaterId === parseInt(theaterId));
  if (!room) {
    return res.status(400).send('Phòng chiếu không hợp lệ');
  }
  
  // Kiểm tra trùng lịch
  const conflict = db.showtimes.find(st => 
    st.roomId === roomId && st.shiftId === shiftId && st.date === date
  );
  
  if (conflict) {
    const managedTheaters = db.theaters.filter(t => managedTheaterIds.includes(t.id));
    const rooms = db.screeningRooms.filter(r => managedTheaterIds.includes(r.theaterId));
    const showtimes = db.showtimes.filter(st => rooms.map(r => r.id).includes(st.roomId));
    
    // Bổ sung thông tin chi tiết và tình trạng bán vé cho error message
    const showtimeDetails = showtimes.map(st => {
      const movie = db.movies.find(m => m.id === st.movieId);
      const room = db.screeningRooms.find(r => r.id === st.roomId);
      const theater = db.theaters.find(t => t.id === st.theaterId);
      const shift = db.shifts.find(s => s.id === st.shiftId);
      
      const soldTickets = db.tickets.filter(t => t.showtimeId === st.id).length;
      const totalSeats = st.totalSeats || room?.seats || 0;
      const isSoldOut = soldTickets >= totalSeats;
      
      return {
        ...st,
        movieTitle: movie?.title,
        theaterName: theater?.name,
        roomName: room?.name,
        shiftName: shift?.name,
        shiftTime: shift?.time,
        soldTickets,
        totalSeats,
        isSoldOut
      };
    });
    
    return res.render('pages/schedule', {
      user: req.session,
      movies: db.movies,
      theaters: managedTheaters,
      rooms,
      shifts: db.shifts,
      showtimes: showtimeDetails,
      message: { type: 'error', text: 'Phòng chiếu đã có lịch vào ca này' }
    });
  }
  
  // Tạo suất chiếu mới với totalSeats
  const newShowtime = {
    id: generateId('st'),
    movieId,
    roomId,
    shiftId,
    theaterId: parseInt(theaterId),
    date,
    standardPrice: parseFloat(standardPrice),
    vipPrice: parseFloat(vipPrice),
    totalSeats: room.seats // Lấy số ghế từ phòng chiếu
  };
  
  db.showtimes.push(newShowtime);
  saveDb(db);
  
  res.redirect('/management/schedule');
});

// Xóa suất chiếu
router.post('/schedule/delete/:id', isAuthenticated, isManager, (req, res) => {
  const showtimeId = req.params.id;
  const db = loadDb();
  const managedTheaterIds = req.session.managedTheaters || [];
  
  // Kiểm tra suất chiếu có thuộc rạp được quản lý không
  const showtime = db.showtimes.find(st => st.id === showtimeId);
  if (!showtime) {
    return res.status(404).send('Không tìm thấy suất chiếu');
  }
  
  if (!managedTheaterIds.includes(showtime.theaterId)) {
    return res.status(403).send('Bạn không có quyền xóa suất chiếu này');
  }
  
  // Xóa suất chiếu
  db.showtimes = db.showtimes.filter(st => st.id !== showtimeId);
  saveDb(db);
  
  res.redirect('/management/schedule');
});

// Trang báo cáo
router.get('/reports', isAuthenticated, isManager, (req, res) => {
  const db = loadDb();
  const managedTheaterIds = req.session.managedTheaters || [];
  const managedTheaters = db.theaters.filter(t => managedTheaterIds.includes(t.id));
  
  res.render('pages/reports', {
    user: req.session,
    theaters: managedTheaters,
    report: null
  });
});

// Xem báo cáo BM2
router.post('/reports/generate', isAuthenticated, isManager, (req, res) => {
  const { month, theaterIds } = req.body;
  const db = loadDb();
  const managedTheaterIds = req.session.managedTheaters || [];
  
  // Parse theater IDs
  const selectedTheaterIds = theaterIds ? 
    (Array.isArray(theaterIds) ? theaterIds.map(id => parseInt(id)) : [parseInt(theaterIds)]) 
    : managedTheaterIds;
  
  // Kiểm tra quyền
  const unauthorized = selectedTheaterIds.some(id => !managedTheaterIds.includes(id));
  if (unauthorized) {
    return res.status(403).send('Bạn không có quyền xem báo cáo của rạp này');
  }
  
  // Lọc suất chiếu theo rạp
  const showtimes = db.showtimes.filter(st => selectedTheaterIds.includes(st.theaterId));
  const showtimeIds = showtimes.map(st => st.id);
  
  // Lọc vé theo tháng và suất chiếu
  const tickets = db.tickets.filter(t => {
    if (!showtimeIds.includes(t.showtimeId)) return false;
    
    const soldDate = new Date(t.soldAt);
    const soldMonth = `${soldDate.getFullYear()}-${String(soldDate.getMonth() + 1).padStart(2, '0')}`;
    return soldMonth === month;
  });
  
  const totalTickets = tickets.length;
  const totalRevenue = tickets.reduce((sum, t) => sum + (t.price || 0), 0);
  
  // Nhóm vé theo ca chiếu
  const shiftStats = {};
  
  tickets.forEach(ticket => {
    const showtime = db.showtimes.find(st => st.id === ticket.showtimeId);
    if (showtime) {
      const shift = db.shifts.find(s => s.id === showtime.shiftId);
      if (shift) {
        if (!shiftStats[shift.name]) {
          shiftStats[shift.name] = { count: 0, revenue: 0 };
        }
        shiftStats[shift.name].count++;
        shiftStats[shift.name].revenue += ticket.price || 0;
      }
    }
  });
  
  // Tính tỷ lệ phần trăm
  const report = Object.entries(shiftStats).map(([shiftName, stats]) => ({
    shiftName,
    count: stats.count,
    revenue: stats.revenue,
    percentage: totalTickets > 0 ? ((stats.count / totalTickets) * 100).toFixed(2) : 0
  }));
  
  const managedTheaters = db.theaters.filter(t => managedTheaterIds.includes(t.id));
  const selectedTheaters = db.theaters.filter(t => selectedTheaterIds.includes(t.id));
  
  res.render('pages/reports', {
    user: req.session,
    theaters: managedTheaters,
    report: {
      month,
      selectedTheaters,
      totalTickets,
      totalRevenue,
      shifts: report
    }
  });
});

module.exports = router;