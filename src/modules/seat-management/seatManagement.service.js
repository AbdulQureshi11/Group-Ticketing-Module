import { GroupSeatBucket, BookingRequest, FlightGroup } from '../../database/index.js';
import { PricingService } from '../pricing/pricing.service.js';
import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';

/**
 * Seat Management Service - Handles seat allocation, availability, and counters
 * Integrates with pricing engine for sophisticated seat management
 */
export class SeatManagementService {
  /**
   * Create booking with seat bucket management
   * @param {string} flightGroupId - Flight group ID
   * @param {string} agencyId - Agency ID
   * @param {string} userId - User ID creating booking
   * @param {Object} passengers - Passenger counts { adults, children, infants }
   * @param {Object} options - Additional options { notes, holdHours }
   * @returns {Object} Created booking with pricing
   */
  static async createBookingWithSeatManagement(flightGroupId, agencyId, userId, passengers, options = {}) {
    const transaction = await sequelize.transaction();
    
    try {
      // Step 1: Validate seat availability
      const availability = await PricingService.checkSeatAvailability(flightGroupId, passengers);
      
      if (!availability.canBook) {
        await transaction.rollback();
        throw new Error(`Insufficient seat availability: ${JSON.stringify(availability.availability)}`);
      }

      // Step 2: Calculate pricing
      const pricing = await PricingService.calculateBookingPricing(flightGroupId, passengers);

      // Step 3: Hold seats atomically
      await this.holdSeats(flightGroupId, passengers, transaction);

      // Step 4: Create booking
      const holdExpiresAt = new Date();
      holdExpiresAt.setHours(holdExpiresAt.getHours() + (options.holdHours || 24));

      const booking = await BookingRequest.create({
        flightGroupId,
        requestingAgencyId: agencyId,
        requestedByUserId: userId,
        paxAdults: passengers.adults || 0,
        paxChildren: passengers.children || 0,
        paxInfants: passengers.infants || 0,
        status: 'REQUESTED',
        holdExpiresAt,
        remarks: options.notes || null
      }, { transaction });

      await transaction.commit();

      return {
        booking,
        pricing,
        availability
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Create booking with seat management error:', error);
      throw error;
    }
  }

  /**
   * Hold seats for a booking request
   * @param {string} flightGroupId - Flight group ID
   * @param {Object} passengers - Passenger counts
   * @param {Object} transaction - Sequelize transaction
   */
  static async holdSeats(flightGroupId, passengers, transaction) {
    const { adults = 0, children = 0, infants = 0 } = passengers;

    // Get seat buckets for this flight group
    const seatBuckets = await GroupSeatBucket.findAll({
      where: { flightGroupId },
      transaction
    });

    if (seatBuckets.length === 0) {
      throw new Error('No seat buckets found for this flight group');
    }

    // Update seat counters atomically
    for (const bucket of seatBuckets) {
      const requestedCount = this.getRequestedCount(bucket.paxType, passengers);
      
      if (requestedCount > 0) {
        const available = bucket.totalSeats - bucket.seatsOnHold - bucket.seatsIssued;
        
        if (requestedCount > available) {
          throw new Error(`Not enough ${bucket.paxType} seats available. Requested: ${requestedCount}, Available: ${available}`);
        }

        // Increment seats on hold
        await bucket.update({
          seatsOnHold: bucket.seatsOnHold + requestedCount
        }, { transaction });
      }
    }
  }

  /**
   * Release held seats (for booking rejection/cancellation)
   * @param {string} flightGroupId - Flight group ID
   * @param {Object} passengers - Passenger counts
   * @param {Object} transaction - Sequelize transaction
   */
  static async releaseHeldSeats(flightGroupId, passengers, transaction) {
    const { adults = 0, children = 0, infants = 0 } = passengers;

    const seatBuckets = await GroupSeatBucket.findAll({
      where: { flightGroupId },
      transaction
    });

    for (const bucket of seatBuckets) {
      const requestedCount = this.getRequestedCount(bucket.paxType, passengers);
      
      if (requestedCount > 0) {
        // Decrement seats on hold
        await bucket.update({
          seatsOnHold: Math.max(0, bucket.seatsOnHold - requestedCount)
        }, { transaction });
      }
    }
  }

  /**
   * Convert held seats to issued seats (for booking approval/payment)
   * @param {string} flightGroupId - Flight group ID
   * @param {Object} passengers - Passenger counts
   * @param {Object} transaction - Sequelize transaction
   */
  static async issueSeats(flightGroupId, passengers, transaction) {
    const { adults = 0, children = 0, infants = 0 } = passengers;

    const seatBuckets = await GroupSeatBucket.findAll({
      where: { flightGroupId },
      transaction
    });

    for (const bucket of seatBuckets) {
      const requestedCount = this.getRequestedCount(bucket.paxType, passengers);
      
      if (requestedCount > 0) {
        // Move seats from on_hold to issued
        await bucket.update({
          seatsOnHold: Math.max(0, bucket.seatsOnHold - requestedCount),
          seatsIssued: bucket.seatsIssued + requestedCount
        }, { transaction });
      }
    }
  }

  /**
   * Get real-time seat availability for a flight group
   * @param {string} flightGroupId - Flight group ID
   * @returns {Object} Seat availability by passenger type
   */
  static async getRealTimeAvailability(flightGroupId) {
    const seatBuckets = await GroupSeatBucket.findAll({
      where: { flightGroupId }
    });

    const availability = {};
    let totalAvailable = 0;

    seatBuckets.forEach(bucket => {
      const available = bucket.totalSeats - bucket.seatsOnHold - bucket.seatsIssued;
      availability[bucket.paxType] = {
        totalSeats: bucket.totalSeats,
        seatsOnHold: bucket.seatsOnHold,
        seatsIssued: bucket.seatsIssued,
        availableSeats: available
      };
      totalAvailable += available;
    });

    return {
      flightGroupId,
      byPaxType: availability,
      totalAvailable
    };
  }

  /**
   * Get seat utilization statistics for a flight group
   * @param {string} flightGroupId - Flight group ID
   * @returns {Object} Utilization statistics
   */
  static async getSeatUtilization(flightGroupId) {
    const seatBuckets = await GroupSeatBucket.findAll({
      where: { flightGroupId }
    });

    const utilization = {};
    let totalSeats = 0;
    let totalIssued = 0;
    let totalOnHold = 0;

    seatBuckets.forEach(bucket => {
      const utilizationRate = bucket.totalSeats > 0 ? (bucket.seatsIssued / bucket.totalSeats) * 100 : 0;
      
      utilization[bucket.paxType] = {
        totalSeats: bucket.totalSeats,
        seatsIssued: bucket.seatsIssued,
        seatsOnHold: bucket.seatsOnHold,
        utilizationRate: Math.round(utilizationRate * 100) / 100
      };

      totalSeats += bucket.totalSeats;
      totalIssued += bucket.seatsIssued;
      totalOnHold += bucket.seatsOnHold;
    });

    const overallUtilization = totalSeats > 0 ? (totalIssued / totalSeats) * 100 : 0;

    return {
      flightGroupId,
      byPaxType: utilization,
      summary: {
        totalSeats,
        totalIssued,
        totalOnHold,
        totalAvailable: totalSeats - totalIssued - totalOnHold,
        overallUtilization: Math.round(overallUtilization * 100) / 100
      }
    };
  }

  /**
   * Return seats to available pool (for booking cancellation)
   * @param {string} flightGroupId - Flight group ID
   * @param {number} seatsToReturn - Number of seats to return
   * @param {Object} transaction - Sequelize transaction
   */
  static async returnSeatsToAvailablePool(flightGroupId, seatsToReturn, transaction) {
    // Use atomic increment to avoid race conditions
    await FlightGroup.update({
      availableSeats: sequelize.literal(`availableSeats + ${seatsToReturn}`)
    }, {
      where: { id: flightGroupId },
      transaction
    });
  }

  /**
   * Process expired holds - automatically expire booking holds and release seats
   * @returns {Object} Processing results
   */
  static async processExpiredHolds() {
    const transaction = await sequelize.transaction();
    
    try {
      const now = new Date();
      
      // Find all bookings with expired holds
      const expiredBookings = await BookingRequest.findAll({
        where: {
          status: 'REQUESTED',
          holdExpiresAt: {
            [Op.lt]: now
          }
        },
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

      let totalReleasedSeats = 0;
      const processedBookings = [];

      // Process each expired booking
      for (const booking of expiredBookings) {
        try {
          // Calculate seats to release
          const passengers = {
            adults: booking.paxAdults,
            children: booking.paxChildren,
            infants: booking.paxInfants
          };

          // Release held seats
          for (const bucket of booking.flightGroup.seatBuckets) {
            const count = this.getRequestedCount(bucket.paxType, passengers);
            if (count > 0) {
              await bucket.update({
                seatsOnHold: Math.max(0, bucket.seatsOnHold - count)
              }, { transaction });
              totalReleasedSeats += count;
            }
          }

          // Update booking status to EXPIRED
          await booking.update({
            status: 'EXPIRED'
          }, { transaction });

          processedBookings.push({
            id: booking.id,
            paxAdults: booking.paxAdults,
            paxChildren: booking.paxChildren,
            paxInfants: booking.paxInfants,
            expiredAt: now
          });

        } catch (error) {
          console.error(`Failed to process expired booking ${booking.id}:`, error);
        }
      }

      await transaction.commit();

      return {
        processed: {
          total: expiredBookings.length,
          successful: processedBookings.length,
          failed: expiredBookings.length - processedBookings.length
        },
        seatsReleased: totalReleasedSeats,
        bookings: processedBookings
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Process expired holds failed:', error);
      throw error;
    }
  }

  /**
   * Release seats from held or issued status (for cancellations)
   * @param {string} flightGroupId - Flight group ID
   * @param {Object} passengers - Passenger counts
   * @param {Object} transaction - Sequelize transaction
   */
  static async releaseSeats(flightGroupId, passengers, transaction) {
    try {
      const seatBuckets = await GroupSeatBucket.findAll({
        where: { flightGroupId },
        transaction
      });

      for (const bucket of seatBuckets) {
        const count = this.getRequestedCount(bucket.paxType, passengers);
        if (count > 0) {
          await bucket.update({
            seatsOnHold: Math.max(0, bucket.seatsOnHold - count),
            seatsIssued: Math.max(0, bucket.seatsIssued - count)
          }, { transaction });
        }
      }

    } catch (error) {
      console.error('Release seats failed:', error);
      throw error;
    }
  }

  /**
   * Get passenger count by type
   * @param {string} paxType - Passenger type (ADT, CHD, INF)
   * @param {Object} passengers - Passenger counts
   * @returns {number} Requested count
   */
  static getRequestedCount(paxType, passengers) {
    switch (paxType) {
      case 'ADT': return passengers.adults || 0;
      case 'CHD': return passengers.children || 0;
      case 'INF': return passengers.infants || 0;
      default: return 0;
    }
  }
}
