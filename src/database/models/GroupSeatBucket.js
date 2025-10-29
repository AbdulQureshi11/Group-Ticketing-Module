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
    validate: {
      isInt: true,
      min: 0
    },
    field: 'total_seats'
  },
  seatsOnHold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      isInt: true,
      min: 0
    },
    field: 'seats_on_hold'
  },
  seatsIssued: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      isInt: true,
      min: 0
    },
    field: 'seats_issued'
  },
  baseFare: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    field: 'base_fare'
  },
  taxAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    field: 'tax_amount'
  },
  feeAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    field: 'fee_amount'
  },
  currency: {
    type: DataTypes.CHAR(3),
    allowNull: false,
    validate: {
      is: /^[A-Z]{3}$/
    }
  }
}, {
  tableName: 'group_seat_buckets',
  timestamps: true,
  validate: {
    checkSeatAllocation() {
      if (this.seatsOnHold + this.seatsIssued > this.totalSeats) {
        throw new Error('Seats on hold and issued cannot exceed total seats');
      }
    }
  },
  indexes: [
    {
      unique: true,
      fields: ['flight_group_id', 'pax_type'],
      name: 'uk_bucket'
    }
  ]
});

export default GroupSeatBucket;
