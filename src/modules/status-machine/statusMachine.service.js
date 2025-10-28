import { BookingRequest, FlightGroup, BookingPassenger } from '../../database/index.js';
import { SeatManagementService } from '../seat-management/seatManagement.service.js';
import { PNRManagementService } from '../pnr-management/pnrManagement.service.js';
import { 
  BookingNotFoundError,
  InvalidStatusTransitionError,
  ValidationError,
  AdminRoleRequiredError,
  FlightGroupNotFoundError,
  InsufficientSeatAvailabilityError
} from '../../core/utils/errors.js';
import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';

/**
 * Status Machine Service - Handles booking status transitions and business rules
 * Implements complete PRD-compliant booking workflow
 */
export class StatusMachineService {
  // Valid status transitions per PRD
  static validStatusTransitions = {
    'REQUESTED': ['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
    'APPROVED': ['PAYMENT_PENDING', 'REJECTED', 'EXPIRED', 'CANCELLED'],
    'PAYMENT_PENDING': ['PAID', 'EXPIRED', 'CANCELLED'],
    'PAID': ['ISSUED', 'EXPIRED', 'CANCELLED'],
    'ISSUED': ['EXPIRED'], // Cannot cancel issued tickets
    'REJECTED': [],
    'EXPIRED': [],
    'CANCELLED': []
  };

  // Status transition business rules
  static statusRules = {
    'REQUESTED': {
      canTransitionTo: ['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
      requiredRole: 'Admin', // Admin can approve/reject/cancel
      businessRules: {
        'APPROVED': [
          'Flight group must be open',
          'Seats must be available',
          'PNR must be assigned'
        ],
        'REJECTED': [
          'Rejection reason must be provided'
        ],
        'EXPIRED': [
          'Hold period must have expired'
        ],
        'CANCELLED': [
          'Cancellation reason must be provided'
        ]
      }
    },
    'APPROVED': {
      canTransitionTo: ['PAYMENT_PENDING', 'REJECTED', 'EXPIRED', 'CANCELLED'],
      requiredRole: 'Admin',
      businessRules: {
        'PAYMENT_PENDING': [
          'Booking must be approved',
          'Payment deadline must be set'
        ],
        'REJECTED': [
          'Rejection reason must be provided'
        ],
        'CANCELLED': [
          'Cancellation reason must be provided'
        ]
      }
    },
    'PAYMENT_PENDING': {
      canTransitionTo: ['PAID', 'EXPIRED', 'CANCELLED'],
      requiredRole: 'Admin',
      businessRules: {
        'PAID': [
          'Payment proof must be uploaded',
          'Payment amount must match booking total'
        ],
        'EXPIRED': [
          'Payment deadline must have passed'
        ],
        'CANCELLED': [
          'Cancellation reason must be provided'
        ]
      }
    },
    'PAID': {
      canTransitionTo: ['ISSUED', 'EXPIRED', 'CANCELLED'],
      requiredRole: 'Admin',
      businessRules: {
        'ISSUED': [
          'Payment must be confirmed',
          'Ticket numbers must be assigned',
          'PNR must be confirmed'
        ],
        'CANCELLED': [
          'Cancellation reason must be provided',
          'Refund process must be initiated'
        ]
      }
    },
    'ISSUED': {
      canTransitionTo: ['EXPIRED'],
      requiredRole: 'Admin',
      businessRules: {
        'EXPIRED': [
          'Flight must have departed'
        ]
      }
    }
  };

  /**
   * Validate status transition
   * @param {string} currentStatus - Current booking status
   * @param {string} newStatus - Target status
   * @param {Object} user - User making the transition
   * @param {Object} additionalData - Additional data for validation
   * @returns {Object} Validation result
   */
  static async validateStatusTransition(currentStatus, newStatus, user, additionalData = {}) {
    // Check if transition is valid
    const allowedTransitions = this.validStatusTransitions[currentStatus];
    if (!allowedTransitions) {
      throw new InvalidStatusTransitionError(`Invalid current status: '${currentStatus}'`);
    }
    
    if (!allowedTransitions.includes(newStatus)) {
      throw new InvalidStatusTransitionError(`Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowedTransitions.join(', ')}`);
    }

    // Check user role
    const rules = this.statusRules[currentStatus];
    if (rules && rules.requiredRole) {
      if (rules.requiredRole === 'Admin' && user.role !== 'Admin') {
        throw new AdminRoleRequiredError(`Admin role required to transition from '${currentStatus}' to '${newStatus}'`);
      }
    }

    // Apply business rules
    if (rules && rules.businessRules[newStatus]) {
      for (const rule of rules.businessRules[newStatus]) {
        await this.applyBusinessRule(rule, additionalData);
      }
    }

    return { valid: true };
  }

  /**
   * Apply business rule for status transition
   * @param {string} rule - Business rule description
   * @param {Object} data - Data for rule validation
   * @returns {Object} Rule validation result
   */
  static async applyBusinessRule(rule, data) {
    switch (rule) {
      case 'Flight group must be open':
        if (!data.flightGroup || data.flightGroup.status !== 'open') {
          throw new ValidationError('Flight group is not open for bookings');
        }
        break;

      case 'Seats must be available':
        if (!data.availability || !data.availability.canBook) {
          throw new InsufficientSeatAvailabilityError();
        }
        break;

      case 'PNR must be assigned':
        if (!data.booking || !data.booking.pnr) {
          throw new ValidationError('PNR must be assigned before approval');
        }
        break;

      case 'Rejection reason must be provided':
        if (!data.rejectionReason || data.rejectionReason.trim() === '') {
          throw new ValidationError('Rejection reason is required');
        }
        break;

      case 'Cancellation reason must be provided':
        if (!data.cancellationReason || data.cancellationReason.trim() === '') {
          throw new ValidationError('Cancellation reason is required');
        }
        break;

      case 'Refund process must be initiated':
        if (!data.refundInitiated) {
          throw new ValidationError('Refund process must be initiated for paid bookings');
        }
        break;

      case 'Hold period must have expired':
        if (!data.booking || data.booking.holdExpiresAt > new Date()) {
          throw new ValidationError('Hold period has not expired yet');
        }
        break;

      case 'Payment deadline must be set':
        if (!data.paymentDeadline) {
          throw new ValidationError('Payment deadline must be set');
        }
        break;

      case 'Payment proof must be uploaded':
        if (!data.paymentProof) {
          throw new ValidationError('Payment proof must be uploaded');
        }
        break;

      case 'Payment amount must match booking total':
        if (data.paymentAmount !== data.bookingTotal) {
          throw new ValidationError(`Payment amount (${data.paymentAmount}) does not match booking total (${data.bookingTotal})`);
        }
        break;

      case 'Payment deadline must have passed':
        if (!data.booking || data.booking.paymentDeadline > new Date()) {
          throw new ValidationError('Payment deadline has not passed yet');
        }
        break;

      case 'Payment must be confirmed':
        if (!data.paymentConfirmed) {
          throw new ValidationError('Payment must be confirmed before issuing tickets');
        }
        break;

      case 'Ticket numbers must be assigned':
        if (!data.ticketNumbersAssigned) {
          throw new ValidationError('Ticket numbers must be assigned before issuing');
        }
        break;

      case 'PNR must be confirmed':
        if (!data.pnrConfirmed) {
          throw new ValidationError('PNR must be confirmed before issuing');
        }
        break;

      case 'Flight must have departed':
        if (!data.flightDeparted) {
          throw new ValidationError('Flight must have departed before expiry');
        }
        break;

      default:
        console.warn(`Unknown business rule: ${rule}`);
    }

    return { valid: true };
  }

  /**
   * Transition booking status
   * @param {string} bookingId - Booking ID
   * @param {string} newStatus - New status
   * @param {Object} user - User making the transition
   * @param {Object} transitionData - Additional data for transition
   * @param {Object} transaction - Existing transaction (optional)
   * @returns {Object} Transition result
   */
  static async transitionBookingStatus(bookingId, newStatus, user, transitionData = {}, transaction = null) {
    // Use provided transaction or create new one
    const localTransaction = transaction || await sequelize.transaction();
    const transactionToUse = transaction || localTransaction;
    
    try {
      // Get booking with associations
      const booking = await BookingRequest.findOne({
        where: { id: bookingId },
        include: [
          {
            model: FlightGroup,
            as: 'flightGroup',
            attributes: ['id', 'status', 'pnrMode', 'groupPnr']
          }
        ],
        transaction: transactionToUse
      });

      if (!booking) {
        if (!transaction) await localTransaction.rollback();
        throw new BookingNotFoundError();
      }

      // Prepare validation data
      const validationData = {
        ...transitionData,
        booking,
        flightGroup: booking.flightGroup
      };

      // Validate transition and handle result
      const validationResult = await this.validateStatusTransition(
        booking.status,
        newStatus,
        user,
        validationData
      );

      if (!validationResult.valid) {
        if (!transaction) await localTransaction.rollback();
        throw new InvalidStatusTransitionError(validationResult.error || 'Status transition validation failed');
      }

      // Prepare update data
      const updateData = {
        status: newStatus,
        updatedAt: new Date()
      };

      // Add status-specific data
      if (newStatus === 'APPROVED') {
        updateData.approvalUserId = user.id;
        updateData.approvalAt = new Date();
        
        // Assign PNR if not already assigned
        if (!booking.pnr) {
          const pnrResult = await PNRManagementService.assignPNRToBooking(
            bookingId,
            booking.flightGroupId
          );
          updateData.pnr = pnrResult.pnr;
        }
      }

      if (newStatus === 'REJECTED') {
        updateData.rejectionReason = transitionData.rejectionReason;
        updateData.approvalUserId = user.id;
        updateData.approvalAt = new Date();
        
        // Release held seats
        const passengers = {
          adults: booking.paxAdults,
          children: booking.paxChildren,
          infants: booking.paxInfants
        };
        await SeatManagementService.releaseHeldSeats(
          booking.flightGroupId,
          passengers,
          transactionToUse
        );
      }

      if (newStatus === 'PAYMENT_PENDING') {
        updateData.paymentDeadline = transitionData.paymentDeadline;
      }

      if (newStatus === 'PAID') {
        updateData.paymentReference = transitionData.paymentReference;
        updateData.paymentReceivedAt = new Date();
      }

      if (newStatus === 'ISSUED') {
        // Move seats from on_hold to issued
        const passengers = {
          adults: booking.paxAdults,
          children: booking.paxChildren,
          infants: booking.paxInfants
        };
        await SeatManagementService.issueSeats(
          booking.flightGroupId,
          passengers,
          transactionToUse
        );
      }

      // Update booking
      await booking.update(updateData, { transaction: transactionToUse });

      if (!transaction) await localTransaction.commit();

      // Get updated booking - use outer transaction if provided, otherwise no transaction
      const updatedBooking = await BookingRequest.findOne({
        where: { id: bookingId },
        include: [
          {
            model: FlightGroup,
            as: 'flightGroup',
            attributes: ['id', 'carrierCode', 'flightNumber', 'origin', 'destination']
          },
          {
            model: BookingPassenger,
            as: 'passengers',
            attributes: ['id', 'paxType', 'firstName', 'lastName', 'pnr', 'ticketNo']
          }
        ],
        ...(transaction && { transaction })
      });

      return {
        success: true,
        booking: updatedBooking,
        previousStatus: booking.status,
        newStatus,
        transitionedBy: user.id
      };

    } catch (error) {
      if (!transaction) await localTransaction.rollback();
      console.error('Transition booking status error:', error);
      throw error;
    }
  }

  /**
   * Process automated status transitions (background job)
   * @returns {Object} Processing results
   */
  static async processAutomatedTransitions() {
    const transaction = await sequelize.transaction();
    
    try {
      const results = {
        expired: 0,
        paymentExpired: 0,
        flightExpired: 0
      };

      // Process expired holds (REQUESTED -> EXPIRED)
      const expiredHolds = await BookingRequest.findAll({
        where: {
          status: 'REQUESTED',
          holdExpiresAt: {
            [Op.lt]: new Date()
          }
        },
        transaction
      });

      for (const booking of expiredHolds) {
        await this.transitionBookingStatus(
          booking.id,
          'EXPIRED',
          { id: 'system', role: 'Admin' },
          { holdExpired: true },
          transaction  // Pass the existing transaction
        );
        results.expired++;
      }

      // Process expired payments (PAYMENT_PENDING -> EXPIRED)
      const expiredPayments = await BookingRequest.findAll({
        where: {
          status: 'PAYMENT_PENDING',
          paymentDeadline: {
            [Op.lt]: new Date()
          }
        },
        transaction
      });

      for (const booking of expiredPayments) {
        await this.transitionBookingStatus(
          booking.id,
          'EXPIRED',
          { id: 'system', role: 'Admin' },
          { paymentDeadlinePassed: true },
          transaction  // Pass the existing transaction
        );
        results.paymentExpired++;
      }

      // Process departed flights (ISSUED -> EXPIRED)
      const departedFlights = await BookingRequest.findAll({
        where: {
          status: 'ISSUED'
        },
        include: [
          {
            model: FlightGroup,
            as: 'flightGroup',
            where: {
              departureTimeUtc: {
                [Op.lt]: new Date()
              }
            }
          }
        ],
        transaction
      });

      for (const booking of departedFlights) {
        await this.transitionBookingStatus(
          booking.id,
          'EXPIRED',
          { id: 'system', role: 'Admin' },
          { flightDeparted: true },
          transaction  // Pass the existing transaction
        );
        results.flightExpired++;
      }

      await transaction.commit();

      return {
        success: true,
        processed: results,
        totalProcessed: results.expired + results.paymentExpired + results.flightExpired,
        message: `Processed ${results.expired} expired holds, ${results.paymentExpired} expired payments, ${results.flightExpired} departed flights`
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Process automated transitions error:', error);
      throw error;
    }
  }

  /**
   * Get status transition history for a booking
   * @param {string} bookingId - Booking ID
   * @returns {Array} Status history
   */
  static async getBookingStatusHistory(bookingId) {
    try {
      const booking = await BookingRequest.findOne({
        where: { id: bookingId },
        attributes: ['id', 'status', 'createdAt', 'updatedAt', 'approvalAt', 'paymentReceivedAt']
      });

      if (!booking) {
        throw new BookingNotFoundError();
      }

      const history = [
        {
          status: 'REQUESTED',
          timestamp: booking.createdAt,
          changedBy: 'system'
        }
      ];

      if (booking.approvalAt) {
        history.push({
          status: booking.status === 'REJECTED' ? 'REJECTED' : 'APPROVED',
          timestamp: booking.approvalAt,
          changedBy: booking.approvalUserId
        });
      }

      if (booking.paymentReceivedAt) {
        history.push({
          status: 'PAID',
          timestamp: booking.paymentReceivedAt,
          changedBy: 'system'
        });
      }

      if (booking.updatedAt > booking.createdAt && !booking.approvalAt && !booking.paymentReceivedAt) {
        history.push({
          status: booking.status,
          timestamp: booking.updatedAt,
          changedBy: 'system'
        });
      }

      return history;

    } catch (error) {
      console.error('Get booking status history error:', error);
      throw error;
    }
  }

  /**
   * Get available transitions for a booking status
   * @param {string} status - Current status
   * @param {string} userRole - User role
   * @returns {Array} Available transitions
   */
  static getAvailableTransitions(status, userRole) {
    const transitions = this.validStatusTransitions[status] || [];
    
    // Filter by user role
    if (userRole !== 'Admin') {
      return []; // Non-admins cannot initiate status transitions
    }

    return transitions.map(transition => ({
      status: transition,
      rules: this.statusRules[status]?.businessRules[transition] || []
    }));
  }
}
