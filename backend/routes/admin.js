const express = require('express');
const router = express.Router();
const { User, Order } = require('../models');

// Admin баталгаажуулалт (энгийн)
const isAdmin = (req, res, next) => {
  const adminPassword = req.headers['x-admin-password'];
  if (adminPassword === process.env.ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Админ эрхгүй' });
  }
};

// Бүх хэрэглэгчийн жагсаалт
router.get('/users', isAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'phone', 'is_paid', 'paid_at', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Алдаа гарлаа' });
  }
});

// Хэрэглэгч хайх
router.get('/users/search', isAdmin, async (req, res) => {
  try {
    const { phone } = req.query;
    
    const users = await User.findAll({
      where: {
        phone: { [Op.like]: `%${phone}%` }
      },
      attributes: ['id', 'phone', 'is_paid', 'paid_at', 'createdAt']
    });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Алдаа гарлаа' });
  }
});

// Хэрэглэгчийг premium болгох
router.post('/users/:userId/activate', isAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Хэрэглэгч олдсонгүй' });
    }
    
    await user.update({
      is_paid: true,
      paid_at: new Date()
    });
    
    res.json({ 
      success: true, 
      message: 'Premium эрх идэвхжлээ',
      user: {
        id: user.id,
        phone: user.phone,
        is_paid: user.is_paid,
        paid_at: user.paid_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Алдаа гарлаа' });
  }
});

// Хэрэглэгчийн premium эрх устгах
router.post('/users/:userId/deactivate', isAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Хэрэглэгч олдсонгүй' });
    }
    
    await user.update({
      is_paid: false,
      paid_at: null
    });
    
    res.json({ 
      success: true, 
      message: 'Premium эрх устгалаа'
    });
  } catch (error) {
    res.status(500).json({ error: 'Алдаа гарлаа' });
  }
});

module.exports = router;