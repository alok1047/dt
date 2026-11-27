/**
 * Centralized Application Error Classes
 * Context: Fitness Coaching App (Workout Plans and Progress Analytics)
 */

class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = "INTERNAL_SERVER_ERROR", details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true; // Distinguishes operational errors from programming bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = "Validation failed for request input", details = null) {
    super(message, 422, "VALIDATION_ERROR", details);
  }
}

class BadRequestError extends AppError {
  constructor(message = "Bad request syntax or parameters", details = null) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Requested resource not found", details = null) {
    super(message, 404, "NOT_FOUND", details);
  }
}

class BusinessRuleError extends AppError {
  constructor(message = "Business rule constraint violated", details = null) {
    super(message, 422, "BUSINESS_RULE_VIOLATION", details);
  }
}

module.exports = {
  AppError,
  ValidationError,
  BadRequestError,
  NotFoundError,
  BusinessRuleError,
};
