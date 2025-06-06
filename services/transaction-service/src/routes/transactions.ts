import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { eq, and, or, between, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  transactions,
  accounts,
  notifications,
  type TransactionType,
  type TransactionStatus,
} from "../db/schema.js";
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from "../types/errors.js";
import { z } from "zod";
import { logger } from "../utils/logger.js";

const router = Router();

// Validation schemas
const transferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
});

const listTransactionsSchema = z.object({
  type: z.enum(["incoming", "outgoing"]).optional(),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "CANCELLED"]).optional(),
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.string().regex(/^\d+$/).default("1"),
  limit: z.string().regex(/^\d+$/).default("10"),
});

// Helper function to normalize currency codes
const normalizeCurrency = (currency: string): string => {
  return currency.trim().toUpperCase();
};

// Initiate a transfer
router.get(
  "/create",
  requireAuth(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        logger.error("Unauthorized transfer attempt", undefined, {
          path: req.path,
        });
        throw new UnauthorizedError("Unauthorized");
      }

      const { fromAccountId, toAccountId, amount, currency } =
        transferSchema.parse({
          fromAccountId: req.query.fromAccountId as string,
          toAccountId: req.query.toAccountId as string,
          amount: Number(req.query.amount),
          currency: req.query.currency as string,
        });

      logger.info("Initiating transfer", {
        userId,
        fromAccountId,
        toAccountId,
        amount,
        currency,
      });

      if (fromAccountId === toAccountId) {
        logger.error("Invalid transfer - same account", undefined, {
          fromAccountId,
          toAccountId,
        });
        throw new ValidationError("Cannot transfer to the same account");
      }

      const normalizedCurrency = normalizeCurrency(currency);

      const result = await db.transaction(
        async (tx) => {
          // Check if fromAccount belongs to the user and has sufficient balance
          const [fromAccount] = await tx
            .select()
            .from(accounts)
            .where(eq(accounts.id, fromAccountId))
            .limit(1)
            .for("update");

          if (!fromAccount) {
            logger.error("Source account not found", undefined, {
              fromAccountId,
            });
            throw new NotFoundError("Source account not found");
          }

          if (fromAccount.userId !== userId) {
            logger.error("Unauthorized source account access", undefined, {
              userId,
              fromAccountId,
            });
            throw new ValidationError("Access denied to source account");
          }

          if (fromAccount.balance < amount) {
            logger.error("Insufficient balance", undefined, {
              fromAccountId,
              balance: fromAccount.balance,
              amount,
            });
            throw new ValidationError("Insufficient balance");
          }

          if (fromAccount.currency !== normalizedCurrency) {
            logger.error("Currency mismatch with source account", undefined, {
              fromAccountId,
              expectedCurrency: fromAccount.currency,
              providedCurrency: normalizedCurrency,
            });
            throw new ValidationError("Currency mismatch with source account");
          }

          // Verify destination account exists and check currency
          const [toAccount] = await tx
            .select()
            .from(accounts)
            .where(eq(accounts.id, toAccountId))
            .limit(1)
            .for("update");

          if (!toAccount) {
            logger.error("Destination account not found", undefined, {
              toAccountId,
            });
            throw new NotFoundError("Destination account not found");
          }

          if (toAccount.currency !== normalizedCurrency) {
            logger.error(
              "Currency mismatch with destination account",
              undefined,
              {
                toAccountId,
                expectedCurrency: toAccount.currency,
                providedCurrency: normalizedCurrency,
              }
            );
            throw new ValidationError(
              "Currency mismatch with destination account"
            );
          }

          logger.info("Creating transaction record", {
            fromAccountId,
            toAccountId,
            amount,
            currency: normalizedCurrency,
          });

          // Create transaction
          const [newTransaction] = await tx
            .insert(transactions)
            .values({
              fromAccountId,
              toAccountId,
              amount,
              currency: normalizedCurrency,
              status: "COMPLETED" as TransactionStatus,
              type: "TRANSFER" as TransactionType,
              completedAt: new Date(),
            })
            .returning();

          logger.info("Updating account balances", {
            fromAccountId,
            newFromBalance: fromAccount.balance - amount,
            toAccountId,
            newToBalance: toAccount.balance + amount,
          });

          // Update account balances
          await tx
            .update(accounts)
            .set({ balance: fromAccount.balance - amount })
            .where(eq(accounts.id, fromAccountId));

          await tx
            .update(accounts)
            .set({ balance: toAccount.balance + amount })
            .where(eq(accounts.id, toAccountId));

          logger.info("Creating notifications");
          // Create notifications
          await tx.insert(notifications).values([
            {
              userId: fromAccount.userId,
              type: "TRANSACTION_SENT",
              message: `Sent ${amount} ${normalizedCurrency} to account ${toAccountId}`,
            },
            {
              userId: toAccount.userId,
              type: "TRANSACTION_RECEIVED",
              message: `Received ${amount} ${normalizedCurrency} from account ${fromAccountId}`,
            },
          ]);

          return newTransaction;
        },
        {
          isolationLevel: "serializable",
        }
      );

      logger.info("Transfer completed successfully", {
        transactionId: result.id,
        fromAccountId,
        toAccountId,
        amount,
        currency: normalizedCurrency,
      });

      res.status(201).json(result);
    } catch (error) {
      logger.error("Transfer failed", error as Error);
      next(error);
    }
  }
);

