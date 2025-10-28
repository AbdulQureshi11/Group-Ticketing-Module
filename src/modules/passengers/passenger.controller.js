import { BookingPassenger } from '../../database/index.js';

/**
 * POST /bookings/:id/passengers
 * Add passengers to a booking
 * Only allowed for bookings that haven't been issued yet
 */
export const addPassengers = (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Passenger management is not yet implemented with database integration'
  });
};

/**
 * PATCH /passengers/:id
 * Update passenger details (PNR, ticket number, etc.)
 * Typically called during ticket issuance process
 */
export const updatePassenger = (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Passenger updates are not yet implemented with database integration'
  });
};
