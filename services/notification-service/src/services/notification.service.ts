import { clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { notifications } from "../db/schema.js";
import { db } from "../db/index.js";
import { EmailService } from "./email.service.js";
import {
  NotificationError,
  EmailNotFoundError,
  UserNotFoundError,
} from "../types/errors.js";

export class NotificationService {
  private emailService: EmailService;
  private isProcessing: boolean = false;

  constructor(emailService: EmailService) {
    this.emailService = emailService;
  }

  async processNotifications(): Promise<void> {
    if (this.isProcessing) {
      console.log("Notification processing already in progress, skipping...");
      return;
    }

    this.isProcessing = true;

    try {
      const unsentNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.isSent, false));

      console.log(
        `Processing ${unsentNotifications.length} unsent notifications`
      );

      for (const notification of unsentNotifications) {
        try {
          await this.processNotification(notification);
        } catch (error) {
          if (
            error instanceof UserNotFoundError ||
            error instanceof EmailNotFoundError
          ) {
            console.warn(error.message);
          } else {
            console.error(
              `Failed to process notification ${notification.id}:`,
              error
            );
          }
          // Continue with next notification
          continue;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new NotificationError(
        `Error fetching unsent notifications: ${message}`
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private async processNotification(
    notification: typeof notifications.$inferSelect
  ): Promise<void> {
    try {
      // Get user email from Clerk
      const user = await clerkClient.users.getUser(notification.userId);

      if (!user) {
        throw new UserNotFoundError(notification.userId);
      }

      const userEmail = user.emailAddresses[0]?.emailAddress;
      if (!userEmail) {
        throw new EmailNotFoundError(notification.userId);
      }

      // Send email
      await this.emailService.sendEmail(
        userEmail,
        `MiniInstaPay Notification: ${notification.type}`,
        notification.message
      );

      // Mark notification as sent
      await db
        .update(notifications)
        .set({ isSent: true })
        .where(eq(notifications.id, notification.id));

      console.log(`Sent notification ${notification.id} to ${userEmail}`);
    } catch (error) {
      if (
        error instanceof UserNotFoundError ||
        error instanceof EmailNotFoundError
      ) {
        throw error;
      }
      throw new NotificationError(
        `Failed to process notification ${notification.id}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  startProcessing(intervalMs: number = 60000): void {
    // Initial processing
    this.processNotifications().catch((error) => {
      console.error("Error in initial notification processing:", error);
    });

    // Set up interval
    setInterval(() => {
      this.processNotifications().catch((error) => {
        console.error("Error in scheduled notification processing:", error);
      });
    }, intervalMs);
  }
}
