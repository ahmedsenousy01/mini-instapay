const { AuditLog } = require('../models');

class AuditService {
  async logEvent(event, payload) {
    try {
      await AuditLog.create({
        event,
        payload
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // We don't throw the error as audit logging should not break the main flow
    }
  }

  async getAuditLogs(filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    return AuditLog.findAndCountAll({
      where: filters,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
  }
}

module.exports = new AuditService(); 