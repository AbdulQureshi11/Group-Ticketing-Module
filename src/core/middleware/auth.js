import { verifyToken } from '../utils/jwt.js';

/**
 * Middleware to authenticate JWT tokens
 * Extracts token from Authorization header (Bearer <token>)
 * Attaches user info to req.user
 */
export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const decoded = verifyToken(token);
    req.user = decoded; // Attach user info to request
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message || 'Unknown error');
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Middleware to check if user has required roles
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 */
export const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Middleware to check if user can create groups
 * Admin can always create, Manager can only if agency allows it
 */
export const requireGroupCreationAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const { role, agencyId } = req.user;

  // Admin can always create groups
  if (role === 'ADMIN') {
    return next();
  }

  // Manager can create groups only if agency allows it
  if (role === 'MANAGER') {
    try {
      const { AgencySettings } = await import('../models/index.js');
      const agencySettings = await AgencySettings.findOne({
        where: { agencyId }
      });

      if (agencySettings?.allowManagerGroupCreate) {
        return next();
      } else {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Manager group creation not allowed for your agency'
        });
      }
    } catch (error) {
      console.error('Error checking agency settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking group creation permissions'
      });
    }
  }

  // Sub-Agent cannot create groups
  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions to create groups'
  });
};

/**
 * Middleware to check if user can update admin-only settings
 * Certain settings like allowManagerGroupCreate should be Admin-only
 */
export const requireAdminSettingsAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const { role } = req.user;

  // Only Admin can update sensitive settings
  if (role === 'ADMIN') {
    return next();
  }

  // Check if the request contains admin-only settings
  const adminOnlySettings = ['allowManagerGroupCreate'];
  const requestedUpdates = Object.keys(req.body || {});

  const hasAdminOnlySetting = requestedUpdates.some(setting =>
    adminOnlySettings.includes(setting)
  );

  if (hasAdminOnlySetting) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin-only settings cannot be modified'
    });
  }

  // Manager can update other settings
  if (role === 'MANAGER') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions to update settings'
  });
};

/**
 * Middleware to check report access permissions
 * Admin: All reports
 * Manager: Own agency + delegated sub-agencies  
 * Sub-Agent: Own bookings only
 */
export const requireReportAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const { role } = req.user;

  // Admin can access all reports
  if (role === 'ADMIN') {
    return next();
  }

  // Manager and Sub-Agent can access reports (with appropriate filtering)
  if (role === 'MANAGER' || role === 'SUB_AGENT') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions to access reports'
  });
};
export const requireAgencyAccess = (idParam = 'id', resourceType = 'agency') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admin can access any agency
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const userAgencyId = req.user.agencyId;

    try {
      switch (resourceType) {
        case 'agency':
          // For direct agency access, check if user belongs to the requested agency
          const requestedAgencyId = req.params[idParam] || req.body.agencyId;
          if (userAgencyId !== requestedAgencyId) {
            return res.status(403).json({
              success: false,
              message: 'Access denied: Can only access your own agency resources'
            });
          }
          break;

        case 'group':
          // For flight groups, check if group belongs to user's agency
          const { FlightGroup } = await import('../models/index.js');
          const group = await FlightGroup.findOne({
            where: { id: req.params[idParam] },
            attributes: ['agencyId']
          });
          
          if (!group) {
            return res.status(404).json({
              success: false,
              message: 'Flight group not found'
            });
          }
          
          if (group.agencyId !== userAgencyId) {
            return res.status(403).json({
              success: false,
              message: 'Access denied: Can only access your own agency groups'
            });
          }
          break;

        case 'booking':
          // For booking requests, check if booking belongs to user's agency
          const { BookingRequest } = await import('../models/index.js');
          const booking = await BookingRequest.findOne({
            where: { id: req.params[idParam] },
            attributes: ['requestingAgencyId']
          });
          
          if (!booking) {
            return res.status(404).json({
              success: false,
              message: 'Booking request not found'
            });
          }
          
          if (booking.requestingAgencyId !== userAgencyId) {
            return res.status(403).json({
              success: false,
              message: 'Access denied: Can only access your own agency bookings'
            });
          }
          break;

        case 'passenger':
          // For passengers, check agency access via associated booking
          const { BookingPassenger } = await import('../models/index.js');
          const passenger = await BookingPassenger.findOne({
            where: { id: req.params[idParam] },
            attributes: ['bookingId']
          });

          if (!passenger) {
            return res.status(404).json({
              success: false,
              message: 'Passenger not found'
            });
          }

          // Now check if the associated booking belongs to user's agency
          const bookingForPassenger = await BookingRequest.findOne({
            where: { id: passenger.bookingId },
            attributes: ['requestingAgencyId']
          });

          if (!bookingForPassenger) {
            return res.status(404).json({
              success: false,
              message: 'Associated booking not found'
            });
          }

          if (bookingForPassenger.requestingAgencyId !== userAgencyId) {
            return res.status(403).json({
              success: false,
              message: 'Access denied: Can only access passengers from your own agency bookings'
            });
          }
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid resource type for agency access check'
          });
      }

      next();
    } catch (error) {
      console.error('Agency access check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking agency access'
      });
    }
  };
};
