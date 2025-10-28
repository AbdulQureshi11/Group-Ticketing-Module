import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

// GroupSeatBucket Model (ADT/CHD/INF pricing)
const GroupSeatBucket = sequelize.define('GroupSeatBucket', {
  id: {
    type: DataTypes.CHAR(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  flightGroupId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'flight_group_id'
  },
  paxType: {
    type: DataTypes.ENUM('ADT', 'CHD', 'INF'),
    allowNull: false,
    field: 'pax_type'
  },
  totalSeats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'total_seats'
  },
  seatsOnHold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'seats_on_hold'
  },
  seatsIssued: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'seats_issued'
  },
  baseFare: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'base_fare'
  },
  taxAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'tax_amount'
  },
  feeAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'fee_amount'
  },
  currency: {
    type: DataTypes.CHAR(3),
    allowNull: false
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['flight_group_id', 'pax_type'],
      name: 'uk_bucket'
    }
  ]
});

export default GroupSeatBucket;
