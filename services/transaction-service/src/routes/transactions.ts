import { Router, type Request, type Response } from "express";
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

const router = Router();

// Initiate a transfer
router.post(
  "/",
  requireAuth(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { fromAccountId, toAccountId, amount, currency } = req.body;

      // Validate input
      if (!fromAccountId || !toAccountId || !amount || !currency) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      if (typeof amount !== "number" || amount <= 0) {
        res.status(400).json({ error: "Invalid amount" });
        return;
      }

      const result = await db.transaction(
        async (tx) => {
          // Check if fromAccount belongs to the user and has sufficient balance
          const [fromAccount] = await tx
            .select()
            .from(accounts)
            .where(eq(accounts.id, fromAccountId))
            .limit(1)
            .for("update"); // Lock the row for update

          if (!fromAccount || fromAccount.userId !== userId) {
            throw new Error("Invalid source account");
          }

          if (fromAccount.balance < amount) {
            throw new Error("Insufficient balance");
          }

          if (fromAccount.currency !== currency) {
            throw new Error("Currency mismatch with source account");
          }

          // Verify destination account exists and check currency
          const [toAccount] = await tx
            .select()
            .from(accounts)
            .where(eq(accounts.id, toAccountId))
            .limit(1)
            .for("update"); // Lock the row for update

          if (!toAccount) {
            throw new Error("Destination account not found");
          }

          if (toAccount.currency !== currency) {
            throw new Error("Currency mismatch with destination account");
          }

          // Create transaction
          const [newTransaction] = await tx
            .insert(transactions)
            .values({
              fromAccountId,
              toAccountId,
              amount,
              currency,
              status: "COMPLETED" as TransactionStatus, // Directly mark as completed since we're in a transaction
              type: "TRANSFER" as TransactionType,
              completedAt: new Date(),
            })
            .returning();

          // Update account balances
          await tx
            .update(accounts)
            .set({ balance: fromAccount.balance - amount })
            .where(eq(accounts.id, fromAccountId));

          await tx
            .update(accounts)
            .set({ balance: toAccount.balance + amount })
            .where(eq(accounts.id, toAccountId));

          // Create notifications
          await tx.insert(notifications).values([
            {
              userId: fromAccount.userId,
              type: "TRANSACTION_SENT",
              message: `Sent ${amount} ${currency} to account ${toAccountId}`,
            },
            {
              userId: toAccount.userId,
              type: "TRANSACTION_RECEIVED",
              message: `Received ${amount} ${currency} from account ${fromAccountId}`,
            },
          ]);

          return newTransaction;
        },
        {
          isolationLevel: "serializable", // Highest isolation level to prevent race conditions
        }
      );

      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating transaction:", error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
);

// List transactions
router.get(
  "/",
  requireAuth(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const {
        type,
        status,
        fromDate,
        toDate,
        page = "1",
        limit = "10",
      } = req.query;

      // Get user's accounts
      const userAccounts = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.userId, userId));

      const accountIds = userAccounts.map((acc) => acc.id);

      if (accountIds.length === 0) {
        res.json([]);
        return;
      }

      // Build conditions array
      const conditions = [];

      if (type === "incoming") {
        conditions.push(
          or(...accountIds.map((id) => eq(transactions.toAccountId, id)))
        );
      } else if (type === "outgoing") {
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

      if (status) {
        conditions.push(eq(transactions.status, status as TransactionStatus));
      }

      if (fromDate && toDate) {
        conditions.push(
          between(
            transactions.initiatedAt,
            new Date(fromDate as string),
            new Date(toDate as string)
          )
        );
      }

      // Add pagination
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(
        100,
        Math.max(1, parseInt(limit as string) || 10)
      );
      const offset = (pageNum - 1) * limitNum;

      // Execute query with all conditions
      const result = await db
        .select()
        .from(transactions)
        .where(and(...conditions))
        .limit(limitNum)
        .offset(offset)
        .orderBy(desc(transactions.initiatedAt));

      res.json(result);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Internal server error" });
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
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { transactionId } = req.params;

      // Get user's accounts
      const userAccounts = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.userId, userId));

      const accountIds = userAccounts.map((acc) => acc.id);

      if (accountIds.length === 0) {
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
        res.status(404).json({ error: "Transaction not found" });
        return;
      }

      res.json(transaction[0]);
    } catch (error) {
      console.error("Error fetching transaction:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Cancel transaction
router.patch(
  "/:transactionId/cancel",
  requireAuth(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { transactionId } = req.params;

      // Get the transaction
      const transaction = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId))
        .limit(1);

      if (!transaction.length) {
        res.status(404).json({ error: "Transaction not found" });
        return;
      }

      // Check if transaction is PENDING
      if (transaction[0].status !== "PENDING") {
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
        res.status(500).json({ error: "Destination account not found" });
        return;
      }

      // Revert the transaction
      await db
        .update(accounts)
        .set({ balance: fromAccount[0].balance + transaction[0].amount })
        .where(eq(accounts.id, transaction[0].fromAccountId));

      await db
        .update(accounts)
        .set({ balance: toAccount[0].balance - transaction[0].amount })
        .where(eq(accounts.id, transaction[0].toAccountId));

      // Update transaction status
      await db
        .update(transactions)
        .set({
          status: "CANCELLED" as TransactionStatus,
          completedAt: new Date(),
        })
        .where(eq(transactions.id, transactionId));

      // Create notifications
      await db.insert(notifications).values([
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

      res.json({ message: "Transaction cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling transaction:", error);
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
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { accountId } = req.params;

      // Verify account ownership
      const account = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);

      if (!account.length || account[0].userId !== userId) {
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

      res.json(accountTransactions);
    } catch (error) {
      console.error("Error fetching account transactions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
