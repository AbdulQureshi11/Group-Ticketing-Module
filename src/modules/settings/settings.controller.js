import { SettingsService } from './settings.service.js';
import { AuditService } from '../../services/auditService.js';

/**
 * GET /settings/agency
 * Fetch current agency settings
 */
export const getAgencySettings = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userAgencyId = req.user.agencyId;

    const settings = await SettingsService.getAgencySettings(userAgencyId, userRole);

    res.json({
      success: true,
      message: 'Agency settings retrieved successfully',
      data: settings
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

    const settings = await SettingsService.updateAgencySettings(userAgencyId, req.body, userRole);

    // Log the settings change to audit
    await AuditService.logUserAction({
      userId: req.user.id,
      action: 'UPDATE_AGENCY_SETTINGS',
      resource: 'agency_settings',
      resourceId: settings.agencyId,
      details: req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Agency settings updated successfully',
      data: settings
    });

  } catch (error) {
    console.error('Update agency settings error:', error);

    // Handle validation errors with appropriate status codes
    if (error.message.includes('must be between') ||
        error.message.includes('must be a non-empty') ||
        error.message.includes('Only admins can')) {
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
