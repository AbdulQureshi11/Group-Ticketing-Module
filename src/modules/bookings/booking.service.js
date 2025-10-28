import { BookingRequest, FlightGroup, BookingPassenger, GroupSeatBucket, AgencySettings, Agency } from '../../database/index.js';
import { PricingService } from '../pricing/pricing.service.js';
import { SeatManagementService } from '../seat-management/seatManagement.service.js';
import { PNRManagementService } from '../pnr-management/pnrManagement.service.js';
import { StatusMachineService } from '../status-machine/statusMachine.service.js';
import { AuditService } from '../../services/audit.service.js';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../../config/database.js';

/**
 * Booking Service - Core booking orchestration service
 * Handles complete booking lifecycle with pricing, seat management, PNR, and status transitions
 */
export class BookingService {
  /**
   * Create a new booking request
   * @param {Object} bookingData - Booking creation data
   * @param {string} bookingData.flightGroupId - Flight group ID
   * @param {Object} bookingData.passengers - Passenger counts {adults, children, infants}
   * @param {string} bookingData.agencyId - Requesting agency ID
   * @param {string} bookingData.userId - User ID creating the booking
   * @param {Object} bookingData.options - Additional options {remarks, holdHours}
   * @returns {Object} Created booking with pricing and flight details
   */
  static async createBooking(bookingData) {
    const transaction = await sequelize.transaction();

    try {
      const {
        flightGroupId,
        passengers,
        agencyId,
        userId,
        options = {}
      } = bookingData;

      // Validate input
      this.validateBookingInput(bookingData);

      // Check flight availability and get flight group
      const flightGroup = await this.validateFlightAvailability(flightGroupId, passengers, transaction);

      // Calculate pricing
      const pricing = await PricingService.calculateBookingPricing(flightGroupId, passengers);

      // Reserve seats
      await SeatManagementService.holdSeats(flightGroupId, passengers, transaction);

      // Create booking request
      const booking = await this.createBookingRecord({
        flightGroupId,
        passengers,
        agencyId,
        userId,
        options,
        pricing
      }, transaction);

      await transaction.commit();

      // Log audit
      await AuditService.logUserAction({
        userId,
        action: 'CREATE_BOOKING',
        resource: 'booking_request',
        resourceId: booking.id,
        details: {
          flightGroupId,
          ...passengers,
          totalAmount: pricing.totals?.totalFare,
          currency: pricing.currency
        }
      });

      return booking;

    } catch (error) {
      await transaction.rollback();
      console.error('BookingService.createBooking error:', error);
      throw error;
    }
  }

