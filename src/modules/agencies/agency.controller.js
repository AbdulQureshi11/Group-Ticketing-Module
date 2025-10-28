import { Agency, User, FlightGroup, BookingRequest } from '../../database/index.js';

/**
 * GET /agencies/:id
 * Get agency details by ID
 * Accessible by authenticated users within their agency or admins
 */
export const getAgency = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userAgencyCode = req.user.agencyCode;

    // Find agency by ID
    const agency = await Agency.findOne({
      where: {
        id: parseInt(id),
        isActive: true
      },
      attributes: { exclude: ['deletedAt'] }
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agency not found'
      });
    }

    // Check if user has access to this agency
    if (userRole !== 'Admin' && agency.id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get additional statistics
    const [userCount, groupCount, bookingCount] = await Promise.all([
      User.count({ where: { agencyId: agency.id, isActive: true } }),
      FlightGroup.count({ where: { agencyId: agency.id } }),
      BookingRequest.count({ where: { requestingAgencyId: agency.id } })
    ]);

    const agencyResponse = {
      id: agency.id,
      code: agency.code,
      name: agency.name,
      contactEmail: agency.contactEmail,
      contactPhone: agency.contactPhone,
      address: agency.address,
      city: agency.city,
      country: agency.country,
      status: agency.status,
      createdAt: agency.createdAt,
      updatedAt: agency.updatedAt,
      statistics: {
        users: userCount,
        groups: groupCount,
        bookings: bookingCount
      }
    };

    res.json({
      success: true,
      message: 'Agency retrieved successfully',
      data: agencyResponse
    });

  } catch (error) {
    console.error('Get agency error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /agencies
 * Create new agency (Admin only)
 */
export const createAgency = async (req, res) => {
  try {
    const { code, name, contactEmail, contactPhone, address, city, country } = req.body;

    // Validate required fields
    if (!code || !name || !contactEmail) {
      return res.status(400).json({
        success: false,
        message: 'Code, name, and contact email are required'
      });
    }

    // Check if agency code already exists
    const existingAgency = await Agency.findOne({
      where: { code: code }
    });

    if (existingAgency) {
      return res.status(409).json({
        success: false,
        message: 'Agency with this code already exists'
      });
    }

    // Create agency
    const newAgency = await Agency.create({
      code,
      name,
      contactEmail,
      contactPhone,
      address,
      city,
      country,
      status: 'ACTIVE'
    });

    const agencyResponse = {
      id: newAgency.id,
      code: newAgency.code,
      name: newAgency.name,
      contactEmail: newAgency.contactEmail,
      contactPhone: newAgency.contactPhone,
      address: newAgency.address,
      city: newAgency.city,
      country: newAgency.country,
      status: newAgency.status,
      createdAt: newAgency.createdAt,
      updatedAt: newAgency.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Agency created successfully',
      data: agencyResponse
    });

  } catch (error) {
    console.error('Create agency error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
