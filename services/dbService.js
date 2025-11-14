const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db.json');

// Đọc dữ liệu từ db.json
function loadDb() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Lỗi khi đọc db.json:', error);
    return null;
  }
}

// Lưu dữ liệu vào db.json
function saveDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Lỗi khi lưu db.json:', error);
    return false;
  }
}

// Hàm tạo ID ngẫu nhiên
function generateId(prefix = '') {
  return prefix + Date.now() + Math.random().toString(36).substr(2, 9);
}

module.exports = {
  loadDb,
  saveDb,
  generateId
};