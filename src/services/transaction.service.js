const { Transaction, Account, sequelize } = require('../models');
const auditService = require('./audit.service');

class TransactionService {
  async createTransaction(senderUserId, receiverUserId, amount, type = 'transfer', description = '') {
    const t = await sequelize.transaction();

    try {
      // Get sender and receiver accounts
      const [senderAccount, receiverAccount] = await Promise.all([
        Account.findOne({ where: { userId: senderUserId }, transaction: t, lock: true }),
        Account.findOne({ where: { userId: receiverUserId }, transaction: t, lock: true })
      ]);

      if (!senderAccount || !receiverAccount) {
        await auditService.logEvent('TRANSACTION_FAILED', {
          error: 'Account not found',
          senderUserId,
          receiverUserId
        });
        throw new Error('Sender or receiver account not found');
      }

      if (senderAccount.status !== 'active' || receiverAccount.status !== 'active') {
        await auditService.logEvent('TRANSACTION_FAILED', {
          error: 'Account inactive',
          senderStatus: senderAccount.status,
          receiverStatus: receiverAccount.status
        });
        throw new Error('One or both accounts are not active');
      }

      if (senderAccount.balance < amount) {
        await auditService.logEvent('TRANSACTION_FAILED', {
          error: 'Insufficient funds',
          senderUserId,
          requestedAmount: amount,
          availableBalance: senderAccount.balance
        });
        throw new Error('Insufficient funds');
      }

      // Create transaction record
      const transaction = await Transaction.create({
        senderId: senderAccount.id,
        receiverId: receiverAccount.id,
        amount,
        type,
        description,
        status: 'pending'
      }, { transaction: t });

      // Update balances
      await Promise.all([
        senderAccount.decrement('balance', { by: amount, transaction: t }),
        receiverAccount.increment('balance', { by: amount, transaction: t })
      ]);

      // Update transaction status
      await transaction.update({ status: 'completed' }, { transaction: t });

      await t.commit();

      // Log successful transaction
      await auditService.logEvent('TRANSACTION_COMPLETED', {
        transactionId: transaction.id,
        senderUserId,
        receiverUserId,
        amount,
        type,
        description
      });

      return transaction;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async getTransaction(transactionId) {
    const transaction = await Transaction.findByPk(transactionId, {
      include: [
        { model: Account, as: 'sender' },
        { model: Account, as: 'receiver' }
      ]
    });

    if (transaction) {
      await auditService.logEvent('TRANSACTION_VIEWED', {
        transactionId,
        viewedAt: new Date()
      });
    }

    return transaction;
  }

  async getUserTransactions(userId, page = 1, limit = 10) {
    const account = await Account.findOne({ where: { userId } });
    if (!account) {
      await auditService.logEvent('TRANSACTION_HISTORY_FAILED', {
        error: 'Account not found',
        userId
      });
      throw new Error('Account not found');
    }

    const transactions = await Transaction.findAndCountAll({
      where: {
        [sequelize.Op.or]: [
          { senderId: account.id },
          { receiverId: account.id }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      include: [
        { model: Account, as: 'sender' },
        { model: Account, as: 'receiver' }
      ]
    });

    await auditService.logEvent('TRANSACTION_HISTORY_VIEWED', {
      userId,
      page,
      limit,
      totalRecords: transactions.count
    });

    return transactions;
  }

  async getAccountBalance(userId) {
    const account = await Account.findOne({ where: { userId } });
    if (!account) {
      await auditService.logEvent('BALANCE_CHECK_FAILED', {
        error: 'Account not found',
        userId
      });
      throw new Error('Account not found');
    }

    await auditService.logEvent('BALANCE_CHECKED', {
      userId,
      balance: account.balance
    });

    return account.balance;
  }
}

module.exports = new TransactionService(); 