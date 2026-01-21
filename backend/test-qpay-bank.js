require('dotenv').config();
const QPayService = require('./services/qpayService');

async function testBankQR() {
  console.log('🏦 Банкны QR тест эхлэв...\n');
  
  try {
    // Test order data
    const orderData = {
      orderId: 123,
      amount: 10000,
      description: 'Test Bank QR'
    };
    
    // Банкны QR үүсгэх
    const result = await QPayService.createBankQR(orderData);
    
    console.log('✅ Банкны QR үүсгэлээ!');
    console.log('\n📋 Invoice мэдээлэл:');
    console.log('  Invoice ID:', result.invoice_id);
    console.log('  Дүн:', result.amount);
    
    console.log('\n🏦 Банкны QR кодууд:');
    
    Object.entries(result.bank_qr_codes).forEach(([key, bank]) => {
      if (bank) {
        console.log(`\n  ${bank.bank_name}:`);
        console.log(`    Апп: ${bank.app_name}`);
        console.log(`    QR мэдээлэл: ${bank.qr_data}`);
        console.log(`    QR зураг: ${bank.qr_image}`);
      }
    });
    
    console.log('\n📱 Заавар:');
    console.log('  1. ', result.instructions.step1);
    console.log('  2. ', result.instructions.step2);
    console.log('  3. ', result.instructions.step3);
    
    console.log('\n🎉 Тест амжилттай!');
    console.log('\n🔗 Тест хийх:');
    console.log('1. Дээрх QR кодыг аваад банкны аппаар уншуулна');
    console.log('2. 10,000₮ төлнө (test)');
    console.log('3. Төлбөр амжилттай болно');
    
  } catch (error) {
    console.error('❌ Тест амжилтгүй:', error.message);
  }
}

testBankQR();