// Biến lưu trữ thông tin suất chiếu hiện tại
let currentShowtime = null;
let selectedSeats = [];

// Mở modal chọn ghế
async function openSeatModal(showtimeId) {
  try {
    const response = await fetch(`/sales/showtime/${showtimeId}/seats`);
    const data = await response.json();
    
    currentShowtime = data.showtime;
    const room = data.room;
    const soldSeats = data.soldSeats;
    
    // Cập nhật tiêu đề modal
    document.getElementById('modalTitle').textContent = 'Chọn ghế - ' + data.showtime.movieTitle;
    
    // Hiển thị thông tin suất chiếu
    document.getElementById('seatInfo').innerHTML = `
      Phim: ${data.showtime.movieTitle}
      Ca chiếu: ${data.showtime.shiftName} (${data.showtime.shiftTime})
      Ngày: ${data.showtime.date}
      Phòng: ${room.name} (${room.seats} ghế)
      Giá vé thường: ${data.showtime.standardPrice.toLocaleString('vi-VN')} đ
      Giá vé VIP: ${data.showtime.vipPrice.toLocaleString('vi-VN')} đ
    `;
    
    // Tạo lưới ghế
    createSeatGrid(room.seatLayout, soldSeats);
    
    // Reset ghế đã chọn
    selectedSeats = [];
    updateSelectedSeatsDisplay();
    
    // Hiển thị modal
    document.getElementById('seatModal').style.display = 'block';
  } catch (error) {
    alert('Lỗi khi tải thông tin ghế: ' + error.message);
  }
}

// Đóng modal
function closeSeatModal() {
  document.getElementById('seatModal').style.display = 'none';
  selectedSeats = [];
  currentShowtime = null;
}

// Xác định loại ghế (VIP hay thường)
function getSeatType(seatNumber, seatLayout) {
  const row = seatNumber.charCodeAt(0) - 65; // A=0, B=1, ...
  return seatLayout.vipRows.includes(row) ? 'vip' : 'standard';
}

// Tạo lưới ghế
function createSeatGrid(seatLayout, soldSeats) {
  const seatGrid = document.getElementById('seatGrid');
  seatGrid.innerHTML = '';
  
  const rows = seatLayout.rows;
  const cols = seatLayout.cols;
  const rowLabels = 'ABCDEFGHIJ';
  
  // Cập nhật grid columns
  seatGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const seatNumber = rowLabels[i] + (j + 1);
      const seat = document.createElement('div');
      seat.className = 'seat';
      seat.textContent = seatNumber;
      seat.dataset.seat = seatNumber;
      
      // Xác định loại ghế
      const seatType = getSeatType(seatNumber, seatLayout);
      seat.dataset.type = seatType;
      
      // Style cho ghế VIP
      if (seatType === 'vip') {
        seat.style.borderColor = '#ff6b6b';
        seat.style.background = '#ffebee';
      }
      
      // Kiểm tra ghế đã bán
      if (soldSeats.includes(seatNumber)) {
        seat.classList.add('seat-sold');
      } else {
        seat.onclick = () => toggleSeat(seatNumber, seat);
      }
      
      seatGrid.appendChild(seat);
    }
  }
}

// Toggle chọn ghế
function toggleSeat(seatNumber, seatElement) {
  const index = selectedSeats.findIndex(s => s.number === seatNumber);
  
  if (index > -1) {
    // Bỏ chọn ghế
    selectedSeats.splice(index, 1);
    seatElement.classList.remove('seat-selected');
  } else {
    // Chọn ghế
    const seatType = seatElement.dataset.type;
    const price = seatType === 'vip' ? currentShowtime.vipPrice : currentShowtime.standardPrice;
    
    selectedSeats.push({
      number: seatNumber,
      type: seatType,
      price: price
    });
    seatElement.classList.add('seat-selected');
  }
  
  updateSelectedSeatsDisplay();
}

// Cập nhật hiển thị ghế đã chọn và tính tiền
function updateSelectedSeatsDisplay() {
  const display = document.getElementById('selectedSeats');
  const priceBreakdown = document.getElementById('priceBreakdown');
  const totalAmount = document.getElementById('totalAmount');
  
  if (selectedSeats.length === 0) {
    display.textContent = 'Chưa chọn ghế nào';
    priceBreakdown.innerHTML = '';
    totalAmount.textContent = '0';
    return;
  }
  
  // Hiển thị danh sách ghế
  display.textContent = selectedSeats.map(s => s.number).join(', ');
  
  // Hiển thị chi tiết giá
  let breakdown = 'Chi tiết:';
  let total = 0;
  
  selectedSeats.forEach(seat => {
    breakdown += `Ghế ${seat.number} (${seat.type === 'vip' ? 'VIP' : 'Thường'}): ${seat.price.toLocaleString('vi-VN')} đ`;
    total += seat.price;
  });
  
  priceBreakdown.innerHTML = breakdown;
  totalAmount.textContent = total.toLocaleString('vi-VN');
}

// Bán vé
async function sellTickets() {
  if (selectedSeats.length === 0) {
    alert('Vui lòng chọn ít nhất một ghế');
    return;
  }
  
  const seatNumbers = selectedSeats.map(s => s.number);
  const total = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  
  if (!confirm(`Xác nhận bán ${selectedSeats.length} vé cho ghế: ${seatNumbers.join(', ')}?\nTổng tiền: ${total.toLocaleString('vi-VN')} đ`)) {
    return;
  }
  
  try {
    const response = await fetch('/sales/sell-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        showtimeId: currentShowtime.id,
        seats: seatNumbers
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert(result.message + '\nTổng tiền: ' + result.totalAmount.toLocaleString('vi-VN') + ' đ');
      closeSeatModal();
      // Reload trang để cập nhật
      window.location.reload();
    } else {
      alert('Lỗi: ' + result.message);
    }
  } catch (error) {
    alert('Lỗi khi bán vé: ' + error.message);
  }
}

// Đóng modal khi click bên ngoài
window.onclick = function(event) {
  const modal = document.getElementById('seatModal');
  if (event.target === modal) {
    closeSeatModal();
  }
}

// Set ngày mặc định cho input date
document.addEventListener('DOMContentLoaded', function() {
  const dateInputs = document.querySelectorAll('input[type="date"]');
  const today = new Date().toISOString().split('T')[0];
  
  dateInputs.forEach(input => {
    if (!input.value) {
      input.value = today;
    }
    input.min = today;
  });
  
  // Set tháng mặc định cho báo cáo
  const monthInput = document.querySelector('input[type="month"]');
  if (monthInput && !monthInput.value) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    monthInput.value = currentMonth;
  }
});