import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

// BookingPassenger Model (enhanced Passenger)
const BookingPassenger = sequelize.define('BookingPassenger', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bookingId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'booking_id'
  },
  paxType: {
    type: DataTypes.ENUM('ADT', 'CHD', 'INF'),
    allowNull: false,
    field: 'pax_type'
  },
  title: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  firstName: {
    type: DataTypes.STRING(60),
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING(60),
    allowNull: false,
    field: 'last_name'
  },
  dob: {
    type: DataTypes.DATE,
    allowNull: true
  },
  nationality: {
    type: DataTypes.CHAR(2),
    allowNull: true
  },
  passportNo: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'passport_no'
  },
  passportExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'passport_expiry'
  },
  pnr: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  ticketNo: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'ticket_no'
  }
}, {
  tableName: 'booking_passengers',
  timestamps: true,
  indexes: [
    {
      fields: ['booking_id']
    },
    {
      fields: ['pnr']
    },
    {
      fields: ['ticket_no']
    }
  ]
});

export default BookingPassenger;
