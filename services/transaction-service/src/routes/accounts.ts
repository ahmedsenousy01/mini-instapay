import { Router, type Request, type Response } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { accounts, notifications } from "../db/schema.js";

const router = Router();

// List all accounts belonging to the authenticated user
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
      console.error("Error fetching accounts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get single account details
router.get(
  "/:accountId",
  requireAuth(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { accountId } = req.params;
      const account = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);

      if (!account.length) {
        res.status(404).json({ error: "Account not found" });
        return;
      }

      if (account[0].userId !== userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      res.json(account[0]);
    } catch (error) {
      console.error("Error fetching account:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Create new account
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

      const { currency } = req.body;
      if (!currency || typeof currency !== "string" || currency.length !== 3) {
        res.status(400).json({ error: "Invalid currency code" });
        return;
      }

      const newAccount = await db
        .insert(accounts)
        .values({
          userId,
          currency: currency.toUpperCase(),
          balance: 0,
        })
        .returning();

      // Create notification
      await db.insert(notifications).values({
        userId,
        type: "ACCOUNT_CREATED",
        message: `New ${currency} account created successfully`,
      });

      res.status(201).json(newAccount[0]);
    } catch (error) {
      console.error("Error creating account:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
