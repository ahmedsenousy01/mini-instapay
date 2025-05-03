const express = require('express');
const router = express.Router();
const transactionService = require('../services/transaction.service');

// Create a new transaction
router.post('/', async (req, res, next) => {
  try {
    const { senderUserId, receiverUserId, amount, type, description } = req.body;
    
    if (!senderUserId || !receiverUserId || !amount) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Amount must be greater than 0'
      });
    }

    const transaction = await transactionService.createTransaction(
      senderUserId,
      receiverUserId,
      amount,
      type,
      description
    );

    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

// Get transaction by ID
router.get('/:transactionId', async (req, res, next) => {
  try {
    const transaction = await transactionService.getTransaction(req.params.transactionId);
    if (!transaction) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Transaction not found'
      });
    }
    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

// Get user's transactions
router.get('/user/:userId', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const transactions = await transactionService.getUserTransactions(
      req.params.userId,
      page,
      limit
    );
    
    res.json({
      transactions: transactions.rows,
      total: transactions.count,
      page,
      limit
    });
  } catch (error) {
    next(error);
  }
});

// Get account balance
router.get('/balance/:userId', async (req, res, next) => {
  try {
    const balance = await transactionService.getAccountBalance(req.params.userId);
    res.json({ balance });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 