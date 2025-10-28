import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

// User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.CHAR(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  agencyId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'agency_id'
  },
  username: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('ADMIN', 'MANAGER', 'SUB_AGENT'),
    allowNull: false,
    defaultValue: 'SUB_AGENT'
  },
  isActive: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    field: 'is_active'
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login_at'
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['agency_id', 'username']
    },
    {
      fields: ['role']
    }
  ]
});

export default User;
