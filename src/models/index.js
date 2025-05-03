const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'instapay_transactions',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

// Import models
const Transaction = require('./transaction.model')(sequelize);
const Account = require('./account.model')(sequelize);
const AuditLog = require('./audit.model')(sequelize);

// Define relationships
Account.hasMany(Transaction, { 
  as: 'sentTransactions',
  foreignKey: 'senderId'
});

Account.hasMany(Transaction, {
  as: 'receivedTransactions',
  foreignKey: 'receiverId'
});

Transaction.belongsTo(Account, {
  as: 'sender',
  foreignKey: 'senderId'
});

Transaction.belongsTo(Account, {
  as: 'receiver',
  foreignKey: 'receiverId'
});

module.exports = {
  sequelize,
  Transaction,
  Account,
  AuditLog
}; 