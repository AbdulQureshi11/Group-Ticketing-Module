import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

// PaymentProof Model
const PaymentProof = sequelize.define('PaymentProof', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bookingId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'booking_id',
    references: {
      model: 'bookings',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  fileUrl: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'file_url'
  },
  bankName: {
    type: DataTypes.STRING(80),
    allowNull: true,
    field: 'bank_name'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  currency: {
    type: DataTypes.CHAR(3),
    allowNull: true
  },
  referenceNo: {
    type: DataTypes.STRING(80),
    allowNull: true,
    field: 'reference_no'
  },
  uploadedByUserId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'uploaded_by_user_id',
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'uploaded_at'
  }
}, {
  timestamps: false,
  indexes: [
    {
      fields: ['booking_id']
    }
  ]
});

export default PaymentProof;
