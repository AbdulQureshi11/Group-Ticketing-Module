import { BookingRequest, FlightGroup, BookingPassenger, PaymentProof, GroupSeatBucket, User, Agency } from '../../database/index.js';
import { StatusMachineService } from '../status-machine/statusMachine.service.js';
import { SeatManagementService } from '../seat-management/seatManagement.service.js';
import { PNRManagementService } from '../pnr-management/pnrManagement.service.js';
import { AuditService } from '../../services/audit.service.js';
import { ROLES } from '../../core/constants/roles.js';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../../config/database.js';

// Valid status transitions per PRD
const validStatusTransitions = {
  'REQUESTED': ['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
  'APPROVED': ['PAYMENT_PENDING', 'REJECTED', 'EXPIRED', 'CANCELLED'],
  'PAYMENT_PENDING': ['PAID', 'EXPIRED', 'CANCELLED'],
  'PAID': ['ISSUED', 'EXPIRED', 'CANCELLED'],
  'ISSUED': ['EXPIRED'], // Cannot cancel issued tickets
  'REJECTED': [],
  'EXPIRED': [],
  'CANCELLED': []
};

/**
 * POST /bookings/:id/approve
 * Approve booking (Admin/Manager only)
 */
export const approveBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userAgencyCode = req.user.agencyCode;

    const booking = await BookingRequest.findOne({
      where: { id: parseInt(id) },
      include: [{ model: FlightGroup, as: 'flightGroup' }]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check agency access
    if (booking.requestingAgencyId !== userAgencyCode) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Validate status transition
    if (!validStatusTransitions[booking.status].includes('APPROVED')) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve booking with status '${booking.status}'`
      });
    }

    // Capture previous status for audit logging
    const previousStatus = booking.status;

    // Update booking with approval info
    await booking.update({
      status: 'APPROVED',
      approvalUserId: req.user.id,
      approvalAt: new Date()
    });

    // Log the booking approval to audit
    await AuditService.logBookingChange({
      bookingId: booking.id,
      action: 'APPROVE_BOOKING',
      previousStatus,
      newStatus: 'APPROVED',
      userId: req.user.id,
      details: {
        flightGroupId: booking.flightGroupId,
        paxAdults: booking.paxAdults,
        paxChildren: booking.paxChildren,
        paxInfants: booking.paxInfants
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Booking approved successfully',
      data: {
        id: booking.id,
        status: booking.status,
        approvalUserId: booking.approvalUserId,
        approvalAt: booking.approvalAt
      }
    });

  } catch (error) {
    console.error('Approve booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /bookings/:id/reject
 * Reject booking (Admin/Manager only) - releases held seats
 */
export const rejectBooking = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const userRole = req.user.role;
    const userAgencyId = req.user.agencyId;

    const booking = await BookingRequest.findOne({
      where: { id },
      include: [
        { 
          model: FlightGroup, 
          as: 'flightGroup',
          include: [{
            model: GroupSeatBucket,
            as: 'seatBuckets'
          }]
        }
      ],
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check agency access
    if (userRole !== 'ADMIN' && booking.requestingAgencyId !== userAgencyId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Validate status transition
    if (!validStatusTransitions[booking.status].includes('REJECTED')) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot reject booking with status '${booking.status}'`
      });
    }

    // Release held seats if booking was holding seats
    if (booking.status === 'REQUESTED') {
      await SeatManagementService.releaseSeats(
        booking.flightGroupId,
        {
          adults: booking.paxAdults,
          children: booking.paxChildren,
          infants: booking.paxInfants
        },
        transaction
      );
    }

    // Capture previous status for audit logging
    const previousStatus = booking.status;

    // Update booking with rejection info
    await booking.update({
      status: 'REJECTED',
      rejectionReason: rejectionReason || null
    }, { transaction });

    await transaction.commit();

    // Log the booking rejection to audit
    await AuditService.logBookingChange({
      bookingId: booking.id,
      action: 'REJECT_BOOKING',
      previousStatus,
      newStatus: 'REJECTED',
      userId: req.user.id,
      details: {
        flightGroupId: booking.flightGroupId,
        rejectionReason,
        paxAdults: booking.paxAdults,
        paxChildren: booking.paxChildren,
        paxInfants: booking.paxInfants
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Booking rejected successfully',
      data: {
        id: booking.id,
        status: 'REJECTED',
        rejectionReason: booking.rejectionReason
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Reject booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /bookings/:id/payment-proof
 * Upload payment proof - transitions booking to PAYMENT_PENDING if approved
 */
export const uploadPaymentProof = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { fileUrl, bankName, amount, currency, referenceNo } = req.body;
    const userRole = req.user.role;
    const userAgencyId = req.user.agencyId;
    const userId = req.user.id;

    // Validate required input fields
    if (!fileUrl) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'fileUrl is required'
      });
    }

    // Validate fileUrl format (basic URL validation)
    if (typeof fileUrl !== 'string' || !fileUrl.trim()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'fileUrl must be a valid string'
      });
    }

    const booking = await BookingRequest.findOne({
      where: { id },
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check agency access
    if (userRole !== 'ADMIN' && booking.requestingAgencyId !== userAgencyId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Perform payment proof upload within a transaction to prevent race conditions
    let statusTransitioned = false;
    
    try {
      // Create payment proof record
      const paymentProof = await PaymentProof.create({
        id: uuidv4(),
        bookingId: booking.id,
        fileUrl: fileUrl.trim(),
        bankName: bankName?.trim() || null,
        amount: amount ? parseFloat(amount) : null,
        currency: currency?.trim() || null,
        referenceNo: referenceNo?.trim() || null,
        uploadedByUserId: userId
      }, { transaction });

      // Update booking status if appropriate
      if (booking.status === 'APPROVED') {
        // Validate status transition for consistency
        if (!validStatusTransitions[booking.status].includes('PAYMENT_PENDING')) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Cannot transition from '${booking.status}' to 'PAYMENT_PENDING'`
          });
        }
        await booking.update({ status: 'PAYMENT_PENDING' }, { transaction });
        statusTransitioned = true;
      }

      await transaction.commit();

    } catch (error) {
      await transaction.rollback();
      console.error('Upload payment proof error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }

    // Log the payment proof upload to audit
    await AuditService.logUserAction({
      userId,
      action: 'UPLOAD_PAYMENT_PROOF',
      resource: 'payment_proof',
      resourceId: paymentProof.id,
      details: {
        bookingId: booking.id,
        bankName,
        amount,
        currency,
        referenceNo,
        fileUrl: paymentProof.fileUrl
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Log booking status change if transitioned
    if (statusTransitioned) {
      await AuditService.logBookingChange({
        bookingId: booking.id,
        action: 'PAYMENT_PROOF_UPLOADED',
        previousStatus: 'APPROVED',
        newStatus: 'PAYMENT_PENDING',
        userId,
        details: { paymentProofId: paymentProof.id },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    res.json({
      success: true,
      message: 'Payment proof uploaded successfully',
      data: {
        id: paymentProof.id,
        bookingId: paymentProof.bookingId,
        fileUrl: paymentProof.fileUrl,
        bankName: paymentProof.bankName,
        amount: paymentProof.amount,
        currency: paymentProof.currency,
        referenceNo: paymentProof.referenceNo,
        uploadedAt: paymentProof.uploadedAt
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Upload payment proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /bookings/:id/mark-paid
 * Mark booking as paid (Admin/Manager only) - converts held seats to issued
 */
export const markBookingPaid = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { paymentReference } = req.body;
    const userRole = req.user.role;
    const userAgencyId = req.user.agencyId;

    const booking = await BookingRequest.findOne({
      where: { id },
      include: [
        { 
          model: FlightGroup, 
          as: 'flightGroup',
          include: [{
            model: GroupSeatBucket,
            as: 'seatBuckets'
          }]
        }
      ],
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check agency access
    if (userRole !== 'ADMIN' && booking.requestingAgencyId !== userAgencyId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Validate status transition
    if (!validStatusTransitions[booking.status].includes('PAID')) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot mark booking as paid with status '${booking.status}'`
      });
    }

    // Convert held seats to issued seats
    await SeatManagementService.issueSeats(
      booking.flightGroupId,
      {
        adults: booking.paxAdults,
        children: booking.paxChildren,
        infants: booking.paxInfants
      },
      transaction
    );

    // Update booking
    await booking.update({
      status: 'PAID',
      paymentReference: paymentReference?.trim() || null,
      paymentReceivedAt: new Date()
    }, { transaction });

    await transaction.commit();

    // Log the payment confirmation to audit
    await AuditService.logBookingChange({
      bookingId: booking.id,
      action: 'MARK_PAID',
      previousStatus: 'PAYMENT_PENDING',
      newStatus: 'PAID',
      userId: req.user.id,
      details: {
        flightGroupId: booking.flightGroupId,
        paymentReference: booking.paymentReference,
        paymentReceivedAt: booking.paymentReceivedAt,
        paxAdults: booking.paxAdults,
        paxChildren: booking.paxChildren,
        paxInfants: booking.paxInfants
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Booking marked as paid successfully',
      data: {
        id: booking.id,
        status: 'PAID',
        paymentReference: booking.paymentReference,
        paymentReceivedAt: booking.paymentReceivedAt
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Mark booking paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /bookings/:id/issue
 * Issue tickets (Admin/Manager only)
 */
export const issueBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userAgencyCode = req.user.agencyCode;

    const booking = await BookingRequest.findOne({
      where: { id: parseInt(id) },
      include: [
        { model: FlightGroup, as: 'flightGroup' },
        { model: BookingPassenger, as: 'passengers' }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check agency access
    if (booking.requestingAgencyId !== userAgencyCode) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Validate status transition
    if (!validStatusTransitions[booking.status].includes('ISSUED')) {
      return res.status(400).json({
        success: false,
        message: `Cannot issue tickets for booking with status '${booking.status}'`
      });
    }

    // Use PNRManagementService for consistent PNR and ticket assignment
    const pnrResult = await PNRManagementService.assignPNRToBooking(booking.id, booking.flightGroupId);
    const ticketResult = await PNRManagementService.assignTicketNumbers(booking.id, booking.flightGroup.carrierCode);

    // Get updated passengers with assigned PNR/tickets
    const updatedPassengers = await BookingPassenger.findAll({
      where: { bookingId: booking.id },
      attributes: ['id', 'firstName', 'lastName', 'pnr', 'ticketNo']
    });

    // Format passenger data for response with seat assignment
    // TODO: Implement proper seat assignment through SeatManagementService
    // Current implementation uses placeholder seat numbers and doesn't check availability
    const formattedPassengers = updatedPassengers.map((passenger, index) => {
      // Placeholder: Generate simple seat numbers (e.g., 1A, 1B, 2A, 2B, etc.)
      // This should be replaced with actual seat assignment logic
      const row = Math.floor(index / 4) + 1; // 4 seats per row
      const seatLetter = String.fromCharCode(65 + (index % 4)); // A, B, C, D
      const seatNumber = `${row}${seatLetter}`;
      
      return {
        id: passenger.id,
        name: `${passenger.firstName} ${passenger.lastName}`.trim(),
        pnr: passenger.pnr,
        ticketNumber: passenger.ticketNo,
        seatNumber: seatNumber
      };
    });

    // Update booking
    await booking.update({
      status: 'ISSUED',
      issuedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Tickets issued successfully',
      data: {
        id: booking.id,
        bookingReference: booking.id, // Use booking ID as reference
        status: 'ISSUED',
        issuedAt: new Date(),
        passengers: formattedPassengers,
        pnr: pnrResult.pnr,
        ticketsAssigned: ticketResult.length
      }
    });

  } catch (error) {
    console.error('Issue booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /bookings/:id/cancel
 * Cancel booking
 */
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userAgencyCode = req.user.agencyCode;

    const booking = await BookingRequest.findOne({
      where: { id: parseInt(id) },
      include: [{ model: FlightGroup, as: 'flightGroup' }]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check agency access
    if (userRole !== ROLES.ADMIN && booking.requestingAgencyId !== userAgencyCode) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Validate status transition
    if (!validStatusTransitions[booking.status].includes('CANCELLED')) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel booking with status '${booking.status}'`
      });
    }

    // Perform cancellation within a transaction to prevent race conditions
    const previousStatus = booking.status;
    const transaction = await sequelize.transaction();
    
    try {
      // Return seats to group (only if not yet issued)
      if (booking.status !== 'ISSUED') {
        await SeatManagementService.returnSeatsToAvailablePool(
          booking.flightGroupId,
          booking.seatsBooked,
          transaction
        );
      }

      // Update booking
      await booking.update({
        status: 'CANCELLED',
        cancelledAt: new Date()
      }, { transaction });

      // Commit transaction
      await transaction.commit();

      // Log the booking cancellation to audit
      await AuditService.logBookingChange({
        bookingId: booking.id,
        action: 'CANCEL_BOOKING',
        previousStatus,
        newStatus: 'CANCELLED',
        userId: req.user.id,
        details: {
          flightGroupId: booking.flightGroupId,
          seatsReturned: booking.status !== 'ISSUED' ? booking.seatsBooked : 0
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

    } catch (error) {
      // Rollback on any error
      await transaction.rollback();
      throw error;
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        id: booking.id,
        bookingReference: booking.bookingReference,
        status: 'CANCELLED',
        cancelledAt: booking.cancelledAt
      }
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
