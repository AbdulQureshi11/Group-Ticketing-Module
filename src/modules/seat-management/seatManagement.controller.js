import { SeatManagementService } from './seatManagement.service.js';
import { sequelize } from '../../config/database.js';

/**
 * Seat Management Controller
 * Handles seat availability, allocation, and management operations
 */
export class SeatManagementController {
  /**
   * GET /seat-management/availability/:groupId
   * Get real-time seat availability for a flight group
   */
  static async getSeatAvailability(req, res, next) {
    try {
      const { groupId } = req.params;

      if (!groupId) {
        return res.status(400).json({
          success: false,
          message: 'Flight group ID is required'
        });
      }

      const availability = await SeatManagementService.getRealTimeAvailability(groupId);

      res.json({
        success: true,
        message: 'Seat availability retrieved successfully',
        data: availability
      });

    } catch (error) {
      console.error('Get seat availability error:', error);
      next(error);
    }
  }

  /**
   * GET /seat-management/utilization/:groupId
   * Get seat utilization statistics for a flight group
   */
  static async getSeatUtilization(req, res, next) {
    try {
      const { groupId } = req.params;

      if (!groupId) {
        return res.status(400).json({
          success: false,
          message: 'Flight group ID is required'
        });
      }

      const utilization = await SeatManagementService.getSeatUtilization(groupId);

      res.json({
        success: true,
        message: 'Seat utilization retrieved successfully',
        data: utilization
      });

    } catch (error) {
      console.error('Get seat utilization error:', error);
      next(error);
    }
  }

  /**
   * POST /seat-management/hold
   * Hold seats for a flight group (manual operation)
   */
  static async holdSeats(req, res, next) {
    const transaction = await sequelize.transaction();

    try {
      const { flightGroupId, passengers } = req.body;
      const userId = req.user?.id;

      if (!flightGroupId || !passengers) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'flightGroupId and passengers are required'
        });
      }

      // Validate passengers object
      const { adults = 0, children = 0, infants = 0 } = passengers;
      const totalPassengers = adults + children + infants;

      if (totalPassengers === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'At least one passenger is required'
        });
      }

      await SeatManagementService.holdSeats(flightGroupId, passengers, transaction);
      await transaction.commit();

      res.json({
        success: true,
        message: 'Seats held successfully',
        data: {
          flightGroupId,
          passengers: { adults, children, infants },
          totalHeld: totalPassengers,
          heldBy: userId,
          heldAt: new Date().toISOString()
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Hold seats error:', error);

      if (error.message.includes('Not enough') || error.message.includes('available')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      next(error);
    }
  }

  /**
   * POST /seat-management/release
   * Release held seats for a flight group (manual operation)
   */
  static async releaseSeats(req, res, next) {
    const transaction = await sequelize.transaction();

    try {
      const { flightGroupId, passengers } = req.body;
      const userId = req.user?.id;

      if (!flightGroupId || !passengers) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'flightGroupId and passengers are required'
        });
      }

      // Validate passengers object
      const { adults = 0, children = 0, infants = 0 } = passengers;
      const totalPassengers = adults + children + infants;

      if (totalPassengers === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'At least one passenger is required'
        });
      }

      await SeatManagementService.releaseSeats(flightGroupId, passengers, transaction);
      await transaction.commit();

      res.json({
        success: true,
        message: 'Seats released successfully',
        data: {
          flightGroupId,
          passengers: { adults, children, infants },
          totalReleased: totalPassengers,
          releasedBy: userId,
          releasedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Release seats error:', error);
      next(error);
    }
  }

  /**
   * POST /seat-management/issue
   * Issue seats for a flight group (convert held to issued)
   */
  static async issueSeats(req, res, next) {
    const transaction = await sequelize.transaction();

    try {
      const { flightGroupId, passengers } = req.body;
      const userId = req.user?.id;

      if (!flightGroupId || !passengers) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'flightGroupId and passengers are required'
        });
      }

      // Validate passengers object
      const { adults = 0, children = 0, infants = 0 } = passengers;
      const totalPassengers = adults + children + infants;

      if (totalPassengers === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'At least one passenger is required'
        });
      }

      await SeatManagementService.issueSeats(flightGroupId, passengers, transaction);
      await transaction.commit();

      res.json({
        success: true,
        message: 'Seats issued successfully',
        data: {
          flightGroupId,
          passengers: { adults, children, infants },
          totalIssued: totalPassengers,
          issuedBy: userId,
          issuedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Issue seats error:', error);
      next(error);
    }
  }

  /**
   * POST /seat-management/process-expired
   * Process expired seat holds (admin operation)
   */
  static async processExpiredHolds(req, res, next) {
    try {
      const userRole = req.user?.role;

      // Only admins can trigger this operation
      if (userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Only administrators can process expired holds'
        });
      }

      const result = await SeatManagementService.processExpiredHolds();

      res.json({
        success: true,
        message: 'Expired holds processed successfully',
        data: result
      });

    } catch (error) {
      console.error('Process expired holds error:', error);
      next(error);
    }
  }

  /**
   * POST /seat-management/allocate
   * Allocate seats to an agency for a flight group (complex allocation logic)
   * This is a placeholder for the allocation endpoint mentioned in the README
   */
  static async allocateSeats(req, res, next) {
    try {
      // This would implement the complex allocation logic
      // For now, return a not implemented response
      res.status(501).json({
        success: false,
        message: 'Seat allocation feature is not yet implemented',
        note: 'This endpoint requires complex allocation algorithms based on agency priority, historical usage, and availability'
      });

    } catch (error) {
      console.error('Allocate seats error:', error);
      next(error);
    }
  }
}

export default SeatManagementController;
