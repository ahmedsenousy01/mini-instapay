import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { accounts, notifications } from "../db/schema.js";
import { ValidationError, NotFoundError } from "../types/errors.js";
import { z } from "zod";
import { logger } from "../utils/logger.js";

const router = Router();

// Validation schema for creating account
const createAccountSchema = z.object({
  currency: z.string().length(3),
});

// List all accounts belonging to the authenticated user
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
        throw new ValidationError("Unauthorized");
      }

      logger.info("Fetching user accounts", { userId });
      const userAccounts = await db
        .select({
          id: accounts.id,
          currency: accounts.currency,
          balance: accounts.balance,
          createdAt: accounts.createdAt,
        })
        .from(accounts)
        .where(eq(accounts.userId, userId));

      logger.info("User accounts retrieved", {
        userId,
        count: userAccounts.length,
      });
      res.json(userAccounts);
    } catch (error) {
      logger.error("Error fetching user accounts", error as Error);
      next(error);
    }
  }
);

// Create new account
router.get(
  "/create",
  requireAuth(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        logger.error("Unauthorized access attempt", undefined, {
          path: req.path,
        });
        throw new ValidationError("Unauthorized");
      }

      const { currency } = createAccountSchema.parse({
        currency: req.query.currency as string,
      });

      logger.info("Creating new account", { userId, currency });

      const newAccount = await db.transaction(async (tx) => {
        const accountResult = await tx
          .insert(accounts)
          .values({
            userId,
            currency: currency.toUpperCase(),
            balance: 0,
          })
          .returning();

        // Create notification
        await tx.insert(notifications).values({
          userId,
          type: "ACCOUNT_CREATED",
          message: `New ${currency} account created successfully`,
        });

        return accountResult;
      });

      logger.info("Account created successfully", {
        userId,
        accountId: newAccount[0].id,
        currency,
      });

      res.status(201).json(newAccount[0]);
    } catch (error) {
      logger.error("Error creating account", error as Error);
      next(error);
    }
  }
);

// Get single account details
router.get(
  "/:accountId/details",
  requireAuth(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        logger.error("Unauthorized access attempt", undefined, {
          path: req.path,
        });
        throw new ValidationError("Unauthorized");
      }

      const { accountId } = req.params;
      logger.info("Fetching account details", { userId, accountId });

      const account = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);

      if (!account.length) {
        logger.error("Account not found", undefined, { accountId });
        throw new NotFoundError("Account not found");
      }

      if (account[0].userId !== userId) {
        logger.error("Unauthorized account access", undefined, {
          userId,
          accountId,
        });
        throw new ValidationError("Access denied to this account");
      }

      logger.info("Account details retrieved", { accountId });
      res.json(account[0]);
    } catch (error) {
      logger.error("Error fetching account details", error as Error);
      next(error);
    }
  }
);

export default router;
