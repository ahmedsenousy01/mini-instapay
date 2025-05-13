import "dotenv/config";
import express from "express";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import reportsRouter from "./routes/reports.js";
import { errorHandler } from "./middleware/errorHandler.js";
const app = express();
const PORT = process.env.PORT || 5003;
app.use(cors());
app.use(express.json());
// Health check endpoint - before auth middleware
app.get("/health", (req, res) => {
    res.json({ status: "ok", message: "Reporting service is running" });
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
