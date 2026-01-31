import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://bat-marketing.vercel.app',  // Vercel URL нэмэх
    'https://your-custom-domain.com' // Custom domain (хэрэв байвал)
  ],
  credentials: true
}));
app.use(express.json());

// ==================== SQLite Database ====================

const dbDir = process.env.NODE_ENV === 'production' ? '/data' : path.join(__dirname, 'database');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ SQLite холболт алдаа:', err);
  } else {
    console.log('✅ SQLite connected:', dbPath);
  }
});

// Database Setup
db.serialize(() => {
  // Users хүснэгт
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      is_verified INTEGER DEFAULT 0,
      is_premium INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      verified_at DATETIME,
      verified_by TEXT
    )
  `, (err) => {
    if (err) console.error('❌ Users хүснэгт үүсгэх алдаа:', err);
    else console.log('✅ Users хүснэгт бэлэн');
  });

  // Purchase requests хүснэгт
  db.run(`
    CREATE TABLE IF NOT EXISTS purchase_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      request_id TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'pending',
      amount INTEGER DEFAULT 50000,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      verified_at DATETIME,
      verified_by TEXT,
      admin_notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('❌ Purchase requests хүснэгт үүсгэх алдаа:', err);
    else console.log('✅ Purchase requests хүснэгт бэлэн');
  });

  // Admin хүснэгт
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, async (err) => {
    if (err) {
      console.error('❌ Admins хүснэгт үүсгэх алдаа:', err);
    } else {
      console.log('✅ Admins хүснэгт бэлэн');
      
      // Default admin үүсгэх (хэрэв байхгүй бол)
      const hashedPassword = await bcrypt.hash('admin123', 10);
      db.run(`
        INSERT OR IGNORE INTO admins (email, password, name) 
        VALUES (?, ?, ?)
      `, ['admin@file.mn', hashedPassword, 'Админ'], (err) => {
        if (err) console.error('❌ Default admin үүсгэх алдаа:', err);
        else console.log('✅ Default admin бүртгэгдлээ');
      });
    }
  });
});

// ==================== MIDDLEWARE ====================

// JWT токен шалгах middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Токен байхгүй байна' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Токен хүчингүй байна' });
    }
    req.user = user;
    next();
  });
};

// Admin токен шалгах middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Токен байхгүй байна' });
  }

  jwt.verify(token, JWT_SECRET, (err, admin) => {
    if (err || !admin.isAdmin) {
      return res.status(403).json({ success: false, error: 'Админ эрх шаардлагатай' });
    }
    req.admin = admin;
    next();
  });
};

// ==================== USER AUTH API ====================

