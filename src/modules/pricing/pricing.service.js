import { GroupSeatBucket } from '../../database/index.js';

/**
 * Pricing Service - Calculates Adult/Child/Infant pricing with taxes/fees
 * Reads from GroupSeatBucket model for sophisticated pricing logic
 */
export class PricingService {
  /**
   * Calculate pricing for a booking request
   * @param {string} flightGroupId - Flight group ID
   * @param {Object} passengers - Passenger counts { adults, children, infants }
   * @returns {Object} Pricing breakdown and total
   */
  static async calculateBookingPricing(flightGroupId, passengers) {
    try {
      const { adults = 0, children = 0, infants = 0 } = passengers;
      
      // Validate passenger counts
      if (adults < 0 || children < 0 || infants < 0) {
        throw new Error('Passenger counts cannot be negative');
      }
      
      if (adults + children + infants === 0) {
        throw new Error('At least one passenger is required');
      }

      // Get seat buckets for this flight group
      const seatBuckets = await GroupSeatBucket.findAll({
        where: { flightGroupId },
        order: [['paxType', 'ASC']]
      });

      if (seatBuckets.length === 0) {
        throw new Error('No pricing buckets found for this flight group');
      }

      // Build pricing map
      const pricingMap = {};
      seatBuckets.forEach(bucket => {
        pricingMap[bucket.paxType] = {
          baseFare: Math.round(Number(bucket.baseFare) * 100), // Store in cents
          taxAmount: Math.round(Number(bucket.taxAmount) * 100),
          feeAmount: Math.round(Number(bucket.feeAmount) * 100),
          currency: bucket.currency,
          totalSeats: bucket.totalSeats,
          seatsOnHold: bucket.seatsOnHold,
          seatsIssued: bucket.seatsIssued,
          availableSeats: bucket.totalSeats - bucket.seatsOnHold - bucket.seatsIssued
        };
      });

      // Validate required passenger types exist
      const requiredTypes = ['ADT', 'CHD', 'INF'];
      const missingTypes = requiredTypes.filter(type => !pricingMap[type]);
      if (missingTypes.length > 0) {
        throw new Error(`Missing pricing data for passenger types: ${missingTypes.join(', ')}`);
      }

      // Calculate pricing per passenger type
      const breakdown = {
        ADT: this.calculatePaxPricing(pricingMap.ADT, adults, 'Adult'),
        CHD: this.calculatePaxPricing(pricingMap.CHD, children, 'Child'),
        INF: this.calculatePaxPricing(pricingMap.INF, infants, 'Infant')
      };

      // Calculate totals
      const totals = this.calculateTotals(breakdown);

      return {
        flightGroupId,
        passengers,
        breakdown,
        totals,
        currency: pricingMap.ADT?.currency || pricingMap.CHD?.currency || pricingMap.INF?.currency || 'PKR'
      };

    } catch (error) {
      console.error('Pricing calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate pricing for a specific passenger type
   * @param {Object} bucket - Seat bucket data
   * @param {number} count - Number of passengers
   * @param {string} type - Passenger type name
   * @returns {Object} Pricing breakdown for this type
   */
  static calculatePaxPricing(bucket, count, type) {
    if (!bucket || count === 0) {
      return {
        type,
        count: 0,
        baseFare: 0,
        taxAmount: 0,
        feeAmount: 0,
        totalFare: 0,
        availableSeats: 0
      };
    }

    // Check seat availability
    if (count > bucket.availableSeats) {
      throw new Error(`Not enough ${type.toLowerCase()} seats available. Requested: ${count}, Available: ${bucket.availableSeats}`);
    }

    // Calculate in cents, then convert back to decimal
    const baseFareCents = bucket.baseFare * count;
    const taxAmountCents = bucket.taxAmount * count;
    const feeAmountCents = bucket.feeAmount * count;
    const totalFareCents = baseFareCents + taxAmountCents + feeAmountCents;

    return {
      type,
      count,
      baseFare: baseFareCents / 100,
      taxAmount: taxAmountCents / 100,
      feeAmount: feeAmountCents / 100,
      totalFare: totalFareCents / 100,
      availableSeats: bucket.availableSeats
    };
  }

  /**
   * Calculate totals from breakdown
   * @param {Object} breakdown - Pricing breakdown by passenger type
   * @returns {Object} Total pricing
   */
  static calculateTotals(breakdown) {
    const totals = {
      totalPassengers: 0,
      totalBaseFare: 0,
      totalTaxAmount: 0,
      totalFeeAmount: 0,
      totalFare: 0
    };

    Object.values(breakdown).forEach(pax => {
      totals.totalPassengers += pax.count;
      totals.totalBaseFare += pax.baseFare;
      totals.totalTaxAmount += pax.taxAmount;
      totals.totalFeeAmount += pax.feeAmount;
      totals.totalFare += pax.totalFare;
    });

    return totals;
  }

  /**
   * Check seat availability for a booking request
   * @param {string} flightGroupId - Flight group ID
   * @param {Object} passengers - Passenger counts
   * @returns {Object} Availability status
   */
  static async checkSeatAvailability(flightGroupId, passengers) {
    try {
      const { adults = 0, children = 0, infants = 0 } = passengers;
      
      const seatBuckets = await GroupSeatBucket.findAll({
        where: { flightGroupId }
      });

      const availability = {};
      let canBook = true;

      seatBuckets.forEach(bucket => {
        const available = bucket.totalSeats - bucket.seatsOnHold - bucket.seatsIssued;
        availability[bucket.paxType] = {
          requested: this.getRequestedCount(bucket.paxType, passengers),
          available,
          canBookType: available >= this.getRequestedCount(bucket.paxType, passengers)
        };

        if (!availability[bucket.paxType].canBookType) {
          canBook = false;
        }
      });

      return {
        flightGroupId,
        passengers,
        availability,
        canBook
      };

    } catch (error) {
      console.error('Availability check error:', error);
      throw error;
    }
  }

  /**
   * Get requested count for passenger type
   * @param {string} paxType - Passenger type
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

  /**
   * Get pricing buckets for a flight group
   * @param {string} flightGroupId - Flight group ID
   * @returns {Array} Array of seat buckets
   */
  static async getFlightGroupPricing(flightGroupId) {
    try {
      const seatBuckets = await GroupSeatBucket.findAll({
        where: { flightGroupId },
        order: [['paxType', 'ASC']]
      });

      return seatBuckets.map(bucket => ({
        paxType: bucket.paxType,
        totalSeats: bucket.totalSeats,
        seatsOnHold: bucket.seatsOnHold,
        seatsIssued: bucket.seatsIssued,
        availableSeats: bucket.totalSeats - bucket.seatsOnHold - bucket.seatsIssued,
        baseFare: Number(bucket.baseFare),
        taxAmount: Number(bucket.taxAmount),
        feeAmount: Number(bucket.feeAmount),
        totalFare: Number(bucket.baseFare) + Number(bucket.taxAmount) + Number(bucket.feeAmount),
        currency: bucket.currency
      }));

    } catch (error) {
      console.error('Get pricing error:', error);
      throw error;
    }
  }

  /**
   * Calculate booking pricing from seat buckets (extracted from booking.query.controller.js)
   * @param {Array} seatBuckets - Array of seat bucket objects
   * @param {Object} paxCounts - Passenger counts { paxAdults, paxChildren, paxInfants }
   * @returns {Object} Pricing breakdown with totals
   */
  static calculateBookingPricingFromBuckets(seatBuckets, paxCounts) {
    const { paxAdults = 0, paxChildren = 0, paxInfants = 0 } = paxCounts;
    
    const breakdown = seatBuckets.map(bucket => {
      const count = {
        ADT: paxAdults,
        CHD: paxChildren,
        INF: paxInfants
      }[bucket.paxType] || 0;
      
      if (count === 0) return null;
      
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
    }).filter(item => item !== null);

    const totalAmount = breakdown.reduce((sum, item) => sum + item.subtotal, 0);
    
    return {
      breakdown,
      totalPassengers: paxAdults + paxChildren + paxInfants,
      totalAmount,
      currency: seatBuckets[0]?.currency || 'USD'
    };
  }
}