  /**
   * Get booking by ID with full details
   * @param {string} bookingId - Booking ID
   * @param {string} agencyId - Agency ID for access control
   * @returns {Object} Complete booking details
   */
  static async getBooking(bookingId, agencyId) {
    const booking = await BookingRequest.findOne({
      where: { id: bookingId },
      include: [
        {
          model: FlightGroup,
          as: 'flightGroup',
          attributes: ['id', 'carrierCode', 'flightNumber', 'origin', 'destination', 'departureTimeUtc', 'arrivalTimeUtc', 'pnrMode'],
          include: [{
            model: Agency,
            as: 'agency',
            attributes: ['id', 'name', 'code']
          }]
        },
        {
          model: BookingPassenger,
          as: 'passengers',
          attributes: ['id', 'firstName', 'lastName', 'paxType', 'pnr', 'ticketNo']
        }
      ],
      attributes: { exclude: ['deletedAt'] }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check agency access
    if (booking.requestingAgencyId !== agencyId) {
      throw new Error('Access denied: Can only access your own agency bookings');
    }

    return booking;
  }

  /**
   * Update booking details (not status - use status machine for that)
   * @param {string} bookingId - Booking ID
   * @param {Object} updates - Fields to update
   * @param {string} agencyId - Agency ID for access control
   * @param {string} userId - User ID making the update
   * @returns {Object} Updated booking
   */
  static async updateBooking(bookingId, updates, agencyId, userId) {
    const transaction = await sequelize.transaction();

    try {
      const booking = await BookingRequest.findOne({
        where: { id: bookingId },
        transaction
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Check agency access
      if (booking.requestingAgencyId !== agencyId) {
        throw new Error('Access denied: Can only update your own agency bookings');
      }

      // Validate updates
      const allowedUpdates = ['remarks'];
      const filteredUpdates = {};
      for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = value;
        }
      }

      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      await booking.update(filteredUpdates, { transaction });
      await transaction.commit();

      // Log audit
      await AuditService.logUserAction({
        userId,
        action: 'UPDATE_BOOKING',
        resource: 'booking_request',
        resourceId: bookingId,
        details: filteredUpdates
      });

      return await this.getBooking(bookingId, agencyId);

    } catch (error) {
      await transaction.rollback();
      console.error('BookingService.updateBooking error:', error);
      throw error;
    }
  }

  /**
   * Cancel a booking
   * @param {string} bookingId - Booking ID
   * @param {string} agencyId - Agency ID for access control
   * @param {string} userId - User ID making the cancellation
   * @param {string} reason - Cancellation reason
   * @returns {Object} Cancelled booking
   */
  static async cancelBooking(bookingId, agencyId, userId, reason = null) {
    const transaction = await sequelize.transaction();

    try {
      const booking = await BookingRequest.findOne({
        where: { id: bookingId },
        include: [{
          model: FlightGroup,
          as: 'flightGroup',
          include: [{
            model: GroupSeatBucket,
            as: 'seatBuckets'
          }]
        }],
        transaction
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Check agency access
      if (booking.requestingAgencyId !== agencyId) {
        throw new Error('Access denied: Can only cancel your own agency bookings');
      }

      // Use status machine to transition to cancelled
      const cancelledBooking = await StatusMachineService.transitionBookingStatus(
        bookingId,
        'CANCELLED',
        userId,
        { reason },
        transaction
      );

      // Release seats if booking was not yet issued
      if (booking.status !== 'ISSUED') {
        const passengers = {
          adults: booking.paxAdults,
          children: booking.paxChildren,
          infants: booking.paxInfants
        };
        await SeatManagementService.releaseHeldSeats(booking.flightGroupId, passengers, transaction);
      }

      await transaction.commit();

      return cancelledBooking;

    } catch (error) {
      await transaction.rollback();
      console.error('BookingService.cancelBooking error:', error);
      throw error;
    }
  }

  /**
   * Confirm a booking (move from REQUESTED to APPROVED)
   * @param {string} bookingId - Booking ID
   * @param {string} agencyId - Agency ID for access control
   * @param {string} userId - User ID approving the booking
   * @returns {Object} Approved booking
   */
  static async confirmBooking(bookingId, agencyId, userId) {
    const transaction = await sequelize.transaction();

    try {
      // Use status machine to transition to approved
      const approvedBooking = await StatusMachineService.transitionBookingStatus(
        bookingId,
        'APPROVED',
        userId,
        {},
        transaction
      );

      // Check agency access
      if (approvedBooking.requestingAgencyId !== agencyId) {
        throw new Error('Access denied: Can only confirm your own agency bookings');
      }

      // Assign PNR to the booking
      await PNRManagementService.assignPNRToBooking(bookingId, approvedBooking.flightGroupId);

      await transaction.commit();

      return approvedBooking;

    } catch (error) {
      await transaction.rollback();
      console.error('BookingService.confirmBooking error:', error);
      throw error;
    }
  }

  /**
   * Process payment for a booking
   * @param {string} bookingId - Booking ID
   * @param {string} agencyId - Agency ID for access control
   * @param {string} userId - User ID processing payment
   * @param {Object} paymentData - Payment details
   * @returns {Object} Paid booking
   */
  static async processPayment(bookingId, agencyId, userId, paymentData) {
    const transaction = await sequelize.transaction();

    try {
      // Use status machine to transition to paid
      const paidBooking = await StatusMachineService.transitionBookingStatus(
        bookingId,
        'PAID',
        userId,
        paymentData,
        transaction
      );

      // Check agency access
      if (paidBooking.requestingAgencyId !== agencyId) {
        throw new Error('Access denied: Can only process payments for your own agency bookings');
      }

      // Convert held seats to issued
      const passengers = {
        adults: paidBooking.paxAdults,
        children: paidBooking.paxChildren,
        infants: paidBooking.paxInfants
      };
      await SeatManagementService.issueSeats(paidBooking.flightGroupId, passengers, transaction);

      await transaction.commit();

      return paidBooking;

    } catch (error) {
      await transaction.rollback();
      console.error('BookingService.processPayment error:', error);
      throw error;
    }
  }

  /**
   * Issue tickets for a paid booking
   * @param {string} bookingId - Booking ID
   * @param {string} agencyId - Agency ID for access control
   * @param {string} userId - User ID issuing tickets
   * @returns {Object} Issued booking with tickets
   */
  static async issueTickets(bookingId, agencyId, userId) {
    const transaction = await sequelize.transaction();

    try {
      // Use status machine to transition to issued
      const issuedBooking = await StatusMachineService.transitionBookingStatus(
        bookingId,
        'ISSUED',
        userId,
        {},
        transaction
      );

      // Check agency access
      if (issuedBooking.requestingAgencyId !== agencyId) {
        throw new Error('Access denied: Can only issue tickets for your own agency bookings');
      }

      // Assign ticket numbers to passengers
      const bookingWithPassengers = await BookingRequest.findOne({
        where: { id: bookingId },
        include: [{
          model: BookingPassenger,
          as: 'passengers'
        }],
        transaction
      });

      if (bookingWithPassengers.passengers && bookingWithPassengers.passengers.length > 0) {
        await PNRManagementService.assignTicketNumbers(bookingId, issuedBooking.flightGroup.carrierCode);
      }

      await transaction.commit();

      return issuedBooking;

    } catch (error) {
      await transaction.rollback();
      console.error('BookingService.issueTickets error:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Validate booking input data
   * @param {Object} data - Booking data to validate
   */
  static validateBookingInput(data) {
    const { flightGroupId, passengers, agencyId, userId } = data;

    if (!flightGroupId || typeof flightGroupId !== 'string') {
      throw new Error('Valid flightGroupId is required');
    }

    if (!passengers || typeof passengers !== 'object') {
      throw new Error('Passengers object is required');
    }

    const { adults = 0, children = 0, infants = 0 } = passengers;
    const totalPassengers = adults + children + infants;

    if (totalPassengers === 0) {
      throw new Error('At least one passenger is required');
    }

    if (totalPassengers > 50) {
      throw new Error('Maximum 50 passengers allowed per booking');
    }

    if (adults < 0 || children < 0 || infants < 0) {
      throw new Error('Passenger counts cannot be negative');
    }

    if (!agencyId || typeof agencyId !== 'string') {
      throw new Error('Valid agencyId is required');
    }

    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required');
    }
  }

  /**
   * Validate flight availability and return flight group
   * @param {string} flightGroupId - Flight group ID
   * @param {Object} passengers - Passenger counts
   * @param {Object} transaction - Database transaction
   * @returns {Object} Flight group with seat buckets
   */
  static async validateFlightAvailability(flightGroupId, passengers, transaction) {
    const flightGroup = await FlightGroup.findOne({
      where: {
        id: flightGroupId,
        status: 'PUBLISHED'
      },
      include: [{
        model: GroupSeatBucket,
        as: 'seatBuckets'
      }],
      transaction
    });

    if (!flightGroup) {
      throw new Error('Flight group not found or not published');
    }

    // Check sales window
    const now = new Date();
    if (now < flightGroup.salesStart || now > flightGroup.salesEnd) {
      throw new Error('Flight group is not within sales window');
    }

    // Check seat availability
    const { adults = 0, children = 0, infants = 0 } = passengers;
    const passengerTypes = { ADT: adults, CHD: children, INF: infants };

    for (const [paxType, count] of Object.entries(passengerTypes)) {
      if (count > 0) {
        const bucket = flightGroup.seatBuckets.find(b => b.paxType === paxType);
        if (!bucket) {
          throw new Error(`No seat bucket found for passenger type ${paxType}`);
        }

        const available = bucket.totalSeats - bucket.seatsOnHold - bucket.seatsIssued;
        if (available < count) {
          throw new Error(`Insufficient seats for ${paxType}. Requested: ${count}, Available: ${available}`);
        }
      }
    }

    return flightGroup;
  }

  /**
   * Create booking record with proper settings
   * @param {Object} params - Booking parameters
   * @param {Object} transaction - Database transaction
   * @returns {Object} Created booking
   */
  static async createBookingRecord(params, transaction) {
    const { flightGroupId, passengers, agencyId, userId, options, pricing } = params;

    // Get agency settings for hold duration
    const agencySettings = await AgencySettings.findOne({
      where: { agencyId },
      transaction
    });

    const defaultHoldHours = agencySettings?.defaultHoldHours || 24;
    const requestedHoldHours = options.holdHours || defaultHoldHours;
    const holdHours = Math.max(1, Math.min(72, requestedHoldHours)); // Clamp to 1-72 hours

    const holdExpiresAt = new Date();
    holdExpiresAt.setHours(holdExpiresAt.getHours() + holdHours);

    // Create booking
    const booking = await BookingRequest.create({
      id: uuidv4(),
      flightGroupId,
      requestingAgencyId: agencyId,
      requestedByUserId: userId,
      paxAdults: passengers.adults || 0,
      paxChildren: passengers.children || 0,
      paxInfants: passengers.infants || 0,
      status: 'REQUESTED',
      holdExpiresAt,
      remarks: options.remarks || null
    }, { transaction });

    return booking;
  }
}

export default BookingService;
