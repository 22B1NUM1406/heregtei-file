const axios = require('axios');

class QPayService {
  constructor() {
    this.baseURL = process.env.QPAY_BASE_URL || 'https://merchant.qpay.mn/v2';
    this.username = process.env.QPAY_USERNAME;
    this.password = process.env.QPAY_PASSWORD;
    this.invoiceCode = process.env.QPAY_INVOICE_CODE;
    this.token = null;
    this.tokenExpiry = null;
    this.callbackURL = `${process.env.API_URL || 'http://localhost:3000'}/api/qpay/callback`;
  }

  // ==================== 1. АUTHENTICATION ====================
  async getToken() {
    try {
      // Хэрэв token хүчинтэй бол буцаах
      if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.token;
      }

      console.log('🔐 QPay authentication хийж байна...');
      
      const response = await axios.post(
        `${this.baseURL}/auth/token`,
        {},
        {
          auth: {
            username: this.username,
            password: this.password
          },
          timeout: 10000
        }
      );

      this.token = response.data.access_token;
      this.tokenExpiry = Date.now() + (50 * 60 * 1000); // 50 минут

      console.log('✅ QPay token авлаа');
      return this.token;

    } catch (error) {
      console.error('❌ QPay auth алдаа:', error.response?.data || error.message);
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('QPay серверт холбогдох боломжгүй. Интернэт холболтоо шалгана уу.');
      }
      
      throw new Error(`QPay authentication амжилтгүй: ${error.response?.data?.message || error.message}`);
    }
  }

  // ==================== 2. INVOICE ҮҮСГЭХ ====================
  async createInvoice(orderData) {
    try {
      const token = await this.getToken();

      const invoiceData = {
        invoice_code: this.invoiceCode,
        sender_invoice_no: orderData.orderId.toString(),
        invoice_receiver_code: 'terminal',
        invoice_description: orderData.description || 'Heregtei File Premium Pack',
        amount: orderData.amount,
        callback_url: this.callbackURL,
        note: `Order ID: ${orderData.orderId}`,
        sender_branch_code: 'HFT_001',
        sender_register_no: 'HFT2024'
      };

      console.log('🧾 QPay invoice үүсгэж байна:', invoiceData);

      const response = await axios.post(
        `${this.baseURL}/invoice`,
        invoiceData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      console.log('✅ Invoice үүслээ:', response.data.invoice_id);

      return {
        success: true,
        invoice_id: response.data.invoice_id,
        qr_text: response.data.qr_text,
        qr_image: response.data.qr_image,
        qr_data: response.data.qr_data,
        urls: response.data.urls || [],
        amount: response.data.amount,
        invoice_no: response.data.invoice_no
      };

    } catch (error) {
      console.error('❌ Invoice үүсгэх алдаа:', error.response?.data || error.message);
      
      // Sandbox mode бол test invoice үүсгэх
      if (this.baseURL.includes('sandbox') || !this.username) {
        console.log('🔄 Sandbox mode - Test invoice үүсгэж байна...');
        return this.createTestInvoice(orderData);
      }
      
      throw new Error(`Invoice үүсгэхэд алдаа гарлаа: ${error.response?.data?.message || error.message}`);
    }
  }

  // ==================== 3. TEST INVOICE (Sandbox) ====================
  createTestInvoice(orderData) {
    const testInvoiceId = `TEST_INV_${Date.now()}`;
    const qrData = `qpay://payment/${testInvoiceId}`;
    
    return {
      success: true,
      invoice_id: testInvoiceId,
      qr_text: qrData,
      qr_image: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`,
      qr_data: qrData,
      urls: [
        {
          name: 'web',
          description: 'Веб',
          link: `https://sandbox.qpay.mn/payment/${testInvoiceId}`,
          logo: 'https://qpay.mn/images/logo.png'
        },
        {
          name: 'deeplink',
          description: 'QPay App',
          link: qrData,
          logo: 'https://qpay.mn/images/logo.png'
        }
      ],
      amount: orderData.amount,
      invoice_no: testInvoiceId,
      is_test: true
    };
  }

  // ==================== 4. PAYMENT CHECK ====================
  async checkPayment(invoiceId) {
    try {
      const token = await this.getToken();

      const response = await axios.post(
        `${this.baseURL}/payment/check`,
        {
          object_type: 'INVOICE',
          object_id: invoiceId
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const isPaid = response.data.count > 0;
      const payments = response.data.rows || [];

      return {
        paid: isPaid,
        payments: payments,
        count: response.data.count
      };

    } catch (error) {
      console.error('❌ Payment check алдаа:', error.response?.data || error.message);
      
      // Sandbox mode бол test төлбөр болгох
      if (this.baseURL.includes('sandbox') || !this.username) {
        console.log('🔄 Sandbox mode - Test payment check');
        return { paid: false, payments: [], count: 0 };
      }
      
      return { paid: false, payments: [], count: 0, error: error.message };
    }
  }

  // ==================== 5. INVOICE УСТГАХ ====================
  async cancelInvoice(invoiceId) {
    try {
      const token = await this.getToken();

      const response = await axios.delete(
        `${this.baseURL}/invoice/${invoiceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('🗑️ Invoice устгалаа:', invoiceId);
      return { success: true, data: response.data };

    } catch (error) {
      console.error('❌ Invoice устгах алдаа:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== 6. CALLBACK VERIFICATION ====================
  verifyCallback(data) {
    // Шаардлагатай талбарууд
    const requiredFields = [
      'object_id',
      'object_type',
      'payment_status',
      'payment_date',
      'payment_amount'
    ];

    // Бүх талбарууд байгаа эсэх
    for (const field of requiredFields) {
      if (!data[field]) {
        console.log(`❌ Callback validation: ${field} байхгүй`);
        return false;
      }
    }

    // Төлбөрийн статус шалгах
    if (data.payment_status !== 'PAID') {
      console.log(`ℹ️ Callback: Төлбөр төлөгдөөгүй (status: ${data.payment_status})`);
      return false;
    }

    console.log('✅ Callback validation passed');
    return true;
  }

  
}

module.exports = new QPayService();