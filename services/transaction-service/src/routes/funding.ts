import { Router, type Request, type Response } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  accounts,
  transactions,
  notifications,
  type TransactionType,
  type TransactionStatus,
} from "../db/schema.js";

const router = Router();

// Helper function to normalize currency codes
const normalizeCurrency = (currency: string): string => {
  return currency.trim().toUpperCase();
};

// Deposit funds
router.post(
  "/deposit",
  requireAuth(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { accountId, amount, currency } = req.body;

      // Validate input
      if (!accountId || !amount || !currency) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      if (typeof amount !== "number" || amount <= 0) {
        res.status(400).json({ error: "Invalid amount" });
        return;
      }

      const normalizedCurrency = normalizeCurrency(currency);

      const result = await db.transaction(
        async (tx) => {
          // Verify account ownership and currency match
          const [account] = await tx
            .select()
            .from(accounts)
            .where(eq(accounts.id, accountId))
            .limit(1)
            .for("update");

          if (!account || account.userId !== userId) {
            throw new Error("Invalid account");
          }

          if (account.currency !== normalizedCurrency) {
            throw new Error("Currency mismatch");
          }

          // TODO: Integrate with payment provider (e.g., Stripe) here
          // This would handle the actual payment processing
          // For now, we'll just simulate a successful deposit

          // Create a deposit transaction
          const [depositTransaction] = await tx
            .insert(transactions)
            .values({
              fromAccountId: accountId, // Same account for deposit
              toAccountId: accountId,
              amount,
              currency: normalizedCurrency,
              status: "COMPLETED" as TransactionStatus,
              type: "DEPOSIT" as TransactionType,
              completedAt: new Date(),
            })
            .returning();

          // Update account balance
          await tx
            .update(accounts)
            .set({ balance: account.balance + amount })
            .where(eq(accounts.id, accountId));

          // Create notification
          await tx.insert(notifications).values({
            userId,
            type: "DEPOSIT_COMPLETED",
            message: `Deposited ${amount} ${normalizedCurrency} to account ${accountId}`,
          });

          return depositTransaction;
        },
        {
          isolationLevel: "serializable",
        }
      );

      res.status(201).json({
        message: "Deposit successful",
        transaction: result,
      });
    } catch (error) {
      console.error("Error processing deposit:", error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
);

// Withdraw funds
router.post(
  "/withdraw",
  requireAuth(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { accountId, amount, currency } = req.body;

      // Validate input
      if (!accountId || !amount || !currency) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      if (typeof amount !== "number" || amount <= 0) {
        res.status(400).json({ error: "Invalid amount" });
        return;
      }

      const normalizedCurrency = normalizeCurrency(currency);

      const result = await db.transaction(
        async (tx) => {
          // Verify account ownership and currency match
          const [account] = await tx
            .select()
            .from(accounts)
            .where(eq(accounts.id, accountId))
            .limit(1)
            .for("update");

          if (!account || account.userId !== userId) {
            throw new Error("Invalid account");
          }

          if (account.currency !== normalizedCurrency) {
            throw new Error("Currency mismatch");
          }

          // Check sufficient balance
          if (account.balance < amount) {
            throw new Error("Insufficient balance");
          }

          // TODO: Integrate with payment provider (e.g., Stripe) here
          // This would handle the actual payout processing
          // For now, we'll just simulate a successful withdrawal

          // Create a withdrawal transaction
          const [withdrawalTransaction] = await tx
            .insert(transactions)
            .values({
              fromAccountId: accountId,
              toAccountId: accountId,
              amount,
              currency: normalizedCurrency,
              status: "COMPLETED" as TransactionStatus,
              type: "WITHDRAWAL" as TransactionType,
              completedAt: new Date(),
            })
            .returning();

          // Update account balance
          await tx
            .update(accounts)
            .set({ balance: account.balance - amount })
            .where(eq(accounts.id, accountId));

          // Create notification
          await tx.insert(notifications).values({
            userId,
            type: "WITHDRAWAL_COMPLETED",
            message: `Withdrawn ${amount} ${normalizedCurrency} from account ${accountId}`,
          });

          return withdrawalTransaction;
        },
        {
          isolationLevel: "serializable",
        }
      );

      res.status(201).json({
        message: "Withdrawal successful",
        transaction: result,
      });
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
);

export default router;
