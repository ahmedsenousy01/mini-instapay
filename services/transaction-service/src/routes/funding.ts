import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
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
import { ValidationError, NotFoundError } from "../types/errors.js";
import { z } from "zod";

const router = Router();

// Validation schemas
const fundingSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
});

// Helper function to normalize currency codes
const normalizeCurrency = (currency: string): string => {
  return currency.trim().toUpperCase();
};

// Deposit funds
router.post(
  "/deposit",
  requireAuth(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        throw new ValidationError("Unauthorized");
      }

      const { accountId, amount, currency } = fundingSchema.parse(req.body);
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

          if (!account) {
            throw new NotFoundError("Account not found");
          }

          if (account.userId !== userId) {
            throw new ValidationError("Access denied to this account");
          }

          if (account.currency !== normalizedCurrency) {
            throw new ValidationError("Currency mismatch with account");
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
      next(error);
    }
  }
);

// Withdraw funds
router.post(
  "/withdraw",
  requireAuth(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        throw new ValidationError("Unauthorized");
      }

      const { accountId, amount, currency } = fundingSchema.parse(req.body);
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

          if (!account) {
            throw new NotFoundError("Account not found");
          }

          if (account.userId !== userId) {
            throw new ValidationError("Access denied to this account");
          }

          if (account.currency !== normalizedCurrency) {
            throw new ValidationError("Currency mismatch with account");
          }

          // Check sufficient balance
          if (account.balance < amount) {
            throw new ValidationError("Insufficient balance");
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
      next(error);
    }
  }
);

export default router;
