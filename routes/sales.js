const express = require('express');
const router = express.Router();
const { loadDb, saveDb, generateId } = require('../services/dbService');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Trang bán vé - cho phép cả manager và sales
router.get('/', isAuthenticated, (req, res) => {
  const db = loadDb();
  res.render('pages/sales', {
    user: req.session,
    movies: db.movies,
    theaters: db.theaters,
    shifts: db.shifts,
    showtimes: []
  });
});

// API tra cứu suất chiếu - cho phép cả manager và sales
router.post('/search', isAuthenticated, (req, res) => {
  const { movieId, theaterIds, shiftId, date } = req.body;
  const db = loadDb();
  
  let showtimes = db.showtimes;
  
  // Lọc theo điều kiện
  if (movieId) {
    showtimes = showtimes.filter(st => st.movieId === movieId);
  }
  if (theaterIds) {
    const selectedTheaterIds = Array.isArray(theaterIds) ? 
      theaterIds.map(id => parseInt(id)) : 
      [parseInt(theaterIds)];
    showtimes = showtimes.filter(st => selectedTheaterIds.includes(st.theaterId));
  }
  if (shiftId) {
    showtimes = showtimes.filter(st => st.shiftId === shiftId);
  }
  if (date) {
    showtimes = showtimes.filter(st => st.date === date);
  }
  
  // Bổ sung thông tin chi tiết và tính số vé đã bán
  const results = showtimes.map(st => {
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
  
  res.render('pages/sales', {
    user: req.session,
    movies: db.movies,
    theaters: db.theaters,
    shifts: db.shifts,
    showtimes: results
  });
});

// Helper function để xác định loại ghế
function getSeatType(seatNumber, seatLayout) {
  const row = seatNumber.charCodeAt(0) - 65; // A=0, B=1, ...
  return seatLayout.vipRows.includes(row) ? 'vip' : 'standard';
}

// API lấy thông tin ghế của suất chiếu - cho phép cả manager và sales
router.get('/showtime/:id/seats', isAuthenticated, (req, res) => {
  const showtimeId = req.params.id;
  const db = loadDb();
  
  const showtime = db.showtimes.find(st => st.id === showtimeId);
  if (!showtime) {
    return res.status(404).json({ error: 'Không tìm thấy suất chiếu' });
  }
  
  const room = db.screeningRooms.find(r => r.id === showtime.roomId);
  const movie = db.movies.find(m => m.id === showtime.movieId);
  const shift = db.shifts.find(s => s.id === showtime.shiftId);
  
  // Lấy danh sách ghế đã bán
  const soldSeats = db.tickets
    .filter(t => t.showtimeId === showtimeId)
    .map(t => t.seat);
  
  res.json({
    showtime: {
      id: showtime.id,
      movieTitle: movie?.title,
      shiftName: shift?.name,
      shiftTime: shift?.time,
      date: showtime.date,
      standardPrice: showtime.standardPrice,
      vipPrice: showtime.vipPrice,
      totalSeats: showtime.totalSeats || room?.seats || 0
    },
    room: {
      name: room?.name,
      seats: room?.seats,
      type: room?.type,
      seatLayout: room?.seatLayout
    },
    soldSeats
  });
});

// API bán vé - cho phép cả manager và sales
router.post('/sell-ticket', isAuthenticated, (req, res) => {
  const { showtimeId, seats } = req.body;
  const db = loadDb();
  
  const showtime = db.showtimes.find(st => st.id === showtimeId);
  if (!showtime) {
    return res.json({ success: false, message: 'Không tìm thấy suất chiếu' });
  }
  
  const room = db.screeningRooms.find(r => r.id === showtime.roomId);
  
  // Kiểm tra ghế đã được bán chưa
  const soldSeats = db.tickets
    .filter(t => t.showtimeId === showtimeId)
    .map(t => t.seat);
  
  const seatArray = Array.isArray(seats) ? seats : [seats];
  
  // Kiểm tra số lượng vé còn lại
  const totalSeats = showtime.totalSeats || room?.seats || 0;
  const currentSoldCount = soldSeats.length;
  const newTotalSold = currentSoldCount + seatArray.length;
  
  if (newTotalSold > totalSeats) {
    return res.json({ 
      success: false, 
      message: `Không đủ ghế trống. Chỉ còn ${totalSeats - currentSoldCount} ghế.` 
    });
  }
  
  // Kiểm tra ghế cụ thể đã được bán chưa
  for (const seat of seatArray) {
    if (soldSeats.includes(seat)) {
      return res.json({ success: false, message: `Ghế ${seat} đã được bán` });
    }
  }
  
  // Tạo vé mới với giá tương ứng
  const newTickets = seatArray.map(seat => {
    const seatType = getSeatType(seat, room.seatLayout);
    const price = seatType === 'vip' ? showtime.vipPrice : showtime.standardPrice;
    
    return {
      id: generateId('t'),
      showtimeId,
      seat,
      seatType,
      price,
      soldAt: new Date().toISOString(),
      soldBy: req.session.userId
    };
  });
  
  const totalAmount = newTickets.reduce((sum, t) => sum + t.price, 0);
  
  db.tickets.push(...newTickets);
  saveDb(db);
  
  res.json({ 
    success: true, 
    message: 'Bán vé thành công',
    totalAmount,
    tickets: newTickets
  });
});

module.exports = router;