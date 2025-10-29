import { AgencySettings, Agency } from '../../database/index.js';

export class SettingsService {
  /**
   * Get agency settings for a specific agency
   * @param {string} agencyId - Agency ID
   * @param {string} userRole - User role for field filtering
   * @returns {Object} Agency settings with role-based field filtering
   */
  static async getAgencySettings(agencyId, userRole) {
    try {
      // Find or create agency settings
      let agencySettings = await AgencySettings.findOne({
        where: { agencyId },
        include: [{
          model: Agency,
          as: 'agency',
          attributes: ['id', 'name', 'code']
        }]
      });

      // If settings don't exist, create with defaults
      if (!agencySettings) {
        agencySettings = await AgencySettings.create({
          agencyId
        });

        // Fetch again with association
        agencySettings = await AgencySettings.findOne({
          where: { agencyId },
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

      return response;
    } catch (error) {
      console.error('SettingsService.getAgencySettings error:', error);
      throw error;
    }
  }

  /**
   * Update agency settings
   * @param {string} agencyId - Agency ID
   * @param {Object} settings - Settings to update
   * @param {string} userRole - User role for permission checking
   * @returns {Object} Updated agency settings
   */
  static async updateAgencySettings(agencyId, settings, userRole) {
    try {
      const {
        allowManagerGroupCreate,
        defaultHoldHours,
        defaultCurrency,
        notifyEmail,
        notifyPhone
      } = settings;

      // Find or create agency settings
      let agencySettings = await AgencySettings.findOne({
        where: { agencyId }
      });

      if (!agencySettings) {
        agencySettings = await AgencySettings.create({
          agencyId
        });
      }

      // Prepare update data
      const updateData = {};

      // Manager can update these settings
      if (defaultHoldHours !== undefined) {
        // Validate hold hours range (1-72 hours)
        const holdHours = parseInt(defaultHoldHours, 10);
        if (isNaN(holdHours) || holdHours < 1 || holdHours > 72) {
          throw new Error('defaultHoldHours must be between 1 and 72 hours');
        }
        updateData.defaultHoldHours = holdHours;
      }

      if (defaultCurrency !== undefined) {
        if (typeof defaultCurrency !== 'string' || !defaultCurrency.trim()) {
          throw new Error('defaultCurrency must be a non-empty string');
        }
        updateData.defaultCurrency = defaultCurrency.trim();
      }

      // Admin-only settings
      if (allowManagerGroupCreate !== undefined) {
        if (userRole !== 'ADMIN') {
          throw new Error('Only admins can update allowManagerGroupCreate');
        }
        updateData.allowManagerGroupCreate = Boolean(allowManagerGroupCreate);
      }

      if (notifyEmail !== undefined) {
        if (userRole !== 'ADMIN') {
          throw new Error('Only admins can update notifyEmail');
        }
        updateData.notifyEmail = notifyEmail?.trim() || null;
      }

      if (notifyPhone !== undefined) {
        if (userRole !== 'ADMIN') {
          throw new Error('Only admins can update notifyPhone');
        }
        updateData.notifyPhone = notifyPhone?.trim() || null;
      }

      // Update the settings
      await agencySettings.update(updateData);

      // Fetch updated settings with agency info
      const updatedSettings = await AgencySettings.findOne({
        where: { agencyId },
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

      return response;
    } catch (error) {
      console.error('SettingsService.updateAgencySettings error:', error);
      throw error;
    }
  }
}

export default SettingsService;
