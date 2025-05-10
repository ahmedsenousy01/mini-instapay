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
        throw new ValidationError("Unauthorized");
      }

      const userAccounts = await db
        .select({
          id: accounts.id,
          currency: accounts.currency,
          balance: accounts.balance,
          createdAt: accounts.createdAt,
        })
        .from(accounts)
        .where(eq(accounts.userId, userId));

      res.json(userAccounts);
    } catch (error) {
      next(error);
    }
  }
);

// Get single account details
router.get(
  "/:accountId",
  requireAuth(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        throw new ValidationError("Unauthorized");
      }

      const { accountId } = req.params;
      const account = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);

      if (!account.length) {
        throw new NotFoundError("Account not found");
      }

      if (account[0].userId !== userId) {
        throw new ValidationError("Access denied to this account");
      }

      res.json(account[0]);
    } catch (error) {
      next(error);
    }
  }
);

// Create new account
router.post(
  "/",
  requireAuth(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        throw new ValidationError("Unauthorized");
      }

      const { currency } = createAccountSchema.parse(req.body);

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

      res.status(201).json(newAccount[0]);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