// List transactions
router.get(
  "/",
  requireAuth(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        logger.error("Unauthorized access attempt", undefined, {
          path: req.path,
        });
        throw new UnauthorizedError("Unauthorized");
      }

      const query = listTransactionsSchema.parse(req.query);

      logger.info("Fetching user accounts", { userId });
      // Get user's accounts
      const userAccounts = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.userId, userId));

      const accountIds = userAccounts.map((acc) => acc.id);

      if (accountIds.length === 0) {
        logger.info("No accounts found for user", { userId });
        res.json([]);
        return;
      }

      // Build conditions array
      const conditions = [];

      if (query.type === "incoming") {
        conditions.push(
          or(...accountIds.map((id) => eq(transactions.toAccountId, id)))
        );
      } else if (query.type === "outgoing") {
        conditions.push(
          or(...accountIds.map((id) => eq(transactions.fromAccountId, id)))
        );
      } else {
        // For all transactions, match either as sender or receiver
        conditions.push(
          or(
            or(...accountIds.map((id) => eq(transactions.fromAccountId, id))),
            or(...accountIds.map((id) => eq(transactions.toAccountId, id)))
          )
        );
      }

      if (query.status) {
        conditions.push(eq(transactions.status, query.status));
      }

      if (query.fromDate && query.toDate) {
        const start = new Date(query.fromDate);
        const end = new Date(query.toDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        if (start > end) {
          logger.error("Invalid date range", undefined, {
            fromDate: query.fromDate,
            toDate: query.toDate,
          });
          throw new ValidationError("Start date must be before end date");
        }

        conditions.push(between(transactions.initiatedAt, start, end));
      }

      const page = parseInt(query.page);
      const limit = parseInt(query.limit);
      const offset = (page - 1) * limit;

      logger.info("Fetching transactions", {
        userId,
        query,
        page,
        limit,
        offset,
      });

      const results = await db
        .select()
        .from(transactions)
        .where(and(...conditions))
        .orderBy(desc(transactions.initiatedAt))
        .limit(limit)
        .offset(offset);

      logger.info("Transactions retrieved", {
        userId,
        count: results.length,
      });

      res.json(results);
    } catch (error) {
      logger.error("Error fetching transactions", error as Error);
      next(error);
    }
  }
);

