const express = require('express');
const router = express.Router();
const { Order, User } = require('../models');
const auth = require('../middleware/auth');
const qpayService = require('../services/qpay');

// ==================== 1. ТӨЛБӨР ҮҮСГЭХ ====================
router.post('/buy', auth, async (req, res) => {
  try {
    console.log(`🛒 Purchase request from: ${req.user.email}`);
    
    // Хэрэглэгч аль хэдийн premium бол
    if (req.user.is_paid) {
      return res.status(400).json({ 
        success: false,
        error: 'Та аль хэдийн худалдан авсан байна',
        message: 'Та premium эрхтэй байна. Файлаа шууд татаж авна уу.'
      });
    }

    // Идэвхтэй PENDING order шалгах
    let order = await Order.findOne({
      where: { 
        user_id: req.user.id, 
        status: 'PENDING' 
      }
    });

    // Хэрэв PENDING order байгаа бол түүнийг ашиглах
    if (order && order.qpay_invoice_id) {
      console.log(`📋 Existing PENDING order found: ${order.id}`);
      
      // Төлбөрийн статус шалгах
      const paymentStatus = await qpayService.checkPayment(order.qpay_invoice_id);
      
      if (paymentStatus.paid) {
        // Төлбөр хийгдсэн бол шинэчлэх
        await processSuccessfulPayment(order);
        return res.json({
          success: true,
          already_paid: true,
          message: 'Төлбөр аль хэдийн төлөгдсөн байна',
          redirect_to_download: true
        });
      }
      
      // Хэрэв төлөгдөөгүй бол тухайн invoice-ыг буцаах
      const invoice = await qpayService.createInvoice({
        orderId: order.id,
        amount: order.amount,
        description: `Файл багц - Захиалга #${order.id}`
      });
      
      return res.json({
        success: true,
        order_id: order.id,
        qr_image: invoice.qr_image,
        qr_text: invoice.qr_text,
        urls: invoice.urls,
        invoice_id: invoice.invoice_id,
        is_test: invoice.is_test || false,
        message: 'Өмнөх захиалга байна. QR кодыг дахин ашиглана уу.'
      });
    }

    // ШИНЭ ORDER ҮҮСГЭХ
    order = await Order.create({
      user_id: req.user.id,
      amount: 49900, // 49,900₮
      status: 'PENDING'
    });

    console.log(`✅ Order created: ${order.id}`);

    // QPAY INVOICE ҮҮСГЭХ
    const invoice = await qpayService.createInvoice({
      orderId: order.id,
      amount: order.amount,
      description: `Heregtei Files Premium Pack - Захиалга #${order.id}`
    });

    // ORDER-Д INVOICE ID ХАДГАЛАХ
    await order.update({ 
      qpay_invoice_id: invoice.invoice_id 
    });

    console.log(`🎫 Invoice created: ${invoice.invoice_id}`);

    // RESPONSE
    res.json({
      success: true,
      order_id: order.id,
      qr_image: invoice.qr_image,
      qr_text: invoice.qr_text,
      qr_data: invoice.qr_data,
      urls: invoice.urls,
      invoice_id: invoice.invoice_id,
      is_test: invoice.is_test || false,
      amount: order.amount,
      message: 'QR кодыг уншуулж төлбөрөө төлнө үү'
    });

  } catch (error) {
    console.error('❌ Purchase error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Төлбөр үүсгэхэд алдаа гарлаа',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ==================== 2. ТӨЛБӨРИЙН СТАТУС ШАЛГАХ ====================
router.get('/order/:orderId/status', auth, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    
    console.log(`🔍 Status check for order: ${orderId}, user: ${req.user.email}`);

    const order = await Order.findOne({
      where: { 
        id: orderId,
        user_id: req.user.id 
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Захиалга олдсонгүй',
        message: 'Захиалгын дугаар буруу байна.'
      });
    }

    // Хэрэв аль хэдийн PAID бол
    if (order.status === 'PAID') {
      return res.json({
        success: true,
        status: 'PAID',
        paid_at: order.updatedAt,
        message: 'Төлбөр аль хэдийн төлөгдсөн'
      });
    }

    // QPay-с төлбөрийн статус шалгах
    if (order.qpay_invoice_id) {
      const paymentStatus = await qpayService.checkPayment(order.qpay_invoice_id);
      
      if (paymentStatus.paid) {
        console.log(`💰 Payment confirmed for order: ${order.id}`);
        
        // Төлбөр амжилттай болсон
        await processSuccessfulPayment(order);
        
        return res.json({
          success: true,
          status: 'PAID',
          paid_at: new Date(),
          message: 'Төлбөр амжилттай төлөгдлөө!'
        });
      }
    }

    // Төлбөр төлөгдөөгүй бол
    res.json({
      success: true,
      status: order.status,
      invoice_id: order.qpay_invoice_id,
      message: 'Төлбөр хүлээгдэж байна'
    });

  } catch (error) {
    console.error('❌ Status check error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Статус шалгах амжилтгүй',
      message: error.message
    });
  }
});

// ==================== 3. ТӨЛБӨР ЦУЦЛАХ ====================
router.post('/order/:orderId/cancel', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { 
        id: req.params.orderId,
        user_id: req.user.id 
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Захиалга олдсонгүй' });
    }

    if (order.status === 'PAID') {
      return res.status(400).json({ error: 'Төлбөр аль хэдийн төлөгдсөн' });
    }

    // QPay invoice устгах
    if (order.qpay_invoice_id) {
      await qpayService.cancelInvoice(order.qpay_invoice_id);
    }

    // Order статус өөрчлөх
    await order.update({ status: 'CANCELLED' });

    res.json({
      success: true,
      message: 'Захиалга цуцлагдлаа'
    });

  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ error: 'Цуцлах амжилтгүй' });
  }
});

// ==================== HELPER FUNCTIONS ====================
async function processSuccessfulPayment(order) {
  const t = await order.sequelize.transaction();
  
  try {
    // Order статус өөрчлөх
    await order.update({ 
      status: 'PAID',
      updatedAt: new Date()
    }, { transaction: t });

    // Хэрэглэгчийг premium болгох
    await User.update(
      {
        is_paid: true,
        paid_at: new Date()
      },
      {
        where: { id: order.user_id },
        transaction: t
      }
    );

    await t.commit();
    
    console.log(`🎉 Payment processed: User ${order.user_id}, Order ${order.id}`);
    
  } catch (error) {
    await t.rollback();
    console.error('❌ Payment processing error:', error);
    throw error;
  }
}

module.exports = router;