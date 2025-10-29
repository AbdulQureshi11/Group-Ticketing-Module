/**
 * Custom Error Classes for Flight Group Booking API
 * Provides robust error handling
 */

/**
 * Base Business Error Class
 */
export class BusinessError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isBusinessError = true;
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * PNR Management Errors
 */
export class NotGroupPnrModeError extends BusinessError {
  constructor(message = 'Flight group is not in GROUP_PNR mode') {
    super(message, 400);
  }
}

export class InvalidPnrFormatError extends BusinessError {
  constructor(message = 'Invalid PNR format') {
    super(message, 400);
  }
}

export class PnrAlreadyExistsError extends BusinessError {
  constructor(message = 'PNR already exists') {
    super(message, 409);
  }
}

/**
 * Status Machine Errors
 */
export class InvalidStatusTransitionError extends BusinessError {
  constructor(message = 'Invalid status transition') {
    super(message, 400);
  }
}

export class AdminRoleRequiredError extends BusinessError {
  constructor(message = 'Admin role required') {
    super(message, 403);
  }
}

export class BookingNotFoundError extends BusinessError {
  constructor(message = 'Booking not found') {
    super(message, 404);
  }
}

export class FlightGroupNotFoundError extends BusinessError {
  constructor(message = 'Flight group not found') {
    super(message, 404);
  }
}

/**
 * Seat Management Errors
 */
export class InsufficientSeatAvailabilityError extends BusinessError {
  constructor(message = 'Insufficient seat availability') {
    super(message, 409);
  }
}

export class NoSeatBucketsFoundError extends BusinessError {
  constructor(message = 'No seat buckets found') {
    super(message, 404);
  }
}

/**
 * Pricing Errors
 */
export class NoPricingBucketsFoundError extends BusinessError {
  constructor(message = 'No pricing buckets found') {
    super(message, 404);
  }
}

export class InvalidPassengerCountError extends BusinessError {
  constructor(message = 'Invalid passenger count') {
    super(message, 400);
  }
}

/**
 * Authentication & Authorization Errors
 */
export class AuthenticationError extends BusinessError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends BusinessError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
  }
}

/**
 * Validation Errors
 */
export class ValidationError extends BusinessError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

/**
 * Utility function to check if error is a business error
 */
export function isBusinessError(error) {
  return error && error.isBusinessError === true;
}

/**
 * Utility function to get error status code
 */
export function getErrorStatusCode(error) {
  if (isBusinessError(error)) {
    return error.statusCode;
  }
  return 500; // Default for unexpected errors
}
