const express = require('express');
const router = express.Router();
const { Order, User } = require('../models');
const qpayService = require('../services/qpay');

// ==================== QPAY CALLBACK ENDPOINT ====================
router.post('/callback', async (req, res) => {
  try {
    console.log('📥 QPay callback ирлээ:', JSON.stringify(req.body, null, 2));

    const callbackData = req.body;
    
    // Callback баталгаажуулах
    const isValid = qpayService.verifyCallback(callbackData);
    
    if (!isValid) {
      console.log('❌ Invalid callback data');
      return res.sendStatus(400);
    }

    const { 
      object_id,           // Invoice ID
      payment_status,
      payment_amount,
      sender_invoice_no,   // Бидний order ID
      payment_id,
      payment_date
    } = callbackData;

    console.log(`💰 Payment callback: 
      Order ID: ${sender_invoice_no}
      Invoice ID: ${object_id}
      Status: ${payment_status}
      Amount: ${payment_amount}
    `);

    // Зөвхөн PAID төлбөрийг боловсруулах
    if (payment_status !== 'PAID') {
      console.log(`ℹ️ Payment not PAID: ${payment_status}`);
      return res.sendStatus(200);
    }

    // ORDER ОЛОХ
    const order = await Order.findOne({
      where: { id: sender_invoice_no }
    });

    if (!order) {
      console.error(`❌ Order not found: ${sender_invoice_no}`);
      return res.sendStatus(404);
    }

    // Хэрэв аль хэдийн PAID бол
    if (order.status === 'PAID') {
      console.log(`ℹ️ Order already paid: ${order.id}`);
      return res.sendStatus(200);
    }

    // ДҮН ШАЛГАХ
    const expectedAmount = order.amount;
    const receivedAmount = parseInt(payment_amount);
    
    if (receivedAmount !== expectedAmount) {
      console.error(`❌ Amount mismatch: Expected ${expectedAmount}, Received ${receivedAmount}`);
      return res.sendStatus(400);
    }

    // TRANSACTION ЭХЛҮҮЛЭХ
    const t = await order.sequelize.transaction();

    try {
      // ORDER ШИНЭЧЛЭХ
      await order.update(
        { 
          status: 'PAID',
          qpay_payment_id: payment_id,
          updatedAt: new Date()
        },
        { transaction: t }
      );

      // USER ШИНЭЧЛЭХ
      await User.update(
        {
          is_paid: true,
          paid_at: new Date(payment_date)
        },
        { 
          where: { id: order.user_id },
          transaction: t
        }
      );

      // TRANSACTION COMMIT
      await t.commit();

      console.log(`✅ Payment successful: 
        User: ${order.user_id}
        Order: ${order.id}
        Amount: ${payment_amount}₮
        Date: ${new Date(payment_date).toISOString()}
      `);

      // АМЖИЛТТАЙ ХАРИУ
      res.json({ 
        success: true,
        message: 'Callback processed successfully'
      });

    } catch (transactionError) {
      // TRANSACTION ROLLBACK
      await t.rollback();
      console.error('❌ Transaction error:', transactionError);
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Callback processing error:', error);
    
    // QPay callback-д алдааны мэдээлэл илгээхгүй (зөвхөн статус)
    res.sendStatus(500);
  }
});

// ==================== CALLBACK TEST ENDPOINT ====================
router.get('/callback-test', (req, res) => {
  // QPay callback тест хийх endpoint
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>QPay Callback Test</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        form { max-width: 500px; }
        input, button { display: block; margin: 10px 0; padding: 10px; width: 100%; }
      </style>
    </head>
    <body>
      <h1>QPay Callback Test</h1>
      <form action="/api/qpay/callback" method="POST">
        <input type="text" name="object_id" placeholder="object_id (Invoice ID)" value="TEST_INV_123">
        <input type="text" name="object_type" placeholder="object_type" value="INVOICE">
        <input type="text" name="payment_status" placeholder="payment_status" value="PAID">
        <input type="text" name="payment_amount" placeholder="payment_amount" value="49900">
        <input type="text" name="sender_invoice_no" placeholder="sender_invoice_no (Order ID)" value="1">
        <input type="text" name="payment_id" placeholder="payment_id" value="TEST_PAY_123">
        <input type="text" name="payment_date" placeholder="payment_date" value="${new Date().toISOString()}">
        <button type="submit">Send Test Callback</button>
      </form>
    </body>
    </html>
  `);
});

module.exports = router;