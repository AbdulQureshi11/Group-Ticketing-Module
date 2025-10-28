import { body, param, query, validationResult } from 'express-validator';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: errors.array()
    });
  }
  next();
};

/**
 * Validation rules for user creation
 */
export const validateUserCreation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('agencyCode')
    .isLength({ min: 3, max: 10 })
    .withMessage('Agency code must be between 3 and 10 characters'),
  body('role')
    .isIn(['Admin', 'Manager', 'Agent'])
    .withMessage('Role must be Admin, Manager, or Agent'),
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  handleValidationErrors
];

/**
 * Validation rules for agency creation
 */
export const validateAgencyCreation = [
  body('code')
    .isLength({ min: 3, max: 10 })
    .withMessage('Agency code must be between 3 and 10 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Agency code must be uppercase letters and numbers only'),
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Agency name must be between 2 and 100 characters'),
  body('contactEmail')
    .isEmail()
    .withMessage('Contact email must be a valid email address'),
  body('contactPhone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Contact phone must be a valid phone number'),
  handleValidationErrors
];

/**
 * Validation rules for group creation
 */
export const validateGroupCreation = [
  body('flight')
    .isLength({ min: 2, max: 10 })
    .withMessage('Flight code must be between 2 and 10 characters'),
  body('route')
    .matches(/^[A-Z]{3}-[A-Z]{3}$/)
    .withMessage('Route must be in format XXX-XXX (e.g., LHE-KHI)'),
  body('totalSeats')
    .isInt({ min: 1, max: 500 })
    .withMessage('Total seats must be between 1 and 500'),
  body('salesWindow.from')
    .isISO8601()
    .withMessage('Sales window from date must be a valid ISO date'),
  body('salesWindow.to')
    .isISO8601()
    .withMessage('Sales window to date must be a valid ISO date'),
  body('departureDate')
    .isISO8601()
    .withMessage('Departure date must be a valid ISO date'),
  handleValidationErrors
];

/**
 * Validation rules for booking creation
 */
export const validateBookingCreation = [
  body('groupId')
    .isInt({ min: 1 })
    .withMessage('Group ID must be a positive integer'),
  body('customerName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
  body('customerEmail')
    .isEmail()
    .withMessage('Customer email must be a valid email address'),
  body('customerPhone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Customer phone must be a valid phone number'),
  body('passengers')
    .isArray({ min: 1 })
    .withMessage('Passengers must be a non-empty array'),
  body('passengers.*.name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Passenger name must be between 2 and 100 characters'),
  body('passengers.*.age')
    .isInt({ min: 1, max: 120 })
    .withMessage('Passenger age must be between 1 and 120'),
  body('passengers.*.passport')
    .isLength({ min: 6, max: 20 })
    .withMessage('Passport must be between 6 and 20 characters'),
  body('seatsBooked')
    .isInt({ min: 1 })
    .withMessage('Seats booked must be a positive integer'),
  body('totalAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a non-negative number'),
  handleValidationErrors
];

/**
 * Validation rules for passenger addition
 */
export const validatePassengerAddition = [
  body('passengers')
    .isArray({ min: 1 })
    .withMessage('Passengers must be a non-empty array'),
  body('passengers.*.name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Passenger name must be between 2 and 100 characters'),
  body('passengers.*.age')
    .isInt({ min: 1, max: 120 })
    .withMessage('Passenger age must be between 1 and 120'),
  body('passengers.*.passport')
    .isLength({ min: 6, max: 20 })
    .withMessage('Passport must be between 6 and 20 characters'),
  handleValidationErrors
];

/**
 * Validation rules for passenger updates
 */
export const validatePassengerUpdate = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Passenger ID must be a positive integer'),
  body('pnr')
    .optional()
    .isLength({ min: 3, max: 10 })
    .withMessage('PNR must be between 3 and 10 characters'),
  body('ticketNumber')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('Ticket number must be between 3 and 20 characters'),
  body('seatNumber')
    .optional()
    .matches(/^[0-9]+[A-Z]$/)
    .withMessage('Seat number must be in format like 15A, 2B, etc.'),
  handleValidationErrors
];

/**
 * Validation rules for settings updates
 */
export const validateSettingsUpdate = [
  body('agencyName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Agency name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email must be a valid email address'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Phone must be a valid phone number'),
  body('currency')
    .optional()
    .isIn(['PKR', 'USD', 'EUR', 'GBP'])
    .withMessage('Currency must be PKR, USD, EUR, or GBP'),
  body('language')
    .optional()
    .isIn(['en', 'ur'])
    .withMessage('Language must be en or ur'),
  body('maxBookingsPerDay')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max bookings per day must be between 1 and 1000'),
  handleValidationErrors
];

/**
 * Validation rules for report parameters
 */
export const validateReportParams = [
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Format must be json or csv'),
  query('fromDate')
    .optional()
    .isISO8601()
    .withMessage('From date must be a valid ISO date'),
  query('toDate')
    .optional()
    .isISO8601()
    .withMessage('To date must be a valid ISO date'),
  query('agencyCode')
    .optional()
    .isLength({ min: 3, max: 10 })
    .withMessage('Agency code must be between 3 and 10 characters'),
  query('status')
    .optional()
    .isIn(['REQUESTED', 'APPROVED', 'REJECTED', 'PAYMENT_PENDING', 'PAID', 'ISSUED', 'EXPIRED', 'CANCELLED'])
    .withMessage('Invalid status value'),
  handleValidationErrors
];
