import { PNRManagementService } from './pnrManagement.service.js';

/**
 * GET /pnr/validate/:pnr
 * Validate PNR format
 */
export const validatePNR = async (req, res) => {
  try {
    const { pnr } = req.params;

    if (!pnr) {
      return res.status(400).json({
        success: false,
        message: 'PNR parameter is required'
      });
    }

    const isValid = PNRManagementService.validatePNRFormat(pnr);

    res.json({
      success: true,
      message: isValid ? 'PNR format is valid' : 'PNR format is invalid',
      data: {
        pnr,
        isValid,
        expectedFormat: '6-character alphanumeric (e.g., ABC123)'
      }
    });

  } catch (error) {
    console.error('Validate PNR error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /pnr/generate
 * Generate a new unique PNR
 */
export const generatePNR = async (req, res) => {
  try {
    const pnr = await PNRManagementService.generateUniquePNR();

    res.json({
      success: true,
      message: 'PNR generated successfully',
      data: {
        pnr,
        format: '6-character alphanumeric',
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Generate PNR error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate unique PNR'
    });
  }
};

/**
 * GET /pnr/search/:pnr
 * Search bookings by PNR
 */
export const searchByPNR = async (req, res) => {
  try {
    const { pnr } = req.params;
    const userAgencyId = req.user.agencyId;
    const userRole = req.user.role;

    if (!pnr) {
      return res.status(400).json({
        success: false,
        message: 'PNR parameter is required'
      });
    }

    // Validate PNR format first
    if (!PNRManagementService.validatePNRFormat(pnr)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PNR format. Expected 6-character alphanumeric.'
      });
    }

    // Search with agency filtering for non-admin users
    const agencyId = userRole === 'ADMIN' ? null : userAgencyId;
    const bookings = await PNRManagementService.searchBookingsByPNR(pnr, agencyId);

    res.json({
      success: true,
      message: `Found ${bookings.length} booking(s) with PNR ${pnr}`,
      data: {
        pnr,
        totalResults: bookings.length,
        bookings: bookings.map(booking => ({
          id: booking.id,
          status: booking.status,
          pnr: booking.pnr,
          flightGroup: {
            carrierCode: booking.flightGroup.carrierCode,
            flightNumber: booking.flightGroup.flightNumber,
            origin: booking.flightGroup.origin,
            destination: booking.flightGroup.destination,
            departureTimeUtc: booking.flightGroup.departureTimeUtc
          },
          passengerCount: booking.passengers.length,
          passengers: booking.passengers.map(p => ({
            paxType: p.paxType,
            firstName: p.firstName,
            lastName: p.lastName,
            pnr: p.pnr,
            ticketNo: p.ticketNo
          }))
        }))
      }
    });

  } catch (error) {
    console.error('Search by PNR error:', error);

    if (error.name === 'InvalidPnrFormatError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid PNR format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * GET /pnr/booking/:bookingId
 * Get PNR information for a specific booking
 */
export const getBookingPNRInfo = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userAgencyId = req.user.agencyId;
    const userRole = req.user.role;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID parameter is required'
      });
    }

    // Get booking PNR info
    const pnrInfo = await PNRManagementService.getBookingPNRInfo(bookingId);

    // Check agency access if not admin
    if (userRole !== 'ADMIN') {
      // We need to check if this booking belongs to the user's agency
      // Since getBookingPNRInfo doesn't return agency info, let's get the booking separately
      const { BookingRequest } = await import('../../database/index.js');
      const booking = await BookingRequest.findOne({
        where: { id: bookingId },
        attributes: ['requestingAgencyId']
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      if (booking.requestingAgencyId !== userAgencyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Can only access your own agency bookings'
        });
      }
    }

    res.json({
      success: true,
      message: 'Booking PNR information retrieved successfully',
      data: pnrInfo
    });

  } catch (error) {
    console.error('Get booking PNR info error:', error);

    if (error.name === 'BookingNotFoundError') {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /pnr/assign/:bookingId
 * Assign PNR to a booking (internal use during booking workflow)
 */
export const assignPNRToBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { flightGroupId } = req.body;
    const userAgencyId = req.user.agencyId;
    const userRole = req.user.role;

    if (!bookingId || !flightGroupId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID and flight group ID are required'
      });
    }

    // Check agency access if not admin
    if (userRole !== 'ADMIN') {
      const { BookingRequest } = await import('../../database/index.js');
      const booking = await BookingRequest.findOne({
        where: { id: bookingId },
        attributes: ['requestingAgencyId']
      });

      if (!booking || booking.requestingAgencyId !== userAgencyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Can only modify your own agency bookings'
        });
      }
    }

    const result = await PNRManagementService.assignPNRToBooking(bookingId, flightGroupId);

    res.json({
      success: true,
      message: 'PNR assigned to booking successfully',
      data: result
    });

  } catch (error) {
    console.error('Assign PNR to booking error:', error);

    // Handle specific service errors
    if (error.name === 'FlightGroupNotFoundError') {
      return res.status(404).json({
        success: false,
        message: 'Flight group not found'
      });
    }

    if (error.name === 'PnrAlreadyExistsError') {
      return res.status(409).json({
        success: false,
        message: 'Failed to generate unique PNR'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
