import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

// BookingRequest Model (enhanced Booking)
const BookingRequest = sequelize.define('BookingRequest', {
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
  requestingAgencyId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'requesting_agency_id'
  },
  requestedByUserId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'requested_by_user_id'
  },
  paxAdults: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
    field: 'pax_adults'
  },
  paxChildren: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
    field: 'pax_children'
  },
  paxInfants: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
    field: 'pax_infants'
  },
  pnr: {
    type: DataTypes.STRING(6),
    allowNull: true,
    unique: true,
    field: 'pnr'
  },
  status: {
    type: DataTypes.ENUM('REQUESTED', 'APPROVED', 'REJECTED', 'PAYMENT_PENDING', 'PAID', 'ISSUED', 'EXPIRED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'REQUESTED'
  },
  holdExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'hold_expires_at'
  },
  approvalUserId: {
    type: DataTypes.CHAR(36),
    allowNull: true,
    field: 'approval_user_id'
  },
  approvalAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approval_at'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason'
  },
  paymentReference: {
    type: DataTypes.STRING(80),
    allowNull: true,
    field: 'payment_reference'
  },
  paymentReceivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'payment_received_at'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['flight_group_id', 'status'],
      name: 'idx_fg_status'
    },
    {
      fields: ['requesting_agency_id', 'status'],
      name: 'idx_agency_status'
    },
    {
      fields: ['hold_expires_at'],
      name: 'idx_expiry'
    }
  ]
});

// Add model-level validator to ensure at least one passenger
BookingRequest.addHook('beforeValidate', (booking) => {
  const totalPax = booking.paxAdults + booking.paxChildren + booking.paxInfants;
  if (totalPax === 0) {
    throw new Error('Booking must have at least one passenger');
  }
});

export default BookingRequest;
