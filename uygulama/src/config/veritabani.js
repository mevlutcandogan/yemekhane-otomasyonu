const mysql = require('mysql2/promise');

const ortakAyarlar = {
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_KULLANICI || 'yemekhane_app',
  password: process.env.DB_SIFRE || 'Uyg_2026',
  database: process.env.DB_ADI || 'yemekhane',
  charset: 'utf8mb4',
  timezone: '+03:00',
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10
};

// Yazma, stored procedure ve rezervasyon sonrası anlık bakiye okuması
const yazmaHavuzu = mysql.createPool({
  ...ortakAyarlar,
  host: process.env.DB_YAZMA_HOST || 'mysql-primary'
});

// Listeleme ve raporlama sorguları (salt okunur replika)
const okumaHavuzu = mysql.createPool({
  ...ortakAyarlar,
  host: process.env.DB_OKUMA_HOST || 'mysql-replica'
});

module.exports = { yazmaHavuzu, okumaHavuzu };