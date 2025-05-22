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
import { logger } from "../utils/logger.js";

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
router.get(
  "/deposit",
  requireAuth(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        logger.error("Unauthorized deposit attempt", undefined, {
          path: req.path,
        });
        throw new ValidationError("Unauthorized");
      }

      const { accountId, amount, currency } = fundingSchema.parse({
        accountId: req.query.accountId as string,
        amount: Number(req.query.amount),
        currency: req.query.currency as string,
      });

      logger.info("Processing deposit request", {
        userId,
        accountId,
        amount,
        currency,
      });

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
            logger.error("Account not found", undefined, { accountId });
            throw new NotFoundError("Account not found");
          }

          if (account.userId !== userId) {
            logger.error("Unauthorized account access", undefined, {
              userId,
              accountId,
            });
            throw new ValidationError("Access denied to this account");
          }

          if (account.currency !== normalizedCurrency) {
            logger.error("Currency mismatch", undefined, {
              accountId,
              expectedCurrency: account.currency,
              providedCurrency: normalizedCurrency,
            });
            throw new ValidationError("Currency mismatch with account");
          }

          logger.info("Creating deposit transaction", {
            accountId,
            amount,
            currency: normalizedCurrency,
          });

          // Create a deposit transaction
          const [depositTransaction] = await tx
            .insert(transactions)
            .values({
              fromAccountId: accountId,
              toAccountId: accountId,
              amount,
              currency: normalizedCurrency,
              status: "COMPLETED" as TransactionStatus,
              type: "DEPOSIT" as TransactionType,
              completedAt: new Date(),
            })
            .returning();

          logger.info("Updating account balance", {
            accountId,
            currentBalance: account.balance,
            newBalance: account.balance + amount,
          });

          // Update account balance
          await tx
            .update(accounts)
            .set({ balance: account.balance + amount })
            .where(eq(accounts.id, accountId));

          logger.info("Creating deposit notification");
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

      logger.info("Deposit completed successfully", {
        transactionId: result.id,
        accountId,
        amount,
        currency: normalizedCurrency,
      });

      res.status(201).json({
        message: "Deposit successful",
        transaction: result,
      });
    } catch (error) {
      logger.error("Deposit failed", error as Error);
      next(error);
    }
  }
);

// Withdraw funds
router.get(
  "/withdraw",
  requireAuth(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        logger.error("Unauthorized withdrawal attempt", undefined, {
          path: req.path,
        });
        throw new ValidationError("Unauthorized");
      }

      const { accountId, amount, currency } = fundingSchema.parse({
        accountId: req.query.accountId as string,
        amount: Number(req.query.amount),
        currency: req.query.currency as string,
      });

      logger.info("Processing withdrawal request", {
        userId,
        accountId,
        amount,
        currency,
      });

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
            logger.error("Account not found", undefined, { accountId });
            throw new NotFoundError("Account not found");
          }

          if (account.userId !== userId) {
            logger.error("Unauthorized account access", undefined, {
              userId,
              accountId,
            });
            throw new ValidationError("Access denied to this account");
          }

          if (account.currency !== normalizedCurrency) {
            logger.error("Currency mismatch", undefined, {
              accountId,
              expectedCurrency: account.currency,
              providedCurrency: normalizedCurrency,
            });
            throw new ValidationError("Currency mismatch with account");
          }

          // Check sufficient balance
          if (account.balance < amount) {
            logger.error("Insufficient balance", undefined, {
              accountId,
              balance: account.balance,
              requestedAmount: amount,
            });
            throw new ValidationError("Insufficient balance");
          }

          logger.info("Creating withdrawal transaction", {
            accountId,
            amount,
            currency: normalizedCurrency,
          });

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

          logger.info("Updating account balance", {
            accountId,
            currentBalance: account.balance,
            newBalance: account.balance - amount,
          });

          // Update account balance
          await tx
            .update(accounts)
            .set({ balance: account.balance - amount })
            .where(eq(accounts.id, accountId));

          logger.info("Creating withdrawal notification");
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

      logger.info("Withdrawal completed successfully", {
        transactionId: result.id,
        accountId,
        amount,
        currency: normalizedCurrency,
      });

      res.status(201).json({
        message: "Withdrawal successful",
        transaction: result,
      });
    } catch (error) {
      logger.error("Withdrawal failed", error as Error);
      next(error);
    }
  }
);

export default router;
