import crypto from 'crypto';
import { FlightGroup, BookingRequest, BookingPassenger } from '../../database/index.js';
import { 
  NotGroupPnrModeError, 
  FlightGroupNotFoundError, 
  InvalidPnrFormatError,
  PnrAlreadyExistsError,
  BookingNotFoundError
} from '../../core/utils/errors.js';

/**
 * PNR Management Service - Handles PNR generation and assignment
 * Supports GROUP_PNR and PER_BOOKING_PNR modes
 */
export class PNRManagementService {
  /**
   * Generate unique PNR
   * @returns {string} 6-character alphanumeric PNR
   */
  static generatePNR() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pnr = '';
    for (let i = 0; i < 6; i++) {
      pnr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pnr;
  }

  /**
   * Generate unique ticket number
   * @param {string} carrierCode - Airline carrier code
   * @returns {string} 13-digit ticket number
   */
  static generateTicketNumber(carrierCode = 'PK') {
    // Format: CARRIER-YYYYMMDD-XXXXXX (15 digits total with 6-digit random suffix)
    const date = new Date();
    const dateStr = date.getFullYear().toString() + 
                   (date.getMonth() + 1).toString().padStart(2, '0') + 
                   date.getDate().toString().padStart(2, '0');
    // Use crypto for cryptographically strong random number (0-999999)
    const random = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    return `${carrierCode}-${dateStr}-${random}`;
  }

  /**
   * Check if ticket number already exists
   * @param {string} ticketNo - Ticket number to check
   * @returns {boolean} True if ticket number exists
   */
  static async ticketNumberExists(ticketNo) {
    const existingTicket = await BookingPassenger.findOne({
      where: { ticketNo }
    });
    return !!existingTicket;
  }

  /**
   * Generate unique ticket number (collision-safe)
   * @param {string} carrierCode - Carrier code (default: 'PK')
   * @returns {string} Unique ticket number
   */
  static async generateUniqueTicketNumber(carrierCode = 'PK') {
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      const ticketNumber = this.generateTicketNumber(carrierCode);
      const exists = await this.ticketNumberExists(ticketNumber);
      
      if (!exists) {
        return ticketNumber;
      }
      
      attempts++;
    }
    
