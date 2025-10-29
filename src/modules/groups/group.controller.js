import { FlightGroup, BookingRequest, GroupAgencyAllocation, GroupSeatBucket, AgencySettings, Agency } from '../../database/index.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import { AuditService } from '../../services/audit.service.js';

/**
 * GET /groups
 * List groups with filters (status, route, date range, agency)
 * Accessible by authenticated users - filtered by agency for non-admins
 * Sub-agents see only published & open groups
 */
export const getGroups = async (req, res) => {
  try {
    const { status, origin, destination, dateFrom, dateTo, agencyId } = req.query;
    const userRole = req.user.role;
    const userAgencyId = req.user.agencyId;

    // Build where clause
    const whereClause = {};

    // Filter by user's agency if not admin
    if (userRole !== 'ADMIN') {
      whereClause.agencyId = userAgencyId;
      
      // Sub-agents can only see published groups
      if (userRole === 'SUB_AGENT') {
        whereClause.status = 'PUBLISHED';
        // Only show groups within sales window
        whereClause[Op.and] = [
          { salesStart: { [Op.lte]: new Date() } },
          { salesEnd: { [Op.gte]: new Date() } }
        ];
      }
    } else if (agencyId) {
      whereClause.agencyId = agencyId;
    }

    // Apply additional filters
    if (status) {
      whereClause.status = status;
    }

    if (origin && destination) {
      whereClause.origin = origin;
      whereClause.destination = destination;
    }

    if (dateFrom && dateTo) {
      whereClause.departureTimeUtc = {
        [Op.between]: [new Date(dateFrom), new Date(dateTo)]
      };
    }

    const groups = await FlightGroup.findAll({
      where: whereClause,
      include: [
        {
          model: GroupSeatBucket,
          as: 'seatBuckets',
          attributes: ['paxType', 'totalSeats', 'seatsOnHold', 'seatsIssued', 'baseFare', 'taxAmount', 'feeAmount', 'currency']
        },
        {
          model: Agency,
          as: 'agency',
          attributes: ['id', 'name', 'code']
        }
      ],
      attributes: { exclude: ['deletedAt'] },
      order: [['createdAt', 'DESC']]
    });

    // Format response data
    const formattedGroups = groups.map(group => {
      const totalAvailable = group.seatBuckets.reduce((sum, bucket) => 
        sum + (bucket.totalSeats - bucket.seatsOnHold - bucket.seatsIssued), 0
      );
      
      return {
        id: group.id,
        agency: {
          id: group.agency.id,
          name: group.agency.name,
          code: group.agency.code
        },
        flight: {
          carrierCode: group.carrierCode,
          flightNumber: group.flightNumber
        },
        route: {
          origin: group.origin,
          destination: group.destination
        },
        times: {
          departure: {
            utc: group.departureTimeUtc,
            local: group.departureTimeLocal
          },
          arrival: {
            utc: group.arrivalTimeUtc,
            local: group.arrivalTimeLocal
          }
        },
        status: group.status,
        salesWindow: {
          start: group.salesStart,
          end: group.salesEnd
        },
        availability: {
          totalSeats: group.seatBuckets.reduce((sum, bucket) => sum + bucket.totalSeats, 0),
          availableSeats: totalAvailable,
          seatsOnHold: group.seatBuckets.reduce((sum, bucket) => sum + bucket.seatsOnHold, 0),
          seatsIssued: group.seatBuckets.reduce((sum, bucket) => sum + bucket.seatsIssued, 0)
        },
        seatBuckets: group.seatBuckets,
        pnrMode: group.pnrMode,
        baggageRule: group.baggageRule,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      };
    });

    res.json({
      success: true,
      message: 'Groups retrieved successfully',
      data: formattedGroups
    });

  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * GET /groups/:id
 * View group details with seat buckets and allocations
 * Accessible by authenticated users within their agency or admins
 * Sub-agents can only view published groups
 */
export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userAgencyId = req.user.agencyId;

    const group = await FlightGroup.findOne({
      where: { id },
      include: [
        {
          model: GroupSeatBucket,
          as: 'seatBuckets'
        },
        {
          model: Agency,
          as: 'agency',
          attributes: ['id', 'name', 'code']
        },
        {
          model: GroupAgencyAllocation,
          as: 'agencyAllocations',
          include: [{
            model: Agency,
            as: 'agency',
            attributes: ['id', 'name', 'code']
          }]
        }
      ],
      attributes: { exclude: ['deletedAt'] }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check agency access
    if (userRole !== 'ADMIN') {
      if (group.agencyId !== userAgencyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Can only access your own agency groups'
        });
      }
      
      // Sub-agents can only view published groups
      if (userRole === 'SUB_AGENT' && group.status !== 'PUBLISHED') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Group not published'
        });
      }
    }

    // Get booking statistics for this group
    const bookingStats = await BookingRequest.findAll({
      where: { flightGroupId: group.id },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('paxAdults')), 'totalAdults'],
        [sequelize.fn('SUM', sequelize.col('paxChildren')), 'totalChildren'],
        [sequelize.fn('SUM', sequelize.col('paxInfants')), 'totalInfants']
      ],
      group: ['status']
    });

    const groupResponse = {
      id: group.id,
      agency: {
        id: group.agency.id,
        name: group.agency.name,
        code: group.agency.code
      },
      flight: {
        carrierCode: group.carrierCode,
        flightNumber: group.flightNumber
      },
      route: {
        origin: group.origin,
        destination: group.destination
      },
      times: {
        departure: {
          utc: group.departureTimeUtc,
          local: group.departureTimeLocal
        },
        arrival: {
          utc: group.arrivalTimeUtc,
          local: group.arrivalTimeLocal
        }
      },
      status: group.status,
      pnrMode: group.pnrMode,
      salesWindow: {
        start: group.salesStart,
        end: group.salesEnd
      },
      baggageRule: group.baggageRule,
      fareNotes: group.fareNotes,
      terms: group.terms,
      seatBuckets: group.seatBuckets.map(bucket => ({
        paxType: bucket.paxType,
        totalSeats: bucket.totalSeats,
        seatsOnHold: bucket.seatsOnHold,
        seatsIssued: bucket.seatsIssued,
        availableSeats: bucket.totalSeats - bucket.seatsOnHold - bucket.seatsIssued,
        pricing: {
          baseFare: bucket.baseFare,
          taxAmount: bucket.taxAmount,
          feeAmount: bucket.feeAmount,
          totalFare: bucket.baseFare + bucket.taxAmount + bucket.feeAmount,
          currency: bucket.currency
        }
      })),
      agencyAllocations: group.agencyAllocations.map(allocation => ({
        agency: {
          id: allocation.agency.id,
          name: allocation.agency.name,
          code: allocation.agency.code
        },
        paxType: allocation.paxType,
        reservedSeats: allocation.reservedSeats
      })),
      statistics: {
        bookings: bookingStats.reduce((acc, stat) => {
          acc[stat.status.toLowerCase()] = {
            count: parseInt(stat.dataValues.count),
            totalPax: parseInt(stat.dataValues.totalAdults || 0) + 
                     parseInt(stat.dataValues.totalChildren || 0) + 
                     parseInt(stat.dataValues.totalInfants || 0)
          };
          return acc;
        }, {})
      },
      createdBy: group.createdBy,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    };

    res.json({
      success: true,
      message: 'Group retrieved successfully',
      data: groupResponse
    });

  } catch (error) {
    console.error('Get group by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /groups
 * Create new flight group (Admin | Manager* if allowed)
 * Body: flight info, times, pnrMode, salesWindow, baggage, notes, terms, seatBuckets[…]
 */
export const createGroup = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      carrierCode,
      flightNumber,
      origin,
      destination,
      departureTimeUtc,
      arrivalTimeUtc,
      departureTimeLocal,
      arrivalTimeLocal,
      pnrMode = 'PER_BOOKING_PNR',
      baggageRule,
      fareNotes,
      terms,
      salesStart,
      salesEnd,
      seatBuckets
    } = req.body;
    
    const userRole = req.user.role;
    const userId = req.user.id;
    const userAgencyId = req.user.agencyId;

    // Check permissions - Admin or Manager (if allowed)
    if (userRole !== 'ADMIN') {
      if (userRole === 'MANAGER') {
        // Check if manager is allowed to create groups
        const agencySettings = await AgencySettings.findOne({
          where: { agencyId: userAgencyId },
          transaction
        });
        
        if (!agencySettings?.allowManagerGroupCreate) {
          await transaction.rollback();
          return res.status(403).json({
            success: false,
            message: 'Managers are not allowed to create groups'
          });
        }
      } else {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Only Admins and Managers can create groups'
        });
      }
    }

    // Validate required fields
    const requiredFields = [
      carrierCode, flightNumber, origin, destination,
      departureTimeUtc, arrivalTimeUtc, departureTimeLocal, arrivalTimeLocal,
      salesStart, salesEnd, seatBuckets
    ];
    
    if (requiredFields.some(field => !field)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: carrierCode, flightNumber, origin, destination, times, salesWindow, seatBuckets'
      });
    }

    // Validate seat buckets
    if (!Array.isArray(seatBuckets) || seatBuckets.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one seat bucket is required'
      });
    }

    // Validate each seat bucket
    for (const bucket of seatBuckets) {
      if (!bucket.paxType || !bucket.totalSeats || !bucket.baseFare || !bucket.currency) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Each seat bucket must have paxType, totalSeats, baseFare, and currency'
        });
      }
      
      if (!['ADT', 'CHD', 'INF'].includes(bucket.paxType)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid passenger type. Must be ADT, CHD, or INF'
        });
      }
      
      if (bucket.totalSeats < 1) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Total seats must be greater than 0'
        });
      }
    }

    // Check for duplicate passenger types
    const paxTypes = seatBuckets.map(b => b.paxType);
    const uniquePaxTypes = [...new Set(paxTypes)];
    if (paxTypes.length !== uniquePaxTypes.length) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Duplicate passenger types are not allowed'
      });
    }

    // Create the flight group
    const newGroup = await FlightGroup.create({
      id: uuidv4(),
      agencyId: userAgencyId,
      carrierCode,
      flightNumber,
      pnrMode,
      origin,
      destination,
      departureTimeUtc: new Date(departureTimeUtc),
      arrivalTimeUtc: new Date(arrivalTimeUtc),
      departureTimeLocal: new Date(departureTimeLocal),
      arrivalTimeLocal: new Date(arrivalTimeLocal),
      baggageRule,
      fareNotes,
      terms,
      salesStart: new Date(salesStart),
      salesEnd: new Date(salesEnd),
      status: 'DRAFT',
      createdBy: userId
    }, { transaction });

    // Create seat buckets
    const createdBuckets = await Promise.all(seatBuckets.map(bucket => 
      GroupSeatBucket.create({
        id: uuidv4(),
        flightGroupId: newGroup.id,
        paxType: bucket.paxType,
        totalSeats: bucket.totalSeats,
        seatsOnHold: 0,
        seatsIssued: 0,
        baseFare: bucket.baseFare,
        taxAmount: bucket.taxAmount || 0,
        feeAmount: bucket.feeAmount || 0,
        currency: bucket.currency
      }, { transaction })
    ));

    await transaction.commit();

    // Log the group creation to audit
    await AuditService.logUserAction({
      userId,
      action: 'CREATE_GROUP',
      resource: 'flight_group',
      resourceId: newGroup.id,
      details: {
        carrierCode,
        flightNumber,
        origin,
        destination,
        departureTimeUtc,
        totalSeats: seatBuckets.reduce((sum, bucket) => sum + bucket.totalSeats, 0),
        status: 'DRAFT'
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Fetch the created group with associations
    const createdGroup = await FlightGroup.findOne({
      where: { id: newGroup.id },
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
      attributes: { exclude: ['deletedAt'] }
    });

    res.status(201).json({
      success: true,
      message: 'Flight group created successfully',
      data: createdGroup
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * PATCH /groups/:id
 * Update group details (Admin | Manager only)
 * Body: { status?, flight?, route?, totalSeats?, salesWindow?, departureDate?, basePrice?, currency? }
 */
export const patchGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userRole = req.user.role;
    const userAgencyCode = req.user.agencyCode;

    // Find the group
    const group = await FlightGroup.findOne({
      where: { id: parseInt(id) },
      attributes: { exclude: ['deletedAt'] }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check agency access
    if (userRole !== 'Admin' && group.agencyCode !== userAgencyCode) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Validate allowed fields
    const allowedFields = [
      'status', 'flight', 'route', 'totalSeats', 'salesWindow', 'departureDate', 'basePrice', 'currency'
    ];
    const invalidFields = Object.keys(updates).filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid fields: ${invalidFields.join(', ')}`
      });
    }

    // Validate status transition if status is being updated
    if (updates.status) {
      if (!validStatusTransitions[group.status].includes(updates.status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition from '${group.status}' to '${updates.status}'. Allowed transitions: ${validStatusTransitions[group.status].join(', ')}`
        });
      }
    }

    // Validate totalSeats if being updated
    if (updates.totalSeats !== undefined) {
      if (updates.totalSeats < 1 || updates.totalSeats > 500) {
        return res.status(400).json({
          success: false,
          message: 'Total seats must be between 1 and 500'
        });
      }

      // Check if there are existing bookings that would exceed new capacity
      const bookingCount = await BookingRequest.count({
        where: { groupId: group.id }
      });

      if (bookingCount > updates.totalSeats) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce total seats below ${bookingCount} (current bookings)`
        });
      }
    }

    // Validate salesWindow if being updated
    if (updates.salesWindow) {
      if (!updates.salesWindow.from || !updates.salesWindow.to) {
        return res.status(400).json({
          success: false,
          message: 'Sales window must have from and to dates'
        });
      }
    }

    // Prepare update object
    const updateData = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.flight) updateData.flight = updates.flight;
    if (updates.route) updateData.route = updates.route;
    if (updates.totalSeats !== undefined) {
      updateData.totalSeats = updates.totalSeats;
      // Recalculate available seats
      const currentBookings = await BookingRequest.sum('seatsBooked', {
        where: { groupId: group.id, status: ['approved', 'paid', 'issued'] }
      }) || 0;
      updateData.availableSeats = updates.totalSeats - currentBookings;
    }
    if (updates.salesWindow) {
      updateData.salesWindowFrom = updates.salesWindow.from;
      updateData.salesWindowTo = updates.salesWindow.to;
    }
    if (updates.departureDate) updateData.departureDate = updates.departureDate;
    if (updates.basePrice !== undefined) updateData.basePrice = updates.basePrice;
    if (updates.currency) updateData.currency = updates.currency;

    updateData.updatedAt = new Date();

    // Update the group
    await group.update(updateData);

    // Get updated group with booking count
    const updatedGroup = await FlightGroup.findOne({
      where: { id: parseInt(id) },
      attributes: { exclude: ['deletedAt'] }
    });

    const bookingCount = await BookingRequest.count({
      where: { groupId: updatedGroup.id }
    });

    const groupResponse = {
      id: updatedGroup.id,
      agencyCode: updatedGroup.agencyCode,
      flight: updatedGroup.flight,
      route: updatedGroup.route,
      status: updatedGroup.status,
      totalSeats: updatedGroup.totalSeats,
      availableSeats: updatedGroup.availableSeats,
      allocatedSeats: updatedGroup.allocatedSeats,
      salesWindowFrom: updatedGroup.salesWindowFrom,
      salesWindowTo: updatedGroup.salesWindowTo,
      departureDate: updatedGroup.departureDate,
      basePrice: updatedGroup.basePrice,
      currency: updatedGroup.currency,
      createdAt: updatedGroup.createdAt,
      updatedAt: updatedGroup.updatedAt,
      statistics: {
        bookings: bookingCount
      }
    };

    res.json({
      success: true,
      message: 'Group updated successfully',
      data: groupResponse
    });

  } catch (error) {
    console.error('Patch group error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * POST /groups/:id/allocations
 * Create seat allocation for agency
 * Body: { seats: number, notes?: string }
 */
export const createAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { seats, notes } = req.body;
    const userRole = req.user.role;
    const userAgencyCode = req.user.agencyCode;

    // Validate required fields
    if (!seats || typeof seats !== 'number' || seats < 1) {
      return res.status(400).json({
        success: false,
        message: 'Seats must be a number greater than 0'
      });
    }

    // Find the group
    const group = await FlightGroup.findOne({
      where: { id: parseInt(id) },
      attributes: { exclude: ['deletedAt'] }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check agency access
    if (userRole !== 'Admin' && group.agencyCode !== userAgencyCode) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if group is in a valid status for allocations
    if (group.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: `Cannot allocate seats for group with status '${group.status}'. Group must be 'open'.`
      });
    }

    // Check if enough seats are available
    if (seats > group.availableSeats) {
      return res.status(400).json({
        success: false,
        message: `Not enough seats available. Requested: ${seats}, Available: ${group.availableSeats}`
      });
    }

    // Check if agency already has an active allocation for this group
    const existingAllocation = await GroupAgencyAllocation.findOne({
      where: {
        groupId: group.id,
        agencyCode: userAgencyCode,
        status: 'active'
      }
    });

    if (existingAllocation) {
      return res.status(409).json({
        success: false,
        message: 'Your agency already has an active allocation for this group. Cancel the existing allocation first.'
      });
    }

    // Create the allocation
    let allocation;
    try {
      allocation = await GroupAgencyAllocation.create({
        groupId: group.id,
        agencyCode: userAgencyCode,
        seatsAllocated: seats,
        notes: notes || null,
        status: 'active'
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'Allocation already exists for this group and agency'
        });
      }
      throw error;
    }

    // Update the group's allocated seats count
    await group.update({
      allocatedSeats: group.allocatedSeats + seats,
      availableSeats: group.availableSeats - seats
    });

    // Get the updated allocation with group details
    const allocationWithGroup = await GroupAgencyAllocation.findOne({
      where: { id: allocation.id },
      include: [
        {
          model: FlightGroup,
          as: 'group',
          attributes: ['id', 'flight', 'route', 'status', 'totalSeats', 'availableSeats', 'allocatedSeats']
        }
      ]
    });

    const response = {
      id: allocationWithGroup.id,
      groupId: allocationWithGroup.groupId,
      agencyCode: allocationWithGroup.agencyCode,
      seatsAllocated: allocationWithGroup.seatsAllocated,
      status: allocationWithGroup.status,
      notes: allocationWithGroup.notes,
      allocatedAt: allocationWithGroup.allocatedAt,
      group: allocationWithGroup.group,
      statistics: {
        remainingSeats: allocationWithGroup.group.availableSeats,
        totalAllocated: allocationWithGroup.group.allocatedSeats
      }
    };

    res.status(201).json({
      success: true,
      message: 'Seat allocation created successfully',
      data: response
    });

  } catch (error) {
    console.error('Create allocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
