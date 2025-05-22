import express from "express";
import { z } from "zod";
import { generateTransactionBalanceReport } from "../services/reports.js";
import { logger } from "../utils/logger.js";

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

    logger.info("Generating account report", {
      accountId,
      startDate: query.startDate,
      endDate: query.endDate,
      groupBy: query.groupBy,
      currency: query.currency,
    });

    const report = await generateTransactionBalanceReport({
      scope: "account",
      scopeId: accountId,
      ...query,
    });

    logger.info("Account report generated", {
      accountId,
      reportPeriod: `${query.startDate} to ${query.endDate}`,
    });

    res.json(report);
  } catch (error) {
    logger.error("Error generating account report", error as Error, {
      accountId: req.params.accountId,
      query: req.query,
    });
    next(error);
  }
});

// User's accounts report
router.get("/users/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const query = reportQuerySchema.parse(req.query);

    logger.info("Generating user report", {
      userId,
      startDate: query.startDate,
      endDate: query.endDate,
      groupBy: query.groupBy,
      currency: query.currency,
    });

    const report = await generateTransactionBalanceReport({
      scope: "user",
      scopeId: userId,
      ...query,
    });

    logger.info("User report generated", {
      userId,
      reportPeriod: `${query.startDate} to ${query.endDate}`,
    });

    res.json(report);
  } catch (error) {
    logger.error("Error generating user report", error as Error, {
      userId: req.params.userId,
      query: req.query,
    });
    next(error);
  }
});

export default router;
