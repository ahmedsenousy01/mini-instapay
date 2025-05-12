import nodemailer, { Transporter } from "nodemailer";
import { EmailServiceError } from "../types/errors.js";

export class EmailService {
  private transporter: Transporter;
  private readonly fromEmail: string;

  constructor() {
    this.fromEmail = process.env.SENDING_EMAIL || "noreply@miniinstapay.com";
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GOOGLE_EMAIL,
        pass: process.env.GOOGLE_APP_PASSWORD,
      },
    });
  }

  async sendEmail(to: string, subject: string, message: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject,
        text: message,
      });
    } catch (error) {
      console.error("Failed to send email:", error);
      throw new EmailServiceError(
        `Failed to send email to ${to}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("Email service verification failed:", error);
      return false;
    }
  }
}
