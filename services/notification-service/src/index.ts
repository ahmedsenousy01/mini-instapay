import "dotenv/config";
import express from "express";
import { EmailService } from "./services/email.service.js";
import { NotificationService } from "./services/notification.service.js";
import client from "prom-client";

// Prometheus metrics setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

async function startServer() {
  try {
    // Initialize services
    const emailService = new EmailService();
    const notificationService = new NotificationService(emailService);

    // Verify email service connection
    const emailConnected = await emailService.verifyConnection();
    if (!emailConnected) {
      throw new Error("Failed to connect to email service");
    }

    // Express server setup
    const app = express();
    const PORT = process.env.PORT || 5002;

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        message: "Notification service is running",
        emailService: emailConnected,
      });
    });

    // Metrics endpoint
    app.get("/metrics", async (req, res) => {
      res.set("Content-Type", client.register.contentType);
      res.end(await client.register.metrics());
    });

    // Start the server
    app.listen(PORT, () => {
      console.log(`Notification service listening on port ${PORT}`);

      // Start notification processing
      notificationService.startProcessing();
      console.log("Notification processor started");
    });
  } catch (error) {
    console.error("Failed to start notification service:", error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
