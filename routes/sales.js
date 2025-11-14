const express = require('express');
const router = express.Router();
const { loadDb, saveDb, generateId } = require('../services/dbService');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Trang bán vé
router.get('/', isAuthenticated, (req, res) => {
  const db = loadDb();
  res.render('pages/sales', {
    user: req.session,
    movies: db.movies,
    shifts: db.shifts,
    showtimes: []
  });
});

// API tra cứu suất chiếu
router.post('/search', isAuthenticated, (req, res) => {
  const { movieId, shiftId, date } = req.body;
  const db = loadDb();

  let showtimes = db.showtimes;

  // Lọc theo điều kiện
  if (movieId) {
    showtimes = showtimes.filter(st => st.movieId === movieId);
  }
  if (shiftId) {
    showtimes = showtimes.filter(st => st.shiftId === shiftId);
  }
  if (date) {
    showtimes = showtimes.filter(st => st.date === date);
  }

  // Bổ sung thông tin chi tiết
  const results = showtimes.map(st => {
    const movie = db.movies.find(m => m.id === st.movieId);
    const room = db.screeningRooms.find(r => r.id === st.roomId);
    const theater = db.theaters.find(t => t.id === room.theaterId);
    const shift = db.shifts.find(s => s.id === st.shiftId);
    
    return {
      ...st,
      movieTitle: movie?.title,
      theaterName: theater?.name,
      roomName: room?.name,
      shiftName: shift?.name,
      shiftTime: shift?.time
    };
  });

  res.render('pages/sales', {
    user: req.session,
    movies: db.movies,
    shifts: db.shifts,
    showtimes: results
  });
});

// API lấy thông tin ghế của suất chiếu
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
      date: showtime.date
    },
    room: {
      name: room?.name,
      seats: room?.seats,
      type: room?.type
    },
    soldSeats
  });
});

// API bán vé
router.post('/sell-ticket', isAuthenticated, (req, res) => {
  const { showtimeId, seats } = req.body;
  const db = loadDb();

  // Kiểm tra ghế đã được bán chưa
  const soldSeats = db.tickets
    .filter(t => t.showtimeId === showtimeId)
    .map(t => t.seat);

  const seatArray = Array.isArray(seats) ? seats : [seats];
  
  for (const seat of seatArray) {
    if (soldSeats.includes(seat)) {
      return res.json({ success: false, message: `Ghế ${seat} đã được bán` });
    }
  }

  // Tạo vé mới
  const newTickets = seatArray.map(seat => ({
    id: generateId('t'),
    showtimeId,
    seat,
    soldAt: new Date().toISOString(),
    soldBy: req.session.userId
  }));

  db.tickets.push(...newTickets);
  saveDb(db);

  res.json({ success: true, message: 'Bán vé thành công' });
});

module.exports = router;