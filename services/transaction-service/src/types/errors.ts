export class BaseError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_SERVER_ERROR"
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string) {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ValidationError extends BaseError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message, 404, "NOT_FOUND");
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string) {
    super(message, 500, "DATABASE_ERROR");
  }
}

export class DateRangeError extends ValidationError {
  constructor(message: string = "Invalid date range") {
    super(message);
    this.code = "INVALID_DATE_RANGE";
  }
}

export class InvalidScopeError extends ValidationError {
  constructor(message: string = "Invalid scope") {
    super(message);
    this.code = "INVALID_SCOPE";
  }
}

export class TransactionError extends BaseError {
  constructor(message: string, code: string = "TRANSACTION_ERROR") {
    super(message, 400, code);
  }
}
