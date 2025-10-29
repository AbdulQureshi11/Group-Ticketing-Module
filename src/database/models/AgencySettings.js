import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

// AgencySettings Model
const AgencySettings = sequelize.define('AgencySettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  agencyId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    unique: true,
    field: 'agency_id'
  },
  allowManagerGroupCreate: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 0,
    field: 'allow_manager_group_create'
  },
  defaultHoldHours: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 24,
    validate: {
      isInt: true,
      min: 0,
      max: 168
    },
    field: 'default_hold_hours'
  },
  defaultCurrency: {
    type: DataTypes.CHAR(3),
    allowNull: false,
    defaultValue: 'PKR',
    validate: {
      is: /^[A-Z]{3}$/
    },
    set(value) {
      this.setDataValue('defaultCurrency', value && String(value).toUpperCase());
    },
    field: 'default_currency'
  },
  notifyEmail: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'notify_email'
  },
  notifyPhone: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'notify_phone'
  }
}, {
  tableName: 'agency_settings',
  timestamps: true
});

export default AgencySettings;
