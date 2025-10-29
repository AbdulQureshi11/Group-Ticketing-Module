import { StatusMachineService } from './statusMachine.service.js';
import { 
  InvalidStatusTransitionError,
  AdminRoleRequiredError,
  BookingNotFoundError,
  FlightGroupNotFoundError,
  ValidationError,
  InsufficientSeatAvailabilityError,
  isBusinessError,
  getErrorStatusCode
} from '../../core/utils/errors.js';

/**
 * POST /status-machine/transition/:bookingId
 * Transition booking status with business rules
 */
export const transitionBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { newStatus, ...transitionData } = req.body;
    const user = req.user;

    // Validate required fields
    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: 'newStatus is required'
      });
    }

    const result = await StatusMachineService.transitionBookingStatus(
      bookingId,
      newStatus,
      user,
      transitionData
    );

    res.json({
      success: true,
      message: `Booking status transitioned from ${result.previousStatus} to ${result.newStatus}`,
      data: {
        booking: result.booking,
        previousStatus: result.previousStatus,
        newStatus: result.newStatus,
        transitionedBy: result.transitionedBy
      }
    });

  } catch (error) {
    console.error('Transition booking status error:', error);
    
    // Handle business errors with proper status codes
    if (isBusinessError(error)) {
      return res.status(getErrorStatusCode(error)).json({
        success: false,
        message: error.message
      });
    }

    // Handle unexpected errors
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /status-machine/process-automated
 * Process automated status transitions (background job)
 */
export const processAutomatedTransitions = async (req, res) => {
  try {
    const result = await StatusMachineService.processAutomatedTransitions();

    res.json({
      success: true,
      message: result.message,
      data: result
    });

  } catch (error) {
    console.error('Process automated transitions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * GET /status-machine/history/:bookingId
 * Get status transition history for a booking
 */
export const getBookingStatusHistory = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const history = await StatusMachineService.getBookingStatusHistory(bookingId);

    res.json({
      success: true,
      message: 'Booking status history retrieved successfully',
      data: history
    });

  } catch (error) {
    console.error('Get booking status history error:', error);
    
    // Handle business errors with proper status codes
    if (isBusinessError(error)) {
      return res.status(getErrorStatusCode(error)).json({
        success: false,
        message: error.message
      });
    }

    // Handle unexpected errors
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * GET /status-machine/transitions/:status
 * Get available transitions for a status
 */
export const getAvailableTransitions = async (req, res) => {
  try {
    const { status } = req.params;
    const userRole = req.user.role;

    const transitions = StatusMachineService.getAvailableTransitions(status, userRole);

    res.json({
      success: true,
      message: 'Available transitions retrieved successfully',
      data: {
        currentStatus: status,
        userRole,
        availableTransitions: transitions
      }
    });

  } catch (error) {
    console.error('Get available transitions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * GET /status-machine/rules
 * Get all status transition rules
 */
export const getStatusRules = async (req, res) => {
  try {
    const rules = StatusMachineService.statusRules;
    const transitions = StatusMachineService.validStatusTransitions;

    res.json({
      success: true,
      message: 'Status rules retrieved successfully',
      data: {
        validTransitions: transitions,
        businessRules: rules
      }
    });

  } catch (error) {
    console.error('Get status rules error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
