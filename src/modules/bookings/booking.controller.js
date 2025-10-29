import { BookingRequest, FlightGroup, BookingPassenger, GroupSeatBucket, GroupAgencyAllocation, AgencySettings, Agency } from '../../database/index.js';
import { SeatManagementService } from '../seat-management/seatManagement.service.js';
import { AuditService } from '../../services/audit.service.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';

// Valid status transitions per PRD
const validStatusTransitions = {
  'REQUESTED': ['APPROVED', 'REJECTED', 'EXPIRED'],
  'APPROVED': ['PAYMENT_PENDING', 'PAID', 'REJECTED', 'EXPIRED', 'CANCELLED'],
  'PAYMENT_PENDING': ['PAID', 'REJECTED', 'EXPIRED', 'CANCELLED'],
  'PAID': ['ISSUED', 'CANCELLED'],
  'ISSUED': ['CANCELLED'],
  'REJECTED': [],
  'EXPIRED': [],
  'CANCELLED': []
};

/**
 * POST /bookings
 * Create new booking request with hold
 * Body: flightGroupId, paxCounts {adt,chd,inf}, remarks, requestedHoldHours (server clamps)
 */
export const createBooking = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      flightGroupId,
      paxCounts = {},
      remarks,
      requestedHoldHours
    } = req.body;

    const { adt = 0, chd = 0, inf = 0 } = paxCounts;
    const userRole = req.user.role;
    const userId = req.user.id;
    const userAgencyId = req.user.agencyId;

    // Validate required fields
    if (!flightGroupId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'flightGroupId is required'
      });
    }

    // Validate passenger counts
    const totalPassengers = adt + chd + inf;
    if (totalPassengers === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one passenger is required'
      });
    }

    if (totalPassengers > 50) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 passengers allowed per booking'
      });
    }

    // Find and validate flight group
    const flightGroup = await FlightGroup.findOne({
      where: { 
        id: flightGroupId,
        status: 'PUBLISHED' // Only allow booking on published groups
      },
      include: [
        {
          model: GroupSeatBucket,
          as: 'seatBuckets'
        },
        {
          model: Agency,
          as: 'agency',
          attributes: ['id', 'name', 'code']
        }
      ],
      transaction
    });

    if (!flightGroup) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Flight group not found or not published'
      });
    }

    // Check if group is within sales window
    const now = new Date();
    if (now < flightGroup.salesStart || now > flightGroup.salesEnd) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Flight group is not within sales window'
      });
    }

    // Check seat availability for each passenger type
    const availabilityChecks = [];
    for (const [requestedType, count] of Object.entries({ ADT: adt, CHD: chd, INF: inf })) {
      if (count > 0) {
        const bucket = flightGroup.seatBuckets.find(b => b.paxType === requestedType);
        if (!bucket) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `No seat bucket found for passenger type ${requestedType}`
          });
        }
        
        const available = bucket.totalSeats - bucket.seatsOnHold - bucket.seatsIssued;
        if (available < count) {
          await transaction.rollback();
          return res.status(409).json({
            success: false,
            message: `Insufficient seats for ${requestedType}. Requested: ${count}, Available: ${available}`
          });
        }
        
        availabilityChecks.push({ bucket, requestedCount: count });
      }
    }

    // Get agency settings for hold duration
    const agencySettings = await AgencySettings.findOne({
      where: { agencyId: userAgencyId },
      transaction
    });

    // Calculate hold expiry (server clamps to allowed range)
    const defaultHoldHours = agencySettings?.defaultHoldHours || 24;
    const maxHoldHours = 72; // Maximum allowed per PRD
    const minHoldHours = 1;  // Minimum allowed
    let holdHours = requestedHoldHours || defaultHoldHours;
    holdHours = Math.max(minHoldHours, Math.min(maxHoldHours, holdHours));

    const holdExpiresAt = new Date();
    holdExpiresAt.setHours(holdExpiresAt.getHours() + holdHours);

    // Create booking request
    const booking = await BookingRequest.create({
      id: uuidv4(),
      flightGroupId,
      requestingAgencyId: userAgencyId,
      requestedByUserId: userId,
      paxAdults: adt,
      paxChildren: chd,
      paxInfants: inf,
      status: 'REQUESTED',
      holdExpiresAt,
      remarks: remarks || null
    }, { transaction });

    // Update seat buckets atomically
    for (const { bucket, requestedCount } of availabilityChecks) {
      await bucket.update({
        seatsOnHold: bucket.seatsOnHold + requestedCount
      }, { transaction });
    }

    await transaction.commit();

    // Fetch complete booking with associations
    const completeBooking = await BookingRequest.findOne({
      where: { id: booking.id },
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
        }
      ],
      attributes: { exclude: ['deletedAt'] }
    });

    // Calculate pricing
    const pricing = {
      breakdown: flightGroup.seatBuckets
        .filter(bucket => {
          const count = { ADT: adt, CHD: chd, INF: inf }[bucket.paxType];
          return count > 0;
        })
        .map(bucket => {
          const count = { ADT: adt, CHD: chd, INF: inf }[bucket.paxType];
          const totalPerPax = bucket.baseFare + bucket.taxAmount + bucket.feeAmount;
          return {
            paxType: bucket.paxType,
            count,
            baseFare: bucket.baseFare,
            taxAmount: bucket.taxAmount,
            feeAmount: bucket.feeAmount,
            totalPerPassenger: totalPerPax,
            subtotal: totalPerPax * count,
            currency: bucket.currency
          };
        }),
      totalPassengers,
      totalAmount: flightGroup.seatBuckets
        .filter(bucket => {
          const count = { ADT: adt, CHD: chd, INF: inf }[bucket.paxType];
          return count > 0;
        })
        .reduce((sum, bucket) => {
          const count = { ADT: adt, CHD: chd, INF: inf }[bucket.paxType];
          const totalPerPax = bucket.baseFare + bucket.taxAmount + bucket.feeAmount;
          return sum + (totalPerPax * count);
        }, 0),
      currency: flightGroup.seatBuckets[0]?.currency || 'USD'
    };

    const response = {
      id: completeBooking.id,
      flightGroup: {
        id: completeBooking.flightGroup.id,
        carrier: completeBooking.flightGroup.carrierCode,
        flightNumber: completeBooking.flightGroup.flightNumber,
        route: {
          origin: completeBooking.flightGroup.origin,
          destination: completeBooking.flightGroup.destination
        },
        times: {
          departure: completeBooking.flightGroup.departureTimeUtc,
          arrival: completeBooking.flightGroup.arrivalTimeUtc
        },
        pnrMode: completeBooking.flightGroup.pnrMode,
        agency: completeBooking.flightGroup.agency
      },
      passengers: {
        adults: completeBooking.paxAdults,
        children: completeBooking.paxChildren,
        infants: completeBooking.paxInfants,
        total: totalPassengers
      },
      status: completeBooking.status,
      holdExpiresAt: completeBooking.holdExpiresAt,
      holdDurationHours: holdHours,
      remarks: completeBooking.remarks,
      pricing,
      createdAt: completeBooking.createdAt,
      updatedAt: completeBooking.updatedAt
    };

    // Log the booking creation to audit
    await AuditService.logUserAction({
      userId,
      action: 'CREATE_BOOKING',
      resource: 'booking_request',
      resourceId: booking.id,
      details: {
        flightGroupId,
        paxAdults: adt,
        paxChildren: chd,
        paxInfants: inf,
        totalPassengers: totalPassengers,
        holdExpiresAt,
        totalAmount: pricing.totalAmount,
        currency: pricing.currency
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Booking request created successfully',
      data: response
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Create booking error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Validate status transition
 */
const validateStatusTransition = (currentStatus, newStatus) => {
  const allowedTransitions = validStatusTransitions[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
};
