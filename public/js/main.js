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
      <p><strong>Phim:</strong> ${data.showtime.movieTitle}</p>
      <p><strong>Ca chiếu:</strong> ${data.showtime.shiftName} (${data.showtime.shiftTime})</p>
      <p><strong>Ngày:</strong> ${data.showtime.date}</p>
      <p><strong>Phòng:</strong> ${room.name} (${room.seats} ghế)</p>
    `;

    // Tạo lưới ghế
    createSeatGrid(room.seats, soldSeats);

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

// Tạo lưới ghế
function createSeatGrid(totalSeats, soldSeats) {
  const seatGrid = document.getElementById('seatGrid');
  seatGrid.innerHTML = '';

  // Tính số hàng và cột
  const rows = totalSeats === 100 ? 10 : 6; // 100 ghế: 10x10, 60 ghế: 6x10
  const cols = 10;

  const rowLabels = 'ABCDEFGHIJ';

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const seatNumber = rowLabels[i] + (j + 1);
      const seat = document.createElement('div');
      seat.className = 'seat';
      seat.textContent = seatNumber;
      seat.dataset.seat = seatNumber;

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
  const index = selectedSeats.indexOf(seatNumber);
  
  if (index > -1) {
    // Bỏ chọn ghế
    selectedSeats.splice(index, 1);
    seatElement.classList.remove('seat-selected');
  } else {
    // Chọn ghế
    selectedSeats.push(seatNumber);
    seatElement.classList.add('seat-selected');
  }

  updateSelectedSeatsDisplay();
}

// Cập nhật hiển thị ghế đã chọn
function updateSelectedSeatsDisplay() {
  const display = document.getElementById('selectedSeats');
  if (selectedSeats.length === 0) {
    display.textContent = 'Chưa chọn ghế nào';
  } else {
    display.textContent = selectedSeats.join(', ');
  }
}

// Bán vé
async function sellTickets() {
  if (selectedSeats.length === 0) {
    alert('Vui lòng chọn ít nhất một ghế');
    return;
  }

  if (!confirm(`Xác nhận bán ${selectedSeats.length} vé cho ghế: ${selectedSeats.join(', ')}?`)) {
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
        seats: selectedSeats
      })
    });

    const result = await response.json();

    if (result.success) {
      alert(result.message);
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