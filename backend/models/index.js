const sequelize = require('../config/database');

const UserModel = require('./User');
const OrderModel = require('./Order');

const User = UserModel(sequelize);
const Order = OrderModel(sequelize);

// Relationships - аюулгүй аргаар
try {
  User.hasMany(Order, { foreignKey: 'user_id' });
  Order.belongsTo(User, { foreignKey: 'user_id' });
} catch (error) {
  console.log('⚠️  Relationship алдаа:', error.message);
}

// Sync database with safe options
sequelize.sync({ 
  force: false,    // Хэзээ ч true хэрэглэхгүй!
  alter: false     // Хэзээ ч true хэрэглэхгүй!
})
  .then(() => console.log('✅ Database synced safely'))
  .catch(err => {
    console.error('❌ Database sync алдаа:', err.message);
    console.log('ℹ️  Гэхдээ API ажиллах болно');
  });

module.exports = {
  sequelize,
  User,
  Order
};