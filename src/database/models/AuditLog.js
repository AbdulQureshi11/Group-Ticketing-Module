import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

// AuditLog Model
const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  actorUserId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'actor_user_id',
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  agencyId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'agency_id',
    references: {
      model: 'Agencies',
      key: 'id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  entityType: {
    type: DataTypes.ENUM('FLIGHT_GROUP', 'BOOKING', 'PASSENGER', 'USER', 'AGENCY', 'SETTING'),
    allowNull: false,
    field: 'entity_type'
  },
  entityId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'entity_id'
  },
  action: {
    type: DataTypes.STRING(40),
    allowNull: false
  },
  oldValues: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'old_values'
  },
  newValues: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'new_values'
  },
  occurredAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'occurred_at'
  }
}, {
  timestamps: false,
  indexes: [
    {
      fields: ['entity_type', 'entity_id'],
      name: 'idx_entity'
    },
    {
      fields: ['actor_user_id', 'occurred_at'],
      name: 'idx_actor_time'
    }
  ]
});

export default AuditLog;
