const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED'),
      defaultValue: 'PENDING'
    },
    qpay_invoice_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    qpay_payment_id: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'orders',
    timestamps: true
  });

  return Order;
};