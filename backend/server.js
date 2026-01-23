import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// SQLite Database
const db = new sqlite3.Database('./database.db');

// Database Setup - ШИНЭЧЛЭЛТ: payment_verified талбар нэмэх
db.serialize(() => {
  // Хуучин хүснэгтийг устгаад шинээр үүсгэх (хөгжүүлэлтийн үед)
  // Эсвэл ALTER TABLE ашиглах (production-д)
  
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      verified_at DATETIME,
      verified_by TEXT,
      notes TEXT,
      payment_verified INTEGER DEFAULT 0,
      amount INTEGER DEFAULT 50000
    )
  `, (err) => {
    if (err) {
      console.error('❌ Хүснэгт үүсгэх алдаа:', err);
    } else {
      console.log('✅ Database бэлэн боллоо');
      
      // payment_verified талбар байгаа эсэхийг шалгаад байхгүй бол нэмэх
      db.run(`
        ALTER TABLE orders ADD COLUMN payment_verified INTEGER DEFAULT 0
      `, (alterErr) => {
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.error('⚠️ ALTER алдаа:', alterErr.message);
        }
      });
    }
  });
});

// ==================== PUBLIC API ====================

// 1. Захиалга үүсгэх
app.post('/api/orders', (req, res) => {
  const { name, phone, email } = req.body;

  if (!name || !phone || !email) {
    return res.status(400).json({ 
      success: false,
      error: 'Бүх талбарыг бөглөнө үү' 
    });
  }

  const orderId = `ORD${Date.now()}`;

  db.run(
    `INSERT INTO orders (order_id, name, phone, email) VALUES (?, ?, ?, ?)`,
    [orderId, name.trim(), phone.trim(), email.trim()],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Захиалга үүсгэхэд алдаа гарлаа' 
        });
      }

      res.json({
        success: true,
        order: {
          id: this.lastID,
          order_id: orderId,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          status: 'pending',
          payment_verified: 0,
          bank_info: {
            accountNumber: '5063 3291 06',
            bank: 'Хаан Банк',
            accountName: 'Түвшинбаяр Энхбаатар',
            amount: '50,000₮',
            reference: 'утасны дугаараа',
            note: 'Гүйлгээний утга дээр ДЭЭРХ УТАСНЫ ДУГААРАА бичнэ үү!'
          }
        }
      });
    }
  );
});

// 2. Захиалгын төлөв шалгах - ШИНЭЧЛЭЛТ
app.get('/api/orders/:orderId', (req, res) => {
  const { orderId } = req.params;

  db.get(
    `SELECT * FROM orders WHERE order_id = ?`,
    [orderId],
    (err, order) => {
      if (err || !order) {
        return res.status(404).json({ 
          success: false,
          error: 'Захиалга олдсонгүй' 
        });
      }

      // ✅ ЧУХАЛ: payment_verified талбарыг заавал буцаах
      res.json({
        success: true,
        order_id: order.order_id,
        status: order.status,
        payment_verified: order.payment_verified || 0, // ✅ Энэ талбар ЗААВАЛ байх ёстой
        name: order.name,
        email: order.email,
        phone: order.phone,
        verified_at: order.verified_at,
        verified_by: order.verified_by,
        notes: order.notes,
        amount: order.amount || 50000
      });
    }
  );
});

// 3. Файл татах - payment_verified шалгах
app.get('/api/download/:orderId', (req, res) => {
  const { orderId } = req.params;

  db.get(
    `SELECT * FROM orders WHERE order_id = ? AND payment_verified = 1`,
    [orderId],
    (err, order) => {
      if (err || !order) {
        return res.status(403).json({ 
          success: false,
          error: 'Татах эрхгүй байна. Админаас зөвшөөрөл аваагүй байна.' 
        });
      }

      const filePath = path.join(__dirname, 'files', 'financial-templates.zip');
      
      res.download(filePath, `Хэрэгтэй-Файл-${order.order_id}.zip`, (err) => {
        if (err) {
          res.status(500).json({ 
            success: false,
            error: 'Файл татахад алдаа гарлаа' 
          });
        }
      });
    }
  );
});

// ==================== ADMIN API ====================

// 4. Бүх захиалга харах
app.get('/api/admin/orders', (req, res) => {
  const { status } = req.query;

  let query = `SELECT * FROM orders ORDER BY created_at DESC`;
  const params = [];

  if (status && status !== 'all') {
    if (status === 'paid') {
      query = `SELECT * FROM orders WHERE payment_verified = 1 ORDER BY created_at DESC`;
    } else if (status === 'pending') {
      query = `SELECT * FROM orders WHERE payment_verified = 0 AND status != 'rejected' ORDER BY created_at DESC`;
    } else {
      query = `SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC`;
      params.push(status);
    }
  }

  db.all(query, params, (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Алдаа гарлаа' });
    }

    res.json({ orders });
  });
});

// 5. Захиалгыг баталгаажуулах (ADMIN) - ✅ ШИНЭЧЛЭЛТ
app.post('/api/admin/orders/:orderId/verify', (req, res) => {
  const { orderId } = req.params;
  const { adminName = 'Админ', notes = 'Админаар баталгаажсан' } = req.body;

  console.log(`🔍 Баталгаажуулах гэж байна: ${orderId}`);

  db.run(
    `UPDATE orders 
     SET status = 'verified', 
         payment_verified = 1,
         verified_at = CURRENT_TIMESTAMP,
         verified_by = ?,
         notes = ?
     WHERE order_id = ?`,
    [adminName, notes, orderId],
    function(err) {
      if (err) {
        console.error('❌ Update алдаа:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Баталгаажуулахад алдаа гарлаа' 
        });
      }

      if (this.changes === 0) {
        console.error('❌ Захиалга олдсонгүй:', orderId);
        return res.status(404).json({ 
          success: false,
          error: 'Захиалга олдсонгүй' 
        });
      }

      console.log(`✅ Амжилттай баталгаажлаа: ${orderId} (${this.changes} өөрчлөлт)`);
      
      res.json({
        success: true,
        message: 'Захиалга амжилттай баталгаажлаа'
      });
    }
  );
});

// 6. Захиалгыг татгалзах
app.post('/api/admin/orders/:orderId/reject', (req, res) => {
  const { orderId } = req.params;
  const { reason, adminName = 'Админ' } = req.body;

  db.run(
    `UPDATE orders 
     SET status = 'rejected',
         payment_verified = 0,
         verified_at = CURRENT_TIMESTAMP,
         verified_by = ?,
         notes = ?
     WHERE order_id = ?`,
    [adminName, reason, orderId],
    function(err) {
      if (err) {
        return res.status(500).json({ 
          success: false,
          error: 'Татгалзахад алдаа гарлаа' 
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Захиалга олдсонгүй' 
        });
      }

      console.log(`❌ Захиалга татгалзлаа: ${orderId}`);
      
      res.json({
        success: true,
        message: 'Захиалга татгалзлаа'
      });
    }
  );
});

// 7. Статистик
app.get('/api/admin/stats', (req, res) => {
  db.all(
    `SELECT 
      COUNT(*) as total_orders,
      SUM(CASE WHEN payment_verified = 1 THEN 1 ELSE 0 END) as paid_orders,
      SUM(CASE WHEN payment_verified = 0 AND status != 'rejected' THEN 1 ELSE 0 END) as pending_orders,
      SUM(CASE WHEN payment_verified = 1 THEN amount ELSE 0 END) as total_revenue
    FROM orders`,
    [],
    (err, stats) => {
      if (err) {
        return res.status(500).json({ error: 'Алдаа гарлаа' });
      }

      res.json({ stats: stats[0] });
    }
  );
});

// ==================== SERVER START ====================

app.listen(PORT, () => {
  console.log(`🚀 Сервер эхэллээ: http://localhost:${PORT}`);
  console.log(`📊 API эндпоинтууд:`);
  console.log(`   POST /api/orders - Захиалга үүсгэх`);
  console.log(`   GET /api/orders/:id - Төлөв шалгах`);
  console.log(`   GET /api/download/:id - Файл татах`);
  console.log(`   GET /api/admin/orders - Админ: бүх захиалга`);
  console.log(`   POST /api/admin/orders/:id/verify - Админ: баталгаажуулах`);
  console.log(`   POST /api/admin/orders/:id/reject - Админ: татгалзах`);
  console.log(`\n💰 Төлбөрийн мэдээлэл:`);
  console.log(`   Данс: 5063 3291 06`);
  console.log(`   Банк: Хаан Банк`);
  console.log(`   Дүн: 50,000₮`);
});