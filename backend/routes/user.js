const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

router.get('/me', auth, async (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    is_paid: req.user.is_paid,
    paid_at: req.user.paid_at
  });
});

module.exports = router;