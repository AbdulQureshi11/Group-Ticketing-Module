// Import all PRD-compliant models
import Agency from './models/Agency.js';
import User from './models/User.js';
import AgencySettings from './models/AgencySettings.js';
import FlightGroup from './models/FlightGroup.js';
import GroupSeatBucket from './models/GroupSeatBucket.js';
import GroupAgencyAllocation from './models/GroupAgencyAllocation.js';
import BookingRequest from './models/BookingRequest.js';
import BookingPassenger from './models/BookingPassenger.js';
import PaymentProof from './models/PaymentProof.js';
import AuditLog from './models/AuditLog.js';
import Attachment from './models/Attachment.js';
import RefreshToken from './models/RefreshToken.js';

// Define Associations per PRD requirements

// Agency hierarchy (parent-child relationship)
Agency.hasMany(Agency, {
  foreignKey: 'parentAgencyId',
  as: 'childAgencies',
  sourceKey: 'id'
});

Agency.belongsTo(Agency, {
  foreignKey: 'parentAgencyId',
  as: 'parentAgency',
  targetKey: 'id',
  constraints: false
});

// Agency relationships
Agency.hasMany(User, {
  foreignKey: 'agencyId',
  as: 'users',
  sourceKey: 'id'
});
Agency.hasOne(AgencySettings, {
  foreignKey: 'agencyId',
  as: 'settings',
  sourceKey: 'id'
});
Agency.hasMany(FlightGroup, {
  foreignKey: 'agencyId',
  as: 'flightGroups',
  sourceKey: 'id'
});
Agency.hasMany(BookingRequest, {
  foreignKey: 'requestingAgencyId',
  as: 'bookingRequests',
  sourceKey: 'id'
});
Agency.hasMany(GroupAgencyAllocation, {
  foreignKey: 'agencyId',
  as: 'agencyAllocations',
  sourceKey: 'id'
});
Agency.hasMany(AuditLog, {
  foreignKey: 'agencyId',
  as: 'auditLogs',
  sourceKey: 'id'
});

// User relationships
User.belongsTo(Agency, {
  foreignKey: 'agencyId',
  as: 'agency',
  targetKey: 'id'
});

// RefreshToken relationships
RefreshToken.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
  targetKey: 'id'
});

User.hasMany(RefreshToken, {
  foreignKey: 'userId',
  as: 'refreshTokens'
});

// AgencySettings relationships
AgencySettings.belongsTo(Agency, {
  foreignKey: 'agencyId',
  as: 'agency',
  targetKey: 'id'
});

// FlightGroup relationships
FlightGroup.belongsTo(Agency, {
  foreignKey: 'agencyId',
  as: 'agency',
  targetKey: 'id'
});
FlightGroup.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'createdByUser',
  targetKey: 'id'
});
FlightGroup.hasMany(GroupSeatBucket, {
  foreignKey: 'flightGroupId',
  as: 'seatBuckets',
  sourceKey: 'id'
});
FlightGroup.hasMany(BookingRequest, {
  foreignKey: 'flightGroupId',
  as: 'bookingRequests',
  sourceKey: 'id'
});
FlightGroup.hasMany(GroupAgencyAllocation, {
  foreignKey: 'flightGroupId',
  as: 'agencyAllocations',
  sourceKey: 'id'
});

// GroupSeatBucket relationships
GroupSeatBucket.belongsTo(FlightGroup, {
  foreignKey: 'flightGroupId',
  as: 'flightGroup',
  targetKey: 'id'
});

// GroupAgencyAllocation relationships
GroupAgencyAllocation.belongsTo(FlightGroup, {
  foreignKey: 'flightGroupId',
  as: 'flightGroup',
  targetKey: 'id'
});
GroupAgencyAllocation.belongsTo(Agency, {
  foreignKey: 'agencyId',
  as: 'agency',
  targetKey: 'id'
});

// BookingRequest relationships
BookingRequest.belongsTo(FlightGroup, {
  foreignKey: 'flightGroupId',
  as: 'flightGroup',
  targetKey: 'id'
});
BookingRequest.belongsTo(Agency, {
  foreignKey: 'requestingAgencyId',
  as: 'requestingAgency',
  targetKey: 'id'
});
BookingRequest.belongsTo(User, {
  foreignKey: 'requestedByUserId',
  as: 'requestedByUser',
  targetKey: 'id'
});
BookingRequest.belongsTo(User, {
  foreignKey: 'approvalUserId',
  as: 'approvedByUser',
  targetKey: 'id'
});
BookingRequest.hasMany(BookingPassenger, {
  foreignKey: 'bookingId',
  as: 'passengers',
  sourceKey: 'id'
});
BookingRequest.hasMany(PaymentProof, {
  foreignKey: 'bookingId',
  as: 'paymentProofs',
  sourceKey: 'id'
});

// BookingPassenger relationships
BookingPassenger.belongsTo(BookingRequest, {
  foreignKey: 'bookingId',
  as: 'bookingRequest',
  targetKey: 'id'
});

// PaymentProof relationships
PaymentProof.belongsTo(BookingRequest, {
  foreignKey: 'bookingId',
  as: 'bookingRequest',
  targetKey: 'id'
});
PaymentProof.belongsTo(User, {
  foreignKey: 'uploadedByUserId',
  as: 'uploadedByUser',
  targetKey: 'id'
});

// AuditLog relationships
AuditLog.belongsTo(User, {
  foreignKey: 'actorUserId',
  as: 'actorUser',
  targetKey: 'id'
});
AuditLog.belongsTo(Agency, {
  foreignKey: 'agencyId',
  as: 'agency',
  targetKey: 'id'
});

// Attachment relationships (generic)
Attachment.belongsTo(User, {
  foreignKey: 'uploadedByUserId',
  as: 'uploadedByUser',
  targetKey: 'id'
});

// Export all models
export {
  Agency,
  User,
  AgencySettings,
  FlightGroup,
  GroupSeatBucket,
  GroupAgencyAllocation,
  BookingRequest,
  BookingPassenger,
  PaymentProof,
  AuditLog,
  Attachment,
  RefreshToken
};

// Export default object for convenience
export default {
  Agency,
  User,
  AgencySettings,
  FlightGroup,
  GroupSeatBucket,
  GroupAgencyAllocation,
  BookingRequest,
  BookingPassenger,
  PaymentProof,
  AuditLog,
  Attachment,
  RefreshToken
};
