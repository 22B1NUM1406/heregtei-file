const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Бүртгүүлэх
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email болон password оруулна уу' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email бүртгэлтэй байна' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword
    });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        is_paid: user.is_paid
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Бүртгэл амжилтгүй' });
  }
});

// Нэвтрэх
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Email эсвэл password буруу' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Email эсвэл password буруу' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        is_paid: user.is_paid
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Нэвтрэх амжилтгүй' });
  }
});

module.exports = router;