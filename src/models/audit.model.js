const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    service: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'transaction-service'
    },
    event: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: true,
    updatedAt: false
  });

  return AuditLog;
}; 