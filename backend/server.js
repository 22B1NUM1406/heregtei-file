// server.js - Express Backend
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key-change-this'; // Энэ заавал өөрчил!

// Middleware
app.use(cors());
app.use(express.json());

// SQLite Database
const db = new sqlite3.Database('./database.db');

// Database Setup
db.serialize(() => {
  // Захиалгын хүснэгт
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      amount INTEGER DEFAULT 49900,
      status TEXT DEFAULT 'pending',
      payment_verified BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME,
      verified_by TEXT
    )
  `);

  // Админы хүснэгт (төлбөр баталгаажуулах)
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Анхны админ үүсгэх (username: admin, password: admin123)
  const defaultAdminPassword = bcrypt.hashSync('admin123', 10);
  db.run(
    `INSERT OR IGNORE INTO admins (username, password_hash) VALUES (?, ?)`,
    ['admin', defaultAdminPassword]
  );
});

// ==================== PUBLIC API ====================

// 1. Захиалга үүсгэх
app.post('/api/orders', (req, res) => {
  const { name, phone, email } = req.body;

  if (!name || !phone || !email) {
    return res.status(400).json({ error: 'Бүх талбарыг бөглөнө үү' });
  }

  const orderId = `ORD${Date.now()}`;

  db.run(
    `INSERT INTO orders (order_id, name, phone, email) VALUES (?, ?, ?, ?)`,
    [orderId, name, phone, email],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Захиалга үүсгэхэд алдаа гарлаа' });
      }

      res.json({
        success: true,
        order: {
          id: this.lastID,
          order_id: orderId,
          name,
          phone,
          email,
          amount: 49900,
          status: 'pending',
          bank_info: {
            accountNumber: '5456 7890 1234 5678',
            bank: 'Хас Банк',
            accountName: 'Хэрэгтэй Файл ХХК',
            amount: '49,900₮',
            reference: orderId
          }
        }
      });
    }
  );
});

// 2. Захиалгын төлөв шалгах
app.get('/api/orders/:orderId', (req, res) => {
  const { orderId } = req.params;

  db.get(
    `SELECT * FROM orders WHERE order_id = ?`,
    [orderId],
    (err, order) => {
      if (err || !order) {
        return res.status(404).json({ error: 'Захиалга олдсонгүй' });
      }

      res.json({
        order_id: order.order_id,
        status: order.status,
        payment_verified: Boolean(order.payment_verified),
        paid_at: order.paid_at,
        name: order.name,
        email: order.email,
        phone: order.phone
      });
    }
  );
});

// 3. Файл татах (Төлбөр төлсөн хэрэглэгчид зориулсан)
app.get('/api/download/:orderId', (req, res) => {
  const { orderId } = req.params;

  db.get(
    `SELECT * FROM orders WHERE order_id = ? AND payment_verified = 1`,
    [orderId],
    (err, order) => {
      if (err || !order) {
        return res.status(403).json({ error: 'Татах эрхгүй байна' });
      }

      // Файлын замыг энд тохируулна
      const filePath = path.join(__dirname, 'files', 'financial-templates.zip');
      
      res.download(filePath, 'Хэрэгтэй-Файл-Багц.zip', (err) => {
        if (err) {
          res.status(500).json({ error: 'Файл татахад алдаа гарлаа' });
        }
      });
    }
  );
});

// ==================== ADMIN API ====================

// Админ нэвтрэх
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;

  db.get(
    `SELECT * FROM admins WHERE username = ?`,
    [username],
    (err, admin) => {
      if (err || !admin) {
        return res.status(401).json({ error: 'Хэрэглэгчийн нэр эсвэл нууц үг буруу' });
      }

      const validPassword = bcrypt.compareSync(password, admin.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Хэрэглэгчийн нэр эсвэл нууц үг буруу' });
      }

      const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, {
        expiresIn: '24h'
      });

      res.json({
        success: true,
        token,
        admin: { id: admin.id, username: admin.username }
      });
    }
  );
});

// Админ эрх шалгах middleware
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Нэвтрэх шаардлагатай' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Токен хүчингүй байна' });
  }
};

// Бүх захиалга харах (АДМИН)
app.get('/api/admin/orders', authenticateAdmin, (req, res) => {
  const { status } = req.query;

  let query = `SELECT * FROM orders ORDER BY created_at DESC`;
  const params = [];

  if (status) {
    query = `SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC`;
    params.push(status);
  }

  db.all(query, params, (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Алдаа гарлаа' });
    }

    res.json({ orders });
  });
});

// Төлбөр баталгаажуулах (АДМИН)
app.post('/api/admin/orders/:orderId/verify', authenticateAdmin, (req, res) => {
  const { orderId } = req.params;
  const adminUsername = req.admin.username;

  db.run(
    `UPDATE orders 
     SET payment_verified = 1, 
         status = 'paid', 
         paid_at = CURRENT_TIMESTAMP,
         verified_by = ?
     WHERE order_id = ?`,
    [adminUsername, orderId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Баталгаажуулахад алдаа гарлаа' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Захиалга олдсонгүй' });
      }

      // И-мэйл илгээх (опциональ)
      db.get(`SELECT * FROM orders WHERE order_id = ?`, [orderId], (err, order) => {
        if (order) {
          console.log(`✅ Төлбөр баталгаажлаа: ${order.email} - ${orderId}`);
          // TODO: И-мэйл илгээх (nodemailer ашиглана)
        }
      });

      res.json({
        success: true,
        message: 'Төлбөр амжилттай баталгаажлаа'
      });
    }
  );
});

// Төлбөр татгалзах (АДМИН)
app.post('/api/admin/orders/:orderId/reject', authenticateAdmin, (req, res) => {
  const { orderId } = req.params;

  db.run(
    `UPDATE orders SET status = 'rejected' WHERE order_id = ?`,
    [orderId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Алдаа гарлаа' });
      }

      res.json({ success: true, message: 'Захиалгыг татгалзлаа' });
    }
  );
});

// Статистик (АДМИН)
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
  db.all(
    `SELECT 
      COUNT(*) as total_orders,
      SUM(CASE WHEN payment_verified = 1 THEN 1 ELSE 0 END) as paid_orders,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
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

// ==================== WEBHOOK (Банкны API холболт) ====================

// Энэ endpoint-ийг банкны webhook-тэй холбоно
app.post('/api/webhook/bank-notification', (req, res) => {
  const { reference, amount, status, transaction_id } = req.body;

  // Банкны webhook шалгах (security)
  const bankSecret = req.headers['x-bank-secret'];
  if (bankSecret !== 'your-bank-webhook-secret') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (status === 'success' && amount === 49900) {
    db.run(
      `UPDATE orders 
       SET payment_verified = 1, 
           status = 'paid', 
           paid_at = CURRENT_TIMESTAMP,
           verified_by = 'auto-webhook'
       WHERE order_id = ?`,
      [reference],
      function(err) {
        if (err || this.changes === 0) {
          return res.status(404).json({ error: 'Захиалга олдсонгүй' });
        }

        // И-мэйл илгээх
        db.get(`SELECT * FROM orders WHERE order_id = ?`, [reference], (err, order) => {
          if (order) {
            console.log(`✅ Автомат баталгаажлаа: ${order.email} - ${reference}`);
            // TODO: И-мэйл илгээх
          }
        });

        res.json({ success: true });
      }
    );
  } else {
    res.status(400).json({ error: 'Төлбөр амжилтгүй' });
  }
});

// Server эхлүүлэх
app.listen(PORT, () => {
  console.log(`🚀 Server эхэллээ: http://localhost:${PORT}`);
  console.log(`👤 Админ хандах: username=admin, password=admin123`);
});