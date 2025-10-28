import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

// Attachment Model (generic file storage)
const Attachment = sequelize.define('Attachment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  entityType: {
    type: DataTypes.ENUM('FLIGHT_GROUP', 'BOOKING', 'PASSENGER', 'USER', 'AGENCY'),
    allowNull: false,
    field: 'entity_type'
  },
  entityId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'entity_id'
  },
  fileUrl: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'file_url'
  },
  uploadedByUserId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'uploaded_by_user_id'
  },
  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'uploaded_at'
  },
  description: {
    type: DataTypes.STRING(160),
    allowNull: true
  }
}, {
  timestamps: false,
  indexes: [
    {
      fields: ['entity_type', 'entity_id']
    }
  ]
});

export default Attachment;