// 1. Бүртгүүлэх
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, phone } = req.body;

  if (!email || !password || !name || !phone) {
    return res.status(400).json({ 
      success: false,
      error: 'Бүх талбарыг бөглөнө үү' 
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO users (email, password, name, phone) VALUES (?, ?, ?, ?)`,
      [email.toLowerCase().trim(), hashedPassword, name.trim(), phone.trim()],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ 
              success: false,
              error: 'Энэ имэйл хаяг аль хэдийн бүртгэлтэй байна' 
            });
          }
          return res.status(500).json({ 
            success: false,
            error: 'Бүртгэлд алдаа гарлаа' 
          });
        }

        const token = jwt.sign({ 
          userId: this.lastID, 
          email: email.toLowerCase().trim(),
          isAdmin: false 
        }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
          success: true,
          token,
          user: {
            id: this.lastID,
            email: email.toLowerCase().trim(),
            name: name.trim(),
            phone: phone.trim(),
            is_premium: 0
          }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Серверийн алдаа' 
    });
  }
});

// 2. Нэвтрэх
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Имэйл болон нууц үгээ оруулна уу' 
    });
  }

  db.get(
    `SELECT * FROM users WHERE email = ?`,
    [email.toLowerCase().trim()],
    async (err, user) => {
      if (err || !user) {
        return res.status(401).json({ 
          success: false,
          error: 'Имэйл эсвэл нууц үг буруу байна' 
        });
      }

      try {
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
          return res.status(401).json({ 
            success: false,
            error: 'Имэйл эсвэл нууц үг буруу байна' 
          });
        }

        const token = jwt.sign({ 
          userId: user.id, 
          email: user.email,
          isAdmin: false 
        }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
          success: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            is_premium: user.is_premium,
            is_verified: user.is_verified
          }
        });
      } catch (error) {
        res.status(500).json({ 
          success: false,
          error: 'Серверийн алдаа' 
        });
      }
    }
  );
});

// 3. Хэрэглэгчийн мэдээлэл авах
app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get(
    `SELECT id, email, name, phone, is_premium, is_verified FROM users WHERE id = ?`,
    [req.user.userId],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ 
          success: false,
          error: 'Хэрэглэгч олдсонгүй' 
        });
      }

      res.json({
        success: true,
        user
      });
    }
  );
});

// ==================== PURCHASE REQUEST API ====================

// 4. Худалдан авалтын хүсэлт үүсгэх
app.post('/api/purchase/request', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const requestId = `REQ${Date.now()}`;

  // Хэрэглэгч аль хэдийн premium эсэхийг шалгах
  db.get(
    `SELECT is_premium FROM users WHERE id = ?`,
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          error: 'Алдаа гарлаа' 
        });
      }

      if (user.is_premium === 1) {
        return res.status(400).json({ 
          success: false,
          error: 'Та аль хэдийн Premium хэрэглэгч байна' 
        });
      }

      // Хүлээгдэж буй хүсэлт байгаа эсэхийг шалгах
      db.get(
        `SELECT * FROM purchase_requests WHERE user_id = ? AND status = 'pending'`,
        [userId],
        (err, existingRequest) => {
          if (existingRequest) {
            return res.json({
              success: true,
              request: {
                request_id: existingRequest.request_id,
                status: existingRequest.status,
                created_at: existingRequest.created_at
              },
              message: 'Таны хүсэлт аль хэдийн илгээгдсэн байна'
            });
          }

          // Шинэ хүсэлт үүсгэх
          db.run(
            `INSERT INTO purchase_requests (user_id, request_id, status, amount) VALUES (?, ?, 'pending', 50000)`,
            [userId, requestId],
            function(err) {
              if (err) {
                return res.status(500).json({ 
                  success: false,
                  error: 'Хүсэлт үүсгэхэд алдаа гарлаа' 
                });
              }

              res.json({
                success: true,
                request: {
                  id: this.lastID,
                  request_id: requestId,
                  status: 'pending',
                  amount: 50000
                }
              });
            }
          );
        }
      );
    }
  );
});

// 5. Хэрэглэгчийн хүсэлтийн төлөв шалгах
app.get('/api/purchase/status', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.get(
    `SELECT pr.*, u.is_premium 
     FROM purchase_requests pr
     JOIN users u ON pr.user_id = u.id
     WHERE pr.user_id = ? 
     ORDER BY pr.created_at DESC 
     LIMIT 1`,
    [userId],
    (err, request) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          error: 'Алдаа гарлаа' 
        });
      }

      if (!request) {
        return res.json({
          success: true,
          has_request: false,
          is_premium: 0
        });
      }

      res.json({
        success: true,
        has_request: true,
        is_premium: request.is_premium,
        request: {
          request_id: request.request_id,
          status: request.status,
          created_at: request.created_at,
          verified_at: request.verified_at,
          admin_notes: request.admin_notes
        }
      });
    }
  );
});

// 6. Файл татах (зөвхөн premium хэрэглэгчид)
app.get('/api/download', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.get(
    `SELECT is_premium, name FROM users WHERE id = ?`,
    [userId],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ 
          success: false,
          error: 'Хэрэглэгч олдсонгүй' 
        });
      }

      if (user.is_premium !== 1) {
        return res.status(403).json({ 
          success: false,
          error: 'Файл татахын тулд админаас баталгаажуулалт авах шаардлагатай' 
        });
      }

      const filePath = path.join(__dirname, 'files', 'financial-templates.zip');
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
          success: false,
          error: 'Файл олдсонгүй' 
        });
      }

      res.download(filePath, `Хэрэгтэй-Файл-${user.name}.zip`, (err) => {
        if (err) {
          console.error('Download error:', err);
          res.status(500).json({ 
            success: false,
            error: 'Файл татахад алдаа гарлаа' 
          });
        }
      });
    }
  );
});

// ==================== ADMIN AUTH API ====================

// 7. Админ нэвтрэх
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Имэйл болон нууц үгээ оруулна уу' 
    });
  }

  db.get(
    `SELECT * FROM admins WHERE email = ?`,
    [email.toLowerCase().trim()],
    async (err, admin) => {
      if (err || !admin) {
        return res.status(401).json({ 
          success: false,
          error: 'Имэйл эсвэл нууц үг буруу байна' 
        });
      }

      try {
        const validPassword = await bcrypt.compare(password, admin.password);
        
        if (!validPassword) {
          return res.status(401).json({ 
            success: false,
            error: 'Имэйл эсвэл нууц үг буруу байна' 
          });
        }

        const token = jwt.sign({ 
          adminId: admin.id, 
          email: admin.email,
          isAdmin: true 
        }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
          success: true,
          token,
          admin: {
            id: admin.id,
            email: admin.email,
            name: admin.name
          }
        });
      } catch (error) {
        res.status(500).json({ 
          success: false,
          error: 'Серверийн алдаа' 
        });
      }
    }
  );
});

// ==================== ADMIN MANAGEMENT API ====================

// 8. Бүх хүсэлтүүдийг харах
app.get('/api/admin/requests', authenticateAdmin, (req, res) => {
  const { status } = req.query;

  let query = `
    SELECT pr.*, u.email, u.name, u.phone, u.is_premium
    FROM purchase_requests pr
    JOIN users u ON pr.user_id = u.id
    ORDER BY pr.created_at DESC
  `;
  const params = [];

  if (status && status !== 'all') {
    query = `
      SELECT pr.*, u.email, u.name, u.phone, u.is_premium
      FROM purchase_requests pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.status = ?
      ORDER BY pr.created_at DESC
    `;
    params.push(status);
  }

  db.all(query, params, (err, requests) => {
    if (err) {
      return res.status(500).json({ 
        success: false,
        error: 'Алдаа гарлаа' 
      });
    }
    res.json({ success: true, requests });
  });
});

// 9. Хүсэлтийг баталгаажуулах
app.post('/api/admin/requests/:requestId/verify', authenticateAdmin, (req, res) => {
  const { requestId } = req.params;
  const { notes } = req.body;
  const adminEmail = req.admin.email;

  console.log(`🔍 Баталгаажуулах гэж байна: ${requestId}`);

  // Request-г олох
  db.get(
    `SELECT * FROM purchase_requests WHERE request_id = ?`,
    [requestId],
    (err, request) => {
      if (err || !request) {
        return res.status(404).json({ 
          success: false,
          error: 'Хүсэлт олдсонгүй' 
        });
      }

      // Request-г approved болгох
      db.run(
        `UPDATE purchase_requests 
         SET status = 'approved', 
             verified_at = CURRENT_TIMESTAMP,
             verified_by = ?,
             admin_notes = ?
         WHERE request_id = ?`,
        [adminEmail, notes || 'Админаар баталгаажсан', requestId],
        function(err) {
          if (err) {
            return res.status(500).json({ 
              success: false,
              error: 'Баталгаажуулахад алдаа гарлаа' 
            });
          }

          // Хэрэглэгчийг premium болгох
          db.run(
            `UPDATE users 
             SET is_premium = 1, 
                 is_verified = 1,
                 verified_at = CURRENT_TIMESTAMP,
                 verified_by = ?
             WHERE id = ?`,
            [adminEmail, request.user_id],
            function(err) {
              if (err) {
                return res.status(500).json({ 
                  success: false,
                  error: 'Premium эрх олгоход алдаа гарлаа' 
                });
              }

              console.log(`✅ Амжилттай баталгаажлаа: ${requestId}`);
              
              res.json({
                success: true,
                message: 'Хүсэлт амжилттай баталгаажлаа, хэрэглэгч Premium боллоо'
              });
            }
          );
        }
      );
    }
  );
});

// 10. Хүсэлтийг татгалзах
app.post('/api/admin/requests/:requestId/reject', authenticateAdmin, (req, res) => {
  const { requestId } = req.params;
  const { reason } = req.body;
  const adminEmail = req.admin.email;

  db.run(
    `UPDATE purchase_requests 
     SET status = 'rejected',
         verified_at = CURRENT_TIMESTAMP,
         verified_by = ?,
         admin_notes = ?
     WHERE request_id = ?`,
    [adminEmail, reason || 'Татгалзсан', requestId],
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
          error: 'Хүсэлт олдсонгүй' 
        });
      }

      console.log(`❌ Хүсэлт татгалзлаа: ${requestId}`);
      
      res.json({
        success: true,
        message: 'Хүсэлт татгалзлаа'
      });
    }
  );
});

// 11. Статистик
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
  db.all(
    `SELECT 
      COUNT(*) as total_requests,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_requests,
      (SELECT COUNT(*) FROM users WHERE is_premium = 1) as premium_users,
      (SELECT COUNT(*) FROM users) as total_users,
      SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_revenue
    FROM purchase_requests`,
    [],
    (err, stats) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          error: 'Алдаа гарлаа' 
        });
      }
      res.json({ success: true, stats: stats[0] });
    }
  );
});

// ==================== SERVER START ====================

app.listen(PORT, () => {
  console.log(`\n🚀 Сервер эхэллээ: http://localhost:${PORT}`);
  console.log(`\n📊 API эндпоинтууд:`);
  console.log(`\n👤 User Auth:`);
  console.log(`   POST /api/auth/register - Бүртгүүлэх`);
  console.log(`   POST /api/auth/login - Нэвтрэх`);
  console.log(`   GET /api/auth/me - Хэрэглэгчийн мэдээлэл`);
  console.log(`\n💰 Purchase:`);
  console.log(`   POST /api/purchase/request - Худалдан авалтын хүсэлт`);
  console.log(`   GET /api/purchase/status - Хүсэлтийн төлөв`);
  console.log(`   GET /api/download - Файл татах (Premium)`);
  console.log(`\n🔐 Admin:`);
  console.log(`   POST /api/admin/login - Админ нэвтрэх`);
  console.log(`   GET /api/admin/requests - Хүсэлтүүд харах`);
  console.log(`   POST /api/admin/requests/:id/verify - Баталгаажуулах`);
  console.log(`   POST /api/admin/requests/:id/reject - Татгалзах`);
  console.log(`   GET /api/admin/stats - Статистик`);
  console.log(`\n💰 Default admin:`);
  console.log(`   Email: admin@file.mn`);
  console.log(`   Password: admin123\n`);
});