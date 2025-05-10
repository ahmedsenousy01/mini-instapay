import { ErrorRequestHandler } from "express";
import { BaseError } from "../types/errors.js";
import { z } from "zod";
import { DrizzleError } from "drizzle-orm";

export const errorHandler: ErrorRequestHandler = (
  error: Error,
  req,
  res,
  next
) => {
  console.error("Error:", {
    name: error.name,
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Handle custom errors
  if (error instanceof BaseError) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
    });
    return;
  }

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Invalid request parameters",
      details: error.errors,
    });
    return;
  }

  // Handle database errors
  if (error instanceof DrizzleError) {
    res.status(500).json({
      error: "DATABASE_ERROR",
      message: "A database error occurred",
    });
    return;
  }

  // Handle all other errors
  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
};
