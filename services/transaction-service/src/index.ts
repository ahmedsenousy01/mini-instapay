import "dotenv/config";
import express from "express";
import { clerkMiddleware } from "@clerk/express";
import accountRoutes from "./routes/accounts.js";
import transactionRoutes from "./routes/transactions.js";
import fundingRoutes from "./routes/funding.js";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(clerkMiddleware());

app.use("/v1/accounts", accountRoutes);
app.use("/v1/transfers", transactionRoutes);
app.use("/v1/funding", fundingRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Transaction service is running",
  });
});

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Transaction service listening at http://localhost:${PORT}`);
});
