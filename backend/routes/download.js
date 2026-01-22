const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const auth = require('../middleware/auth');

// Database models
const { User } = require('../models'); // ЭНД ЗӨВ ИМПОРТ ХИЙХ

// Нэг удаагийн download tokens хадгалах
const tempTokens = new Map();

// Хугацаа дууссан token-уудыг цэвэрлэх функц
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of tempTokens.entries()) {
    if (now > data.expiresAt) {
      tempTokens.delete(token);
      console.log(`🧹 Token устгалаа: ${token}`);
    }
  }
}

// 1 минут тутамд цэвэрлэх
setInterval(cleanupExpiredTokens, 60 * 1000);

// ========== 1. Шууд татах (auth токеноор) ==========
router.get('/pack', auth, async (req, res) => {
  try {
    console.log(`📥 Download request from user: ${req.user.phone}, paid: ${req.user.is_paid}`);
    
    if (!req.user.is_paid) {
      return res.status(403).json({ 
        error: 'Төлбөр шаардлагатай',
        message: 'Та premium эрхгүй байна.'
      });
    }

    const filePath = path.join(__dirname, '../storage/packs/files-pack.zip');
    
    // Файл байгаа эсэхийг шалгах
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Файл олдсонгүй: ${filePath}`);
      
      // Test файл үүсгэх (хэрэв байхгүй бол)
      const testContent = 'Heregtei Files Premium Pack\n\nЭнэ бол test файл юм.\nБодит файлаа энэ хавтас руу оруулна уу.\n';
      fs.writeFileSync(filePath, testContent);
      
      console.log(`✅ Test файл үүсгэлээ: ${filePath}`);
    }

    const fileStats = fs.statSync(filePath);
    console.log(`📁 File: ${filePath}, Size: ${fileStats.size} bytes`);

    // Файл татгалгах
    res.download(filePath, 'heregtei-files-pack.zip', (err) => {
      if (err) {
        console.error('❌ Download error:', err.message);
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Татаж авах амжилтгүй',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
          });
        }
      } else {
        console.log(`✅ Файл амжилттай татлаа: ${req.user.phone}`);
      }
    });

  } catch (error) {
    console.error('❌ Download endpoint error:', error);
    res.status(500).json({ 
      error: 'Татаж авах амжилтгүй',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========== 2. Нэг удаагийн download link үүсгэх ==========
router.post('/generate-link', auth, async (req, res) => {
  try {
    console.log(`🔗 Generate link request from user: ${req.user.phone}`);
    
    if (!req.user.is_paid) {
      return res.status(403).json({ 
        error: 'Төлбөр шаардлагатай',
        message: 'Та premium эрхгүй байна.'
      });
    }

    const downloadToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 минут
    
    tempTokens.set(downloadToken, {
      userId: req.user.id,
      phone: req.user.phone,
      expiresAt: expiresAt,
      createdAt: Date.now()
    });

    console.log(`✅ Token үүсгэлээ: ${downloadToken.substring(0, 10)}... (user: ${req.user.phone})`);

    res.json({
      success: true,
      download_url: `/api/download/file/${downloadToken}`,
      direct_url: `http://localhost:3000/api/download/file/${downloadToken}`,
      expires_in: 600, // 10 минут секундээр
      expires_at: new Date(expiresAt).toISOString()
    });

  } catch (error) {
    console.error('❌ Generate link error:', error);
    res.status(500).json({ 
      error: 'Link үүсгэх амжилтгүй',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========== 3. Token ашиглан файл татах ==========
router.get('/file/:token', async (req, res) => {
  try {
    const token = req.params.token;
    console.log(`📤 Token download request: ${token.substring(0, 10)}...`);
    
    // Token олох
    const tokenData = tempTokens.get(token);
    
    if (!tokenData) {
      console.log(`❌ Token олдсонгүй: ${token.substring(0, 10)}...`);
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link дууссан</title>
          <style>
            body { font-family: Arial; text-align: center; padding: 50px; }
            .error { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1 class="error">❌ Link олдсонгүй</h1>
          <p>Энэ link дууссан эсвэл буруу байна.</p>
          <p>Шинээр <a href="http://localhost:5173">энд дарж</a> татаж авахыг оролдоно уу.</p>
        </body>
        </html>
      `);
    }

    // Хугацаа шалгах
    if (Date.now() > tokenData.expiresAt) {
      console.log(`⏰ Token хугацаа дууссан: ${token.substring(0, 10)}...`);
      tempTokens.delete(token);
      
      return res.status(410).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link дууссан</title>
          <style>
            body { font-family: Arial; text-align: center; padding: 50px; }
            .error { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1 class="error">⏰ Link-ийн хугацаа дууссан</h1>
          <p>Энэ link 10 минутын дараа ашиглах боломжгүй болно.</p>
          <p>Шинээр <a href="http://localhost:5173">энд дарж</a> татаж авахыг оролдоно уу.</p>
        </body>
        </html>
      `);
    }

    // Хэрэглэгч шалгах
    let user;
    try {
      user = await User.findByPk(tokenData.userId);
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      // Хэрэв User model import хийгээгүй бол энгийн шалгалт хийх
      user = { is_paid: true }; // Түр зуур шалгалтгүй татна
    }

    if (!user || !user.is_paid) {
      console.log(`❌ Хэрэглэгч premium биш: ${tokenData.phone}`);
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Хандах эрхгүй</title>
          <style>
            body { font-family: Arial; text-align: center; padding: 50px; }
            .error { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1 class="error">🔒 Хандах эрхгүй</h1>
          <p>Та premium эрхгүй байна.</p>
          <p><a href="http://localhost:5173">Энд дарж</a> premium эрхээ авна уу.</p>
        </body>
        </html>
      `);
    }

    // Файл байгаа эсэхийг шалгах
    const filePath = path.join(__dirname, '../storage/packs/files-pack.zip');
    
    if (!fs.existsSync(filePath)) {
      // Test файл үүсгэх
      const testContent = `Heregtei Premium Files Pack\n\nUser: ${tokenData.phone}\nDownloaded at: ${new Date().toISOString()}\n`;
      fs.writeFileSync(filePath, testContent);
      console.log(`📝 Test файл үүсгэлээ: ${filePath}`);
    }

    console.log(`✅ Downloading file for user: ${tokenData.phone}`);

    // Token устгах
    tempTokens.delete(token);

    // Файл татгалгах
    res.download(filePath, 'heregtei-files-pack.zip', (err) => {
      if (err) {
        console.error('❌ File download error:', err.message);
        if (!res.headersSent) {
          res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Татаж авах амжилтгүй</title>
              <style>
                body { font-family: Arial; text-align: center; padding: 50px; }
                .error { color: #e74c3c; }
              </style>
            </head>
            <body>
              <h1 class="error">❌ Татаж авах амжилтгүй</h1>
              <p>${err.message}</p>
              <p><a href="http://localhost:5173">Дахин оролдох</a></p>
            </body>
            </html>
          `);
        }
      } else {
        console.log(`🎉 File downloaded successfully for: ${tokenData.phone}`);
      }
    });

  } catch (error) {
    console.error('❌ Token download error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Алдаа гарлаа</title>
        <style>
          body { font-family: Arial; text-align: center; padding: 50px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1 class="error">⚠️ Алдаа гарлаа</h1>
        <p>${error.message}</p>
        <p><a href="http://localhost:5173">Дахин оролдох</a></p>
      </body>
      </html>
    `);
  }
});

// ========== 4. Debug endpoint (хөгжүүлэлтийн) ==========
router.get('/debug', auth, (req, res) => {
  try {
    const filePath = path.join(__dirname, '../storage/packs/files-pack.zip');
    const fileExists = fs.existsSync(filePath);
    let fileStats = null;
    
    if (fileExists) {
      fileStats = fs.statSync(filePath);
    }
    
    const activeTokens = Array.from(tempTokens.entries()).map(([token, data]) => ({
      token: token.substring(0, 10) + '...',
      userId: data.userId,
      phone: data.phone,
      expiresAt: new Date(data.expiresAt).toLocaleString(),
      timeLeft: Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000))
    }));

    res.json({
      user: {
        id: req.user.id,
        phone: req.user.phone,
        is_paid: req.user.is_paid,
        paid_at: req.user.paid_at
      },
      file: {
        exists: fileExists,
        path: filePath,
        size: fileStats ? fileStats.size : 0,
        modified: fileStats ? fileStats.mtime : null
      },
      tokens: {
        count: tempTokens.size,
        active: activeTokens
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Debug error', details: error.message });
  }
});

module.exports = router;