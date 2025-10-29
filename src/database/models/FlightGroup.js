import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

// FlightGroup Model (enhanced Group)
const FlightGroup = sequelize.define('FlightGroup', {
  id: {
    type: DataTypes.CHAR(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
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
  carrierCode: {
    type: DataTypes.CHAR(2),
    allowNull: false,
    field: 'carrier_code'
  },
  flightNumber: {
    type: DataTypes.STRING(6),
    allowNull: false,
    field: 'flight_number'
  },
  pnrMode: {
    type: DataTypes.ENUM('GROUP_PNR', 'PER_BOOKING_PNR'),
    allowNull: false,
    defaultValue: 'PER_BOOKING_PNR',
    field: 'pnr_mode'
  },
  origin: {
    type: DataTypes.CHAR(3),
    allowNull: false
  },
  destination: {
    type: DataTypes.CHAR(3),
    allowNull: false
  },
  departureTimeUtc: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'departure_time_utc'
  },
  arrivalTimeUtc: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'arrival_time_utc'
  },
  departureTimeLocal: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'departure_time_local'
  },
  arrivalTimeLocal: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'arrival_time_local'
  },
  baggageRule: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'baggage_rule'
  },
  fareNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'fare_notes'
  },
  terms: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  salesStart: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'sales_start'
  },
  salesEnd: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'sales_end'
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'DRAFT'
  },
  createdBy: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  }
}, {
  tableName: 'flight_groups',
  timestamps: true,
  validate: {
    departureBeforeArrival() {
      if (this.departureTimeUtc >= this.arrivalTimeUtc) {
        throw new Error('Departure time must be before arrival time');
      }
    },
    localTimeConsistency() {
      if (this.departureTimeLocal.getTime() !== this.departureTimeUtc.getTime() ||
          this.arrivalTimeLocal.getTime() !== this.arrivalTimeUtc.getTime()) {
        throw new Error('Local times must represent the same instants as their UTC counterparts');
      }
    },
    futureTimes() {
      if (this.isNewRecord && (this.departureTimeUtc <= new Date() || this.arrivalTimeUtc <= new Date())) {
        throw new Error('Departure and arrival times must be in the future for new records');
      }
    },
    validSalesWindow() {
      if (this.salesStart >= this.salesEnd || this.salesEnd > this.departureTimeUtc) {
        throw new Error('Sales start must be before sales end, and sales end must be before or at departure time');
      }
    }
  },
  indexes: [
    {
      fields: ['status', 'sales_start', 'sales_end'],
      name: 'idx_pub'
    },
    {
      fields: ['origin', 'destination', 'departure_time_utc'],
      name: 'idx_route_time'
    }
  ]
});

export default FlightGroup;
