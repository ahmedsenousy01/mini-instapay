import "dotenv/config";
import express from "express";
import { clerkMiddleware } from "@clerk/express";
import accountRoutes from "./routes/accounts.js";
import transactionRoutes from "./routes/transactions.js";
import fundingRoutes from "./routes/funding.js";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Health check endpoint - before auth middleware
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Transaction service is running",
  });
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
