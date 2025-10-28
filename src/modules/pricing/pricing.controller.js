import { PricingService } from './pricing.service.js';

/**
 * GET /pricing/flight-groups/:id
 * Get pricing breakdown for a flight group
 */
export const getFlightGroupPricing = async (req, res) => {
  try {
    const { id } = req.params;

    const pricing = await PricingService.getFlightGroupPricing(id);

    res.json({
      success: true,
      message: 'Flight group pricing retrieved successfully',
      data: pricing
    });

  } catch (error) {
    console.error('Get flight group pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /pricing/calculate
 * Calculate pricing for a booking request
 * Body: { flightGroupId, passengers: { adults, children, infants } }
 */
export const calculateBookingPricing = async (req, res) => {
  try {
    const { flightGroupId, passengers } = req.body;

    // Validate required fields
    if (!flightGroupId || !passengers) {
      return res.status(400).json({
        success: false,
        message: 'flightGroupId and passengers are required'
      });
    }

    // Validate passengers object
    const { adults, children, infants } = passengers;
    if (typeof adults !== 'number' || typeof children !== 'number' || typeof infants !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Passenger counts must be numbers'
      });
    }

    const pricing = await PricingService.calculateBookingPricing(flightGroupId, passengers);

    res.json({
      success: true,
      message: 'Booking pricing calculated successfully',
      data: pricing
    });

  } catch (error) {
    console.error('Calculate booking pricing error:', error);
    
    if (error.message.includes('No pricing buckets found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Not enough') || error.message.includes('At least one passenger')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /pricing/check-availability
 * Check seat availability for a booking request
 * Body: { flightGroupId, passengers: { adults, children, infants } }
 */
export const checkSeatAvailability = async (req, res) => {
  try {
    const { flightGroupId, passengers } = req.body;

    // Validate required fields
    if (!flightGroupId || !passengers) {
      return res.status(400).json({
        success: false,
        message: 'flightGroupId and passengers are required'
      });
    }

    const availability = await PricingService.checkSeatAvailability(flightGroupId, passengers);

    res.json({
      success: true,
      message: 'Seat availability checked successfully',
      data: availability
    });

  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /pricing/validate-booking
 * Validate a complete booking request (pricing + availability)
 * Body: { flightGroupId, passengers: { adults, children, infants } }
 */
export const validateBookingRequest = async (req, res) => {
  try {
    const { flightGroupId, passengers } = req.body;

    // Validate required fields
    if (!flightGroupId || !passengers) {
      return res.status(400).json({
        success: false,
        message: 'flightGroupId and passengers are required'
      });
    }

    // Check availability first
    const availability = await PricingService.checkSeatAvailability(flightGroupId, passengers);
    
    if (!availability.canBook) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient seat availability',
        data: availability
      });
    }

    // Calculate pricing
    const pricing = await PricingService.calculateBookingPricing(flightGroupId, passengers);

    res.json({
      success: true,
      message: 'Booking request validated successfully',
      data: {
        availability,
        pricing,
        valid: true
      }
    });

  } catch (error) {
    console.error('Validate booking request error:', error);
    
    if (error.message.includes('No pricing buckets found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
