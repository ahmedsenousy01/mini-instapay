import "dotenv/config";
import express from "express";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import reportsRouter from "./routes/reports.js";
import { errorHandler } from "./middleware/errorHandler.js";
import client from "prom-client";

const app = express();
const PORT = process.env.PORT || 5003;

// Prometheus metrics setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

app.use(cors());
app.use(express.json());

// Health check endpoint - before auth middleware
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Reporting service is running" });
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

// Auth and routes
app.use(clerkMiddleware());
app.use("/", reportsRouter);

// Global error handler
app.use(errorHandler);

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Reporting service listening on port ${PORT}`);
});
