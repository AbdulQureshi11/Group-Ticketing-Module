import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

// Agency Model
const Agency = sequelize.define('Agency', {
  id: {
    type: DataTypes.CHAR(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },
  parentAgencyId: {
    type: DataTypes.CHAR(36),
    allowNull: true,
    field: 'parent_agency_id',
    references: {
      model: 'Agency',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'SUSPENDED'),
    allowNull: false,
    defaultValue: 'ACTIVE'
  },
  contactEmail: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'contact_email'
  },
  contactPhone: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'contact_phone'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['parent_agency_id']
    },
    {
      fields: ['status']
    },
    {
      unique: true,
      fields: ['code']
    }
  ]
});

export default Agency;
