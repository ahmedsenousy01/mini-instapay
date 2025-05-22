import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import cors from "cors";
import client from "prom-client";
import { logger } from "./utils/logger.js";
/**
 * API Gateway for Mini-InstaPay
 *
 * Environment variables:
 * - PORT: Port to run the API gateway on (default: 4000)
 * - TRANSACTION_SERVICE_URL: URL for the transaction service (default: http://transaction-service:5001)
 * - NOTIFICATION_SERVICE_URL: URL for the notification service (default: http://notification-service:5002)
 * - REPORTING_SERVICE_URL: URL for the reporting service (default: http://reporting-service:5003)
 * - CLERK_SECRET_KEY: Clerk authentication secret key
 * - CLERK_PUBLISHABLE_KEY: Clerk authentication publishable key
 */

const app = express();
const PORT = process.env.PORT || 4000;

// Prometheus metrics setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info("Request processed", {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: Date.now() - start,
      userAgent: req.get("user-agent"),
      ip: req.ip,
    });
  });
  next();
});

// Health check endpoint
app.get("/api/health", (req: Request, res: Response) => {
  logger.info("Health check requested");
  res.status(200).json({ status: "OK", message: "API Gateway is running" });
});

// Metrics endpoint
app.get("/metrics", async (req: Request, res: Response) => {
  logger.info("Metrics requested");
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

// Clerk middleware
app.use(clerkMiddleware());

// Transaction routes - protected by auth
app.use(
  "/api/transactions",
  requireAuth({ signInUrl: "/auth/signin" }),
  createProxyMiddleware({
    target:
      process.env.TRANSACTION_SERVICE_URL || "http://transaction-service:5001",
    changeOrigin: true,
    pathRewrite: {
      "^/api/transactions": "",
    },
  })
);

// Notification routes - protected by auth
app.use(
  "/api/notifications",
  requireAuth({ signInUrl: "/auth/signin" }),
  createProxyMiddleware({
    target:
      process.env.NOTIFICATION_SERVICE_URL ||
      "http://notification-service:5002",
    changeOrigin: true,
    pathRewrite: {
      "^/api/notifications": "",
    },
  })
);

// Reporting routes - protected by auth
app.use(
  "/api/reports",
  requireAuth({ signInUrl: "/auth/signin" }),
  createProxyMiddleware({
    target:
      process.env.REPORTING_SERVICE_URL || "http://reporting-service:5003",
    changeOrigin: true,
    pathRewrite: {
      "^/api/reports": "",
    },
  })
);

// Handle 404
app.use((req: Request, res: Response) => {
  logger.error("Route not found", undefined, { path: req.path });
  res
    .status(404)
    .json({ error: "Not Found", message: `Route ${req.path} not found` });
});

// Handle errors
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error", err, {
    path: req.path,
    method: req.method,
    query: req.query,
    body: req.body,
  });
  res
    .status(500)
    .json({ error: "Internal Server Error", message: err.message });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`API Gateway started`, { port: PORT });
  logger.info("Service endpoints configured", {
    transactions:
      process.env.TRANSACTION_SERVICE_URL || "http://transaction-service:5001",
    notifications:
      process.env.NOTIFICATION_SERVICE_URL ||
      "http://notification-service:5002",
    reports:
      process.env.REPORTING_SERVICE_URL || "http://reporting-service:5003",
  });
});