    throw new Error('Failed to generate unique ticket number after maximum attempts');
  }

  /**
   * Check if PNR already exists
   * @param {string} pnr - PNR to check
   * @returns {boolean} True if PNR exists
   */
  static async pnrExists(pnr) {
    const existingBooking = await BookingRequest.findOne({
      where: { pnr }
    });
    return !!existingBooking;
  }

  /**
   * Generate unique PNR (collision-safe)
   * @returns {string} Unique PNR
   */
  static async generateUniquePNR() {
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      const pnr = this.generatePNR();
      const exists = await this.pnrExists(pnr);
      
      if (!exists) {
        return pnr;
      }
      
      attempts++;
    }
    
    throw new PnrAlreadyExistsError('Failed to generate unique PNR after maximum attempts');
  }

  /**
   * Assign PNR to booking based on flight group mode (race-condition safe)
   * @param {string} bookingId - Booking ID
   * @param {string} flightGroupId - Flight group ID
   * @returns {Object} Updated booking with PNR
   */
  static async assignPNRToBooking(bookingId, flightGroupId) {
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      try {
        // Get flight group to determine PNR mode
        const flightGroup = await FlightGroup.findOne({
          where: { id: flightGroupId }
        });

        if (!flightGroup) {
          throw new FlightGroupNotFoundError();
        }

        const booking = await BookingRequest.findOne({
          where: { id: bookingId }
        });

        if (!booking) {
          throw new BookingNotFoundError();
        }

        let pnr;

        if (flightGroup.pnrMode === 'GROUP_PNR') {
          // For GROUP_PNR, atomically set or retrieve group PNR
          if (!flightGroup.groupPnr) {
            const newPnr = await this.generateUniquePNR();
            // Atomic update: only set if still null
            await FlightGroup.update(
              { groupPnr: newPnr },
              { where: { id: flightGroupId, groupPnr: null } }
            );
            // Re-fetch to get the winning PNR (ours or another process's)
            await flightGroup.reload();
          }
          pnr = flightGroup.groupPnr;
        } else {
          // For PER_BOOKING_PNR, generate unique PNR for this booking
          pnr = await this.generateUniquePNR();
        }

        // Update booking with PNR - this is where the race condition is prevented
        // by the database unique constraint
        await booking.update({ pnr });

        return {
          booking,
          pnr,
          pnrMode: flightGroup.pnrMode
        };

      } catch (error) {
        // Check if this is a unique constraint violation on PNR
        if (error.name === 'SequelizeUniqueConstraintError' && 
            error.errors && error.errors.some(e => e.path === 'pnr')) {
          // PNR collision occurred, retry with a new PNR
          attempts++;
          continue;
        }
        
        // Check for MySQL specific duplicate entry error
        if (error.parent && error.parent.code === 'ER_DUP_ENTRY' && 
            error.parent.message && error.parent.message.includes('pnr')) {
          // PNR collision occurred, retry with a new PNR
          attempts++;
          continue;
        }
        
        // For other errors, rethrow them
        throw error;
      }
    }
    
    throw new PnrAlreadyExistsError('Failed to assign unique PNR after maximum attempts');
  }

  /**
   * Assign PNRs to multiple bookings (for GROUP_PNR mode) - race-condition safe
   * @param {Array} bookingIds - Array of booking IDs
   * @param {string} flightGroupId - Flight group ID
   * @returns {Object} Update results
   */
  static async assignGroupPNRToBookings(bookingIds, flightGroupId) {
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      try {
        const flightGroup = await FlightGroup.findOne({
          where: { id: flightGroupId }
        });

        if (!flightGroup) {
          throw new FlightGroupNotFoundError();
        }

        if (flightGroup.pnrMode !== 'GROUP_PNR') {
          throw new NotGroupPnrModeError();
        }

        // Generate or get group PNR
        if (!flightGroup.groupPnr) {
          const newPnr = await this.generateUniquePNR();
          // Atomic update: only set if still null
          await FlightGroup.update(
            { groupPnr: newPnr },
            { where: { id: flightGroupId, groupPnr: null } }
          );
          // Re-fetch to get the winning PNR (ours or another process's)
          await flightGroup.reload();
        }
        const groupPNR = flightGroup.groupPnr;

        // Update all bookings with the same PNR - this is where the race condition
        // is prevented by the database unique constraint
        const [updatedCount] = await BookingRequest.update(
          { pnr: groupPNR },
          { 
            where: { 
              id: bookingIds,
              flightGroupId 
            }
          }
        );
        
        const bookings = await BookingRequest.findAll({
          where: { id: bookingIds, flightGroupId }
        });

        return {
          groupPNR,
          updatedCount,
          bookings
        };

      } catch (error) {
        // Check if this is a unique constraint violation on PNR
        if (error.name === 'SequelizeUniqueConstraintError' && 
            error.errors && error.errors.some(e => e.path === 'pnr')) {
          // PNR collision occurred, retry with a new PNR
          attempts++;
          continue;
        }
        
        // Check for MySQL specific duplicate entry error
        if (error.parent && error.parent.code === 'ER_DUP_ENTRY' && 
            error.parent.message && error.parent.message.includes('pnr')) {
          // PNR collision occurred, retry with a new PNR
          attempts++;
          continue;
        }
        
        // For other errors, rethrow them
        throw error;
      }
    }
    
    throw new PnrAlreadyExistsError('Failed to assign unique group PNR after maximum attempts');
  }

  /**
   * Assign ticket numbers to passengers in a booking
   * @param {string} bookingId - Booking ID
   * @param {string} carrierCode - Airline carrier code
   * @returns {Object} Updated passengers with ticket numbers
   */
  static async assignTicketNumbers(bookingId, carrierCode = 'PK') {
    const transaction = await BookingPassenger.sequelize.transaction();
    try {
      const passengers = await BookingPassenger.findAll({
        where: { bookingId },
        transaction
      });

      if (passengers.length === 0) {
        throw new BookingNotFoundError('No passengers found for this booking');
      }

      const updatedPassengers = [];
      for (const passenger of passengers) {
        const ticketNumber = await this.generateUniqueTicketNumber(carrierCode);
        await passenger.update({ ticketNo: ticketNumber }, { transaction });
        updatedPassengers.push({
          id: passenger.id,
          paxType: passenger.paxType,
          ticketNumber
        });
      }

      await transaction.commit();
      return {
        bookingId,
        carrierCode,
        assignedTickets: updatedPassengers
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Assign ticket numbers error:', error);
      throw error;
    }
  }

  /**
   * Get PNR information for a booking
   * @param {string} bookingId - Booking ID
   * @returns {Object} PNR information
   */
  static async getBookingPNRInfo(bookingId) {
    try {
      const booking = await BookingRequest.findOne({
        where: { id: bookingId },
        include: [
          {
            model: FlightGroup,
            as: 'flightGroup',
            attributes: ['id', 'pnrMode', 'groupPnr']
          },
          {
            model: BookingPassenger,
            as: 'passengers',
            attributes: ['id', 'paxType', 'firstName', 'lastName', 'pnr', 'ticketNo']
          }
        ]
      });

      if (!booking) {
        throw new BookingNotFoundError();
      }
      
      if (!booking.flightGroup) {
        throw new Error('Flight group not found for booking');
      }

      return {
        bookingId: booking.id,
        pnr: booking.pnr,
        pnrMode: booking.flightGroup?.pnrMode || null,
        groupPnr: booking.flightGroup?.groupPnr || null,
        passengers: booking.passengers,
        hasTicketNumbers: booking.passengers.some(p => p.ticketNo)
      };

    } catch (error) {
      console.error('Get booking PNR info error:', error);
      throw error;
    }
  }

  /**
   * Validate PNR format
   * @param {string} pnr - PNR to validate
   * @returns {boolean} True if valid format
   */
  static validatePNRFormat(pnr) {
    // PNR should be 6 characters, alphanumeric
    const pnrRegex = /^[A-Z0-9]{6}$/;
    return pnrRegex.test(pnr);
  }

  /**
   * Validate ticket number format
   * @param {string} ticketNumber - Ticket number to validate
   * @returns {boolean} True if valid format
   */
  static validateTicketNumberFormat(ticketNumber) {
    // Format: CARRIER-YYYYMMDD-XXXXXX
    const ticketRegex = /^[A-Z]{2}-\d{8}-\d{6}$/;
    return ticketRegex.test(ticketNumber);
  }

  /**
   * Search bookings by PNR
   * @param {string} pnr - PNR to search
   * @param {string} agencyId - Agency ID (for access control)
   * @returns {Array} Array of bookings with this PNR
   */
  static async searchBookingsByPNR(pnr, agencyId = null) {
    try {
      if (!this.validatePNRFormat(pnr)) {
        throw new InvalidPnrFormatError();
      }

      const whereClause = { pnr };
      if (agencyId) {
        whereClause.requestingAgencyId = agencyId;
      }

      const bookings = await BookingRequest.findAll({
        where: whereClause,
        include: [
          {
            model: FlightGroup,
            as: 'flightGroup',
            attributes: ['id', 'carrierCode', 'flightNumber', 'origin', 'destination', 'departureTimeUtc']
          },
          {
            model: BookingPassenger,
            as: 'passengers',
            attributes: ['id', 'paxType', 'firstName', 'lastName', 'pnr', 'ticketNo']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return bookings;

    } catch (error) {
      console.error('Search bookings by PNR error:', error);
      throw error;
    }
  }
}
