export class NotificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationError";
  }
}

export class EmailServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailServiceError";
  }
}

export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User not found: ${userId}`);
    this.name = "UserNotFoundError";
  }
}

export class EmailNotFoundError extends Error {
  constructor(userId: string) {
    super(`No email found for user: ${userId}`);
    this.name = "EmailNotFoundError";
  }
}
