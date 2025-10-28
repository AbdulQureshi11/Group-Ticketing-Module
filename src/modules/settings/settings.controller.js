import { AgencySettings, Agency } from '../../database/index.js';

/**
 * GET /settings/agency
 * Fetch current agency settings
 */
export const getAgencySettings = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userAgencyId = req.user.agencyId;

    // Find or create agency settings
    let agencySettings = await AgencySettings.findOne({
      where: { agencyId: userAgencyId },
      include: [{
        model: Agency,
        as: 'agency',
        attributes: ['id', 'name', 'code']
      }]
    });

    // If settings don't exist, create with defaults
    if (!agencySettings) {
      agencySettings = await AgencySettings.create({
        agencyId: userAgencyId
      });

      // Fetch again with association
      agencySettings = await AgencySettings.findOne({
        where: { agencyId: userAgencyId },
        include: [{
          model: Agency,
          as: 'agency',
          attributes: ['id', 'name', 'code']
        }]
      });
    }

    // Remove internal fields that managers shouldn't see
    const response = {
      agencyId: agencySettings.agencyId,
      allowManagerGroupCreate: agencySettings.allowManagerGroupCreate,
      defaultHoldHours: agencySettings.defaultHoldHours,
      defaultCurrency: agencySettings.defaultCurrency,
      agency: agencySettings.agency
    };

    // Add admin-only fields if user is admin
    if (userRole === 'ADMIN') {
      response.notifyEmail = agencySettings.notifyEmail;
      response.notifyPhone = agencySettings.notifyPhone;
    }

    res.json({
      success: true,
      message: 'Agency settings retrieved successfully',
      data: response
    });

  } catch (error) {
    console.error('Get agency settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * PATCH /settings/agency
 * Update agency settings (Admin for sensitive settings, Manager for others)
 */
export const updateAgencySettings = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userAgencyId = req.user.agencyId;

    const {
      allowManagerGroupCreate,
      defaultHoldHours,
      defaultCurrency,
      notifyEmail,
      notifyPhone
    } = req.body;

    // Find or create agency settings
    let agencySettings = await AgencySettings.findOne({
      where: { agencyId: userAgencyId }
    });

    if (!agencySettings) {
      agencySettings = await AgencySettings.create({
        agencyId: userAgencyId
      });
    }

    // Prepare update data
    const updateData = {};

    // Manager can update these settings
    if (defaultHoldHours !== undefined) {
      // Validate hold hours range (1-72 hours)
      const holdHours = parseInt(defaultHoldHours);
      if (holdHours < 1 || holdHours > 72) {
        return res.status(400).json({
          success: false,
          message: 'defaultHoldHours must be between 1 and 72 hours'
        });
      }
      updateData.defaultHoldHours = holdHours;
    }

    if (defaultCurrency !== undefined) {
      updateData.defaultCurrency = defaultCurrency;
    }

    // Admin-only settings
    if (allowManagerGroupCreate !== undefined && userRole === 'ADMIN') {
      updateData.allowManagerGroupCreate = Boolean(allowManagerGroupCreate);
    }

    if (notifyEmail !== undefined && userRole === 'ADMIN') {
      updateData.notifyEmail = notifyEmail?.trim() || null;
    }

    if (notifyPhone !== undefined && userRole === 'ADMIN') {
      updateData.notifyPhone = notifyPhone?.trim() || null;
    }

    // Update the settings
    await agencySettings.update(updateData);

    // Log the settings change to audit
    const { AuditService } = await import('../../services/auditService.js');
    await AuditService.logUserAction({
      userId: req.user.id,
      action: 'UPDATE_AGENCY_SETTINGS',
      resource: 'agency_settings',
      resourceId: agencySettings.id,
      details: updateData,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Fetch updated settings with agency info
    const updatedSettings = await AgencySettings.findOne({
      where: { agencyId: userAgencyId },
      include: [{
        model: Agency,
        as: 'agency',
        attributes: ['id', 'name', 'code']
      }]
    });

    // Prepare response (hide admin-only fields from managers)
    const response = {
      agencyId: updatedSettings.agencyId,
      allowManagerGroupCreate: updatedSettings.allowManagerGroupCreate,
      defaultHoldHours: updatedSettings.defaultHoldHours,
      defaultCurrency: updatedSettings.defaultCurrency,
      agency: updatedSettings.agency
    };

    if (userRole === 'ADMIN') {
      response.notifyEmail = updatedSettings.notifyEmail;
      response.notifyPhone = updatedSettings.notifyPhone;
    }

    res.json({
      success: true,
      message: 'Agency settings updated successfully',
      data: response
    });

  } catch (error) {
    console.error('Update agency settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
