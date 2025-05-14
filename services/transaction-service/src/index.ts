import "dotenv/config";
import express from "express";
import { clerkMiddleware } from "@clerk/express";
import accountRoutes from "./routes/accounts.js";
import transactionRoutes from "./routes/transactions.js";
import fundingRoutes from "./routes/funding.js";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";
import client from "prom-client";

const app = express();
const PORT = process.env.PORT || 5001;

// Prometheus metrics setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

app.use(cors());
app.use(express.json());

// Health check endpoint - before auth middleware
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Transaction service is running",
  });
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

// Auth and routes
app.use(clerkMiddleware());
app.use("/v1/accounts", accountRoutes);
app.use("/v1/transfers", transactionRoutes);
app.use("/v1/funding", fundingRoutes);

// Global error handler
app.use(errorHandler);

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Transaction service listening at http://localhost:${PORT}`);
});
