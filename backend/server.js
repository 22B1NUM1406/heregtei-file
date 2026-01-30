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

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// SQLite Database
const dbPath = './database.db';
const db = new sqlite3.Database(dbPath);

// Database Setup
db.serialize(() => {
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
      console.log('✅ Database бэлэн боллоо:', dbPath);
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

      console.log(`✅ Шинэ захиалга: ${orderId}`);

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
          amount: 50000
        }
      });
    }
  );
});

// 2. Захиалгын төлөв шалгах
app.get('/api/orders/:orderId', (req, res) => {
  const { orderId } = req.params;
  
  console.log(`🔍 Захиалга шалгаж байна: ${orderId}`);

  db.get(
    `SELECT * FROM orders WHERE order_id = ?`,
    [orderId],
    (err, order) => {
      if (err) {
        console.error('❌ Database алдаа:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Алдаа гарлаа' 
        });
      }

      if (!order) {
        console.log(`❌ Захиалга олдсонгүй: ${orderId}`);
        return res.status(404).json({ 
          success: false,
          error: 'Захиалга олдсонгүй' 
        });
      }

      console.log(`✅ Захиалга олдлоо: ${orderId}, verified: ${order.payment_verified}`);

      res.json({
        success: true,
        order_id: order.order_id,
        status: order.status,
        payment_verified: order.payment_verified || 0,
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

// 3. Файл татах
app.get('/api/download/:orderId', (req, res) => {
  const { orderId } = req.params;

  db.get(
    `SELECT * FROM orders WHERE order_id = ? AND payment_verified = 1`,
    [orderId],
    (err, order) => {
      if (err || !order) {
        return res.status(403).json({ 
          success: false,
          error: 'Татах эрхгүй байна. Төлбөр баталгаажаагүй байна.' 
        });
      }

      const filePath = path.join(__dirname, 'files', 'financial-templates.zip');
      
      res.download(filePath, `Хэрэгтэй-Файл-${order.order_id}.zip`, (err) => {
        if (err) {
          console.error('Download error:', err);
          res.status(500).json({ 
            success: false,
            error: 'Файл татахад алдаа гарлаа' 
          });
        } else {
          console.log(`📥 Файл татагдлаа: ${orderId}`);
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
      console.error('❌ Admin orders алдаа:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Алдаа гарлаа' 
      });
    }
    res.json({ 
      success: true,
      orders 
    });
  });
});

// 5. Захиалгыг баталгаажуулах
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

      console.log(`✅ Амжилттай баталгаажлаа: ${orderId}`);
      
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

  console.log(`❌ Татгалзаж байна: ${orderId}`);

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
        console.error('❌ Reject алдаа:', err);
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

      console.log(`✅ Захиалга татгалзлаа: ${orderId}`);
      
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
        return res.status(500).json({ 
          success: false,
          error: 'Алдаа гарлаа' 
        });
      }
      res.json({ 
        success: true,
        stats: stats[0] 
      });
    }
  );
});

// 8. Admin profile
app.get('/api/admin/profile', (req, res) => {
  res.json({
    success: true,
    message: 'Admin authenticated'
  });
});

// 9. Admin users list
app.get('/api/admin/users', (req, res) => {
  res.json({
    success: true,
    admins: []
  });
});

// 10. Add admin user
app.post('/api/admin/users', (req, res) => {
  res.json({
    success: true,
    message: 'Admin added'
  });
});

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Серверийн алдаа гарлаа'
  });
});

// ==================== SERVER START ====================

app.listen(PORT, () => {
  console.log(`\n🚀 Сервер эхэллээ: http://localhost:${PORT}`);
  console.log(`📅 Огноо: ${new Date().toLocaleString('mn-MN')}`);
  console.log(`🌍 Орчин: ${process.env.NODE_ENV || 'development'}`);
  
  console.log(`\n📊 API эндпоинтууд:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /api/orders - Захиалга үүсгэх`);
  console.log(`   GET  /api/orders/:id - Төлөв шалгах`);
  console.log(`   GET  /api/download/:id - Файл татах`);
  console.log(`   GET  /api/admin/orders - Админ: захиалгууд`);
  console.log(`   GET  /api/admin/stats - Админ: статистик`);
  console.log(`   POST /api/admin/orders/:id/verify - Админ: баталгаажуулах`);
  console.log(`   POST /api/admin/orders/:id/reject - Админ: татгалзах`);
  console.log(`\n💰 Төлбөрийн мэдээлэл:`);
  console.log(`   Данс: 5063 3291 06`);
  console.log(`   Банк: Хаан Банк`);
  console.log(`   Дүн: 50,000₮\n`);
  
  console.log(`💡 Development mode: Frontend болон Admin панел тус тусдаа ажиллаж байна`);
  console.log(`   Frontend: npm run dev (Vite)`);
  console.log(`   Admin: npm run dev (Vite)`);
  console.log(`   Backend: nodemon server.js\n`);
});