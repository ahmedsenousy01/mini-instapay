import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { clerkMiddleware, requireAuth } from "@clerk/express";

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

// Middleware
app.use(express.json());
app.use(clerkMiddleware());

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK", message: "API Gateway is running" });
});

// Transaction routes - protected by auth
app.use(
  "/transactions",
  requireAuth({ signInUrl: "/auth/signin" }),
  createProxyMiddleware({
    target:
      process.env.TRANSACTION_SERVICE_URL || "http://transaction-service:5001",
    changeOrigin: true,
    pathRewrite: {
      "^/transactions": "",
    },
  })
);

// Notification routes - protected by auth
app.use(
  "/notifications",
  requireAuth({ signInUrl: "/auth/signin" }),
  createProxyMiddleware({
    target:
      process.env.NOTIFICATION_SERVICE_URL ||
      "http://notification-service:5002",
    changeOrigin: true,
    pathRewrite: {
      "^/notifications": "",
    },
  })
);

// Reporting routes - protected by auth
app.use(
  "/reports",
  requireAuth({ signInUrl: "/auth/signin" }),
  createProxyMiddleware({
    target:
      process.env.REPORTING_SERVICE_URL || "http://reporting-service:5003",
    changeOrigin: true,
    pathRewrite: {
      "^/reports": "",
    },
  })
);

// Handle 404
app.use((req: Request, res: Response) => {
  res
    .status(404)
    .json({ error: "Not Found", message: `Route ${req.path} not found` });
});

// Handle errors
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`Error: ${err.message}`);
  res
    .status(500)
    .json({ error: "Internal Server Error", message: err.message });
});

// Start the server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log("Service endpoints:");
  console.log(
    `- Transactions: ${
      process.env.TRANSACTION_SERVICE_URL || "http://transaction-service:5001"
    }`
  );
  console.log(
    `- Notifications: ${
      process.env.NOTIFICATION_SERVICE_URL || "http://notification-service:5002"
    }`
  );
  console.log(
    `- Reports: ${
      process.env.REPORTING_SERVICE_URL || "http://reporting-service:5003"
    }`
  );
});
