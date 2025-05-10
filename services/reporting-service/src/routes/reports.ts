import express from "express";
import { z } from "zod";
import { generateTransactionBalanceReport } from "../services/reports.js";

const router = express.Router();

// Validation schema for query parameters
const reportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  groupBy: z.string().optional(),
  currency: z.string().optional(),
});

// Single account report
router.get("/accounts/:accountId", async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const query = reportQuerySchema.parse(req.query);

    const report = await generateTransactionBalanceReport({
      scope: "account",
      scopeId: accountId,
      ...query,
    });

    res.json(report);
  } catch (error) {
    next(error);
  }
});

// User's accounts report
router.get("/users/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const query = reportQuerySchema.parse(req.query);

    const report = await generateTransactionBalanceReport({
      scope: "user",
      scopeId: userId,
      ...query,
    });

    res.json(report);
  } catch (error) {
    next(error);
  }
});

export default router;
