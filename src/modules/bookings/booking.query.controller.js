import { BookingRequest, FlightGroup, BookingPassenger, Agency, GroupSeatBucket, PaymentProof, User } from '../../database/index.js';
import { Op } from 'sequelize';
import { ROLES } from '../../core/constants/roles.js';
import { PricingService } from '../pricing/pricing.service.js';

/**
 * GET /bookings
 * List bookings with filters (agency, status, group, date)
 * Accessible by authenticated users - filtered by agency for non-admins
 */
export const getBookings = async (req, res) => {
  try {
    const {
      status,
      agencyId,
      flightGroupId,
      dateFrom,
      dateTo,
      page,
      limit
    } = req.query;

    const userRole = req.user.role;
    const userAgencyId = req.user.agencyId;

    // Validate and parse pagination parameters
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.max(1, Math.min(100, parseInt(limit) || 20)); // Max 100 per page
    const offset = (validatedPage - 1) * validatedLimit;

    // Build where clause
    const whereClause = {};

    // Filter by user's agency if not admin
    if (userRole !== ROLES.ADMIN) {
      whereClause.requestingAgencyId = userAgencyId;
    } else if (agencyId) {
      whereClause.requestingAgencyId = agencyId;
    }

    // Apply filters
    if (status) {
      whereClause.status = status;
    }

    if (flightGroupId) {
      whereClause.flightGroupId = flightGroupId;
    }

    // Validate date parameters
    let validDateFrom = null;
    let validDateTo = null;
    if (dateFrom) {
      const parsed = new Date(dateFrom);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid dateFrom format'
        });
      }
      validDateFrom = parsed;
    }
    if (dateTo) {
      const parsed = new Date(dateTo);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid dateTo format'
        });
      }
      validDateTo = parsed;
    }

    // Date range filter
    if (validDateFrom || validDateTo) {
      whereClause.createdAt = {};
      if (validDateFrom) {
        whereClause.createdAt[Op.gte] = validDateFrom;
      }
      if (validDateTo) {
        whereClause.createdAt[Op.lte] = validDateTo;
      }
    }

    const bookings = await BookingRequest.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: FlightGroup,
          as: 'flightGroup',
          attributes: ['id', 'carrierCode', 'flightNumber', 'origin', 'destination', 'departureTimeUtc', 'pnrMode'],
          include: [{
            model: Agency,
            as: 'agency',
            attributes: ['id', 'name', 'code']
          }]
        },
        {
          model: Agency,
          as: 'requestingAgency',
          attributes: ['id', 'name', 'code']
        }
      ],
      attributes: { exclude: ['deletedAt'] },
      limit: validatedLimit,
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    const response = {
      bookings: bookings.rows.map(booking => ({
        id: booking.id,
        flightGroup: {
          id: booking.flightGroup.id,
          carrier: booking.flightGroup.carrierCode,
          flightNumber: booking.flightGroup.flightNumber,
          route: {
            origin: booking.flightGroup.origin,
            destination: booking.flightGroup.destination
          },
          departure: booking.flightGroup.departureTimeUtc,
          pnrMode: booking.flightGroup.pnrMode,
          agency: booking.flightGroup.agency
        },
        requestingAgency: booking.requestingAgency,
        passengers: {
          adults: booking.paxAdults,
          children: booking.paxChildren,
          infants: booking.paxInfants,
          total: booking.paxAdults + booking.paxChildren + booking.paxInfants
        },
        status: booking.status,
        holdExpiresAt: booking.holdExpiresAt,
        approvalAt: booking.approvalAt,
        paymentReceivedAt: booking.paymentReceivedAt,
        remarks: booking.remarks,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt
      })),
      pagination: {
        total: bookings.count,
        page: validatedPage,
        limit: validatedLimit,
        pages: Math.ceil(bookings.count / validatedLimit)
      }
    };

    res.json({
      success: true,
      message: 'Bookings retrieved successfully',
      data: response
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * GET /bookings/:id
 * Get booking details with passengers and payment proofs
 * Accessible by authenticated users within their agency or admins
 */
export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userAgencyId = req.user.agencyId;

    const booking = await BookingRequest.findOne({
      where: { id },
      include: [
        {
          model: FlightGroup,
          as: 'flightGroup',
          attributes: ['id', 'carrierCode', 'flightNumber', 'origin', 'destination', 'departureTimeUtc', 'arrivalTimeUtc', 'pnrMode', 'baggageRule', 'fareNotes', 'terms'],
          include: [
            {
              model: Agency,
              as: 'agency',
              attributes: ['id', 'name', 'code']
            },
            {
              model: GroupSeatBucket,
              as: 'seatBuckets',
              attributes: ['paxType', 'totalSeats', 'seatsOnHold', 'seatsIssued', 'baseFare', 'taxAmount', 'feeAmount', 'currency']
            }
          ]
        },
        {
          model: Agency,
          as: 'requestingAgency',
          attributes: ['id', 'name', 'code']
        },
        {
          model: BookingPassenger,
          as: 'passengers',
          attributes: ['id', 'paxType', 'title', 'firstName', 'lastName', 'dob', 'nationality', 'passportNo', 'passportExpiry', 'pnr', 'ticketNo']
        },
        {
          model: PaymentProof,
          as: 'paymentProofs',
          attributes: ['id', 'fileUrl', 'bankName', 'amount', 'currency', 'referenceNo', 'uploadedAt']
        },
        {
          model: User,
          as: 'requestedByUser',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'approvedByUser',
          attributes: ['id', 'username', 'email']
        }
      ],
      attributes: { exclude: ['deletedAt'] }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check agency access
    if (userRole !== ROLES.ADMIN && booking.requestingAgencyId !== userAgencyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Can only access your own agency bookings'
      });
    }

    // Validate seat buckets exist
    if (!booking.flightGroup.seatBuckets || booking.flightGroup.seatBuckets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No seat buckets found for this flight group'
      });
    }

    // Calculate pricing
    const pricing = PricingService.calculateBookingPricingFromBuckets(
      booking.flightGroup.seatBuckets,
      { 
        paxAdults: booking.paxAdults, 
        paxChildren: booking.paxChildren, 
        paxInfants: booking.paxInfants 
      }
    );

    const response = {
      id: booking.id,
      flightGroup: {
        id: booking.flightGroup.id,
        carrier: booking.flightGroup.carrierCode,
        flightNumber: booking.flightGroup.flightNumber,
        route: {
          origin: booking.flightGroup.origin,
          destination: booking.flightGroup.destination
        },
        times: {
          departure: booking.flightGroup.departureTimeUtc,
          arrival: booking.flightGroup.arrivalTimeUtc
        },
        pnrMode: booking.flightGroup.pnrMode,
        baggageRule: booking.flightGroup.baggageRule,
        fareNotes: booking.flightGroup.fareNotes,
        terms: booking.flightGroup.terms,
        agency: booking.flightGroup.agency,
        seatBuckets: booking.flightGroup.seatBuckets
      },
      requestingAgency: booking.requestingAgency,
      requestedBy: booking.requestedByUser,
      passengers: {
        adults: booking.paxAdults,
        children: booking.paxChildren,
        infants: booking.paxInfants,
        total: booking.paxAdults + booking.paxChildren + booking.paxInfants,
        details: booking.passengers
      },
      status: booking.status,
      holdExpiresAt: booking.holdExpiresAt,
      approval: {
        userId: booking.approvalUserId,
        approvedBy: booking.approvedByUser,
        approvedAt: booking.approvalAt,
        rejectionReason: booking.rejectionReason
      },
      payment: {
        reference: booking.paymentReference,
        receivedAt: booking.paymentReceivedAt,
        proofs: booking.paymentProofs
      },
      pricing,
      remarks: booking.remarks,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    };

    res.json({
      success: true,
      message: 'Booking retrieved successfully',
      data: response
    });

  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
