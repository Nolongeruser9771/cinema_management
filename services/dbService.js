const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db.json');
const bcrypt = require('bcryptjs');

// Hàm tạo hash cho password
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Hàm init demo users với password đúng
async function initDemoUsers() {
  const hash = await hashPassword('123456');
  console.log('Copy hash này vào db.json:');
  console.log(hash);
}

// Khi đổi mật khẩu demo thì call lại hàm này để lấy mật khẩu
// initDemoUsers();

module.exports = {
  loadDb,
  saveDb,
  generateId,
  hashPassword
};

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