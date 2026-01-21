const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize } = require('./models');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const purchaseRoutes = require('./routes/purchase');
const qpayRoutes = require('./routes/qpay');  // ШИНЭ
const downloadRoutes = require('./routes/download');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// QPay callback-д зориулсан raw body (optional)
app.use('/api/qpay/callback', express.raw({ type: 'application/json' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/qpay', qpayRoutes);  // ШИНЭ
app.use('/api/download', downloadRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Heregtei File API ажиллаж байна',
    version: '1.0.0',
    qpay_integration: true,
    environment: process.env.NODE_ENV || 'development'
  });
});

// QPay configuration check
app.get('/qpay-config', (req, res) => {
  const config = {
    username_set: !!process.env.QPAY_USERNAME,
    invoice_code_set: !!process.env.QPAY_INVOICE_CODE,
    base_url: process.env.QPAY_BASE_URL || 'https://merchant.qpay.mn/v2',
    is_sandbox: (process.env.QPAY_BASE_URL || '').includes('sandbox'),
    callback_url: `${process.env.API_URL || 'http://localhost:3000'}/api/qpay/callback`
  };
  
  res.json(config);
});

// Start server
const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true }).then(() => {
  console.log('✅ Database холбогдлоо');
  
  app.listen(PORT, () => {
    console.log(`🚀 Server http://localhost:${PORT} дээр ажиллаж байна`);
    console.log(`🔗 QPay Callback URL: ${process.env.API_URL || 'http://localhost:3000'}/api/qpay/callback`);
    
    // QPay configuration log
    const qpayConfig = {
      username: process.env.QPAY_USERNAME ? '✅ Set' : '❌ Missing',
      invoiceCode: process.env.QPAY_INVOICE_CODE ? '✅ Set' : '❌ Missing',
      mode: process.env.QPAY_BASE_URL?.includes('sandbox') ? '🟡 Sandbox' : '🟢 Production'
    };
    
    console.log('📋 QPay Configuration:');
    console.log(`   Username: ${qpayConfig.username}`);
    console.log(`   Invoice Code: ${qpayConfig.invoiceCode}`);
    console.log(`   Mode: ${qpayConfig.mode}`);
  });
}).catch(err => {
  console.error('❌ Database алдаа:', err);
});