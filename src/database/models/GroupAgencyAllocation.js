import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

// GroupAgencyAllocation Model (per-agency inventory)
const GroupAgencyAllocation = sequelize.define('GroupAgencyAllocation', {
  id: {
    type: DataTypes.CHAR(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  flightGroupId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'flight_group_id',
    references: {
      model: 'flight_groups',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  agencyId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'agency_id',
    references: {
      model: 'agencies',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  paxType: {
    type: DataTypes.ENUM('ADT', 'CHD', 'INF'),
    allowNull: false,
    field: 'pax_type'
  },
  reservedSeats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: true,
      min: 0
    },
    field: 'reserved_seats'
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['flight_group_id', 'agency_id', 'pax_type'],
      name: 'uk_agency_allocation'
    }
  ]
});

export default GroupAgencyAllocation;