// Get single transaction
router.get(
  "/:transactionId",
  requireAuth(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        logger.error("Unauthorized access attempt", undefined, {
          path: req.path,
        });
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { transactionId } = req.params;
      logger.info("Fetching transaction details", { userId, transactionId });

      // Get user's accounts
      const userAccounts = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.userId, userId));

      const accountIds = userAccounts.map((acc) => acc.id);

      if (accountIds.length === 0) {
        logger.info("No accounts found for user", { userId });
        res.status(404).json({ error: "Transaction not found" });
        return;
      }

      const transaction = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.id, transactionId),
            or(
              or(...accountIds.map((id) => eq(transactions.fromAccountId, id))),
              or(...accountIds.map((id) => eq(transactions.toAccountId, id)))
            )
          )
        )
        .limit(1);

      if (!transaction.length) {
        logger.error("Transaction not found", undefined, { transactionId });
        res.status(404).json({ error: "Transaction not found" });
        return;
      }

      logger.info("Transaction details retrieved", { transactionId });
      res.json(transaction[0]);
    } catch (error) {
      logger.error("Error fetching transaction details", error as Error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Cancel transaction
router.get(
  "/:transactionId/cancel",
  requireAuth(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        logger.error("Unauthorized access attempt", undefined, {
          path: req.path,
        });
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { transactionId } = req.params;
      logger.info("Attempting to cancel transaction", {
        userId,
        transactionId,
      });

      // Get the transaction
      const transaction = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId))
        .limit(1);

      if (!transaction.length) {
        logger.error("Transaction not found", undefined, { transactionId });
        res.status(404).json({ error: "Transaction not found" });
        return;
      }

      // Check if transaction is PENDING
      if (transaction[0].status !== "PENDING") {
        logger.error("Cannot cancel non-pending transaction", undefined, {
          transactionId,
          currentStatus: transaction[0].status,
        });
        res
          .status(400)
          .json({ error: "Only pending transactions can be cancelled" });
        return;
      }

      // Check if user owns the source account
      const fromAccount = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, transaction[0].fromAccountId))
        .limit(1);

      if (!fromAccount.length || fromAccount[0].userId !== userId) {
        logger.error(
          "Unauthorized transaction cancellation attempt",
          undefined,
          {
            userId,
            transactionId,
            fromAccountId: transaction[0].fromAccountId,
          }
        );
        res
          .status(403)
          .json({ error: "Unauthorized to cancel this transaction" });
        return;
      }

      // Get destination account
      const toAccount = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, transaction[0].toAccountId))
        .limit(1);

      if (!toAccount.length) {
        logger.error("Destination account not found", undefined, {
          transactionId,
          toAccountId: transaction[0].toAccountId,
        });
        res.status(500).json({ error: "Destination account not found" });
        return;
      }

      logger.info("Processing transaction cancellation", { transactionId });

      await db.transaction(
        async (tx) => {
          // lock rows
          await tx
            .select()
            .from(accounts)
            .where(eq(accounts.id, transaction[0].fromAccountId))
            .for("update");
          await tx
            .select()
            .from(accounts)
            .where(eq(accounts.id, transaction[0].toAccountId))
            .for("update");

          // Revert balances (double-check sufficient funds on dest account)
          if (toAccount[0].balance < transaction[0].amount) {
            logger.error("Insufficient balance for cancellation", undefined, {
              transactionId,
              toAccountId: toAccount[0].id,
              balance: toAccount[0].balance,
              amount: transaction[0].amount,
            });
            throw new Error(
              "Destination balance insufficient to revert transfer"
            );
          }

          logger.info("Reverting account balances", {
            fromAccountId: fromAccount[0].id,
            toAccountId: toAccount[0].id,
            amount: transaction[0].amount,
          });

          await tx
            .update(accounts)
            .set({ balance: fromAccount[0].balance + transaction[0].amount })
            .where(eq(accounts.id, transaction[0].fromAccountId));

          await tx
            .update(accounts)
            .set({ balance: toAccount[0].balance - transaction[0].amount })
            .where(eq(accounts.id, transaction[0].toAccountId));

          // Mark as cancelled
          await tx
            .update(transactions)
            .set({
              status: "CANCELLED" as TransactionStatus,
              completedAt: new Date(),
            })
            .where(eq(transactions.id, transactionId));

          logger.info("Creating cancellation notifications");
          // Notifications
          await tx.insert(notifications).values([
            {
              userId: fromAccount[0].userId,
              type: "TRANSACTION_CANCELLED",
              message: `Transaction of ${transaction[0].amount} ${transaction[0].currency} to account ${transaction[0].toAccountId} has been cancelled`,
            },
            {
              userId: toAccount[0].userId,
              type: "TRANSACTION_CANCELLED",
              message: `Transaction of ${transaction[0].amount} ${transaction[0].currency} from account ${transaction[0].fromAccountId} has been cancelled`,
            },
          ]);
        },
        { isolationLevel: "serializable" }
      );

      logger.info("Transaction cancelled successfully", { transactionId });
      res.json({ message: "Transaction cancelled successfully" });
    } catch (error) {
      logger.error("Error cancelling transaction", error as Error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get account transactions
router.get(
  "/account/:accountId",
  requireAuth(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        logger.error("Unauthorized access attempt", undefined, {
          path: req.path,
        });
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { accountId } = req.params;
      logger.info("Fetching account transactions", { userId, accountId });

      // Verify account ownership
      const account = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);

      if (!account.length || account[0].userId !== userId) {
        logger.error("Unauthorized account access", undefined, {
          userId,
          accountId,
        });
        res.status(403).json({ error: "Unauthorized" });
        return;
      }

      // Get transactions
      const accountTransactions = await db
        .select()
        .from(transactions)
        .where(
          or(
            eq(transactions.fromAccountId, accountId),
            eq(transactions.toAccountId, accountId)
          )
        )
        .orderBy(desc(transactions.initiatedAt));

      logger.info("Account transactions retrieved", {
        accountId,
        count: accountTransactions.length,
      });

      res.json(accountTransactions);
    } catch (error) {
      logger.error("Error fetching account transactions", error as Error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
