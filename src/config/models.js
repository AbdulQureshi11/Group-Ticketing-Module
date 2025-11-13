import sequelize from "./config.js";
import { DataTypes } from "sequelize";

// Import model factories
import UserModel from "../app/auth/authModel.js";
import ManagerModel from "../app/manager/managerModel.js";
import SubAgentRequestModel from "../app/subAgent/agentModel.js";
import AdminRequestModel from "../app/admin/adminModel.js";
import AgencyModel from "../app/agency/agencyModel.js";
import GroupModel from "../app/group/groupModel.js";
import GroupSeatBucketModel from "../app/group/groupSeatBucketModel.js";
import BookingModel from "../app/booking/bookingModel.js";
import PassengerModel from "../app/passenger/passengerModel.js";
import PaymentProofModel from "../app/payment/paymentModel.js";
import AuditLogModel from "../app/audit/auditModel.js";
import SettingsModel from "../app/setting/settingsModel.js";
import NotificationModel from "../app/notification/notificationModel.js";

// Initialize DB object
const db = {};
db.Sequelize = sequelize.Sequelize;
db.sequelize = sequelize;

// Initialize all models
db.User = UserModel(DataTypes, sequelize);
db.Manager = ManagerModel(DataTypes, sequelize);
db.SubAgentRequest = SubAgentRequestModel(DataTypes, sequelize);
db.AdminRequest = AdminRequestModel(DataTypes, sequelize);
db.Agency = AgencyModel(DataTypes, sequelize);
db.FlightGroup = GroupModel(DataTypes, sequelize);
db.GroupSeatBucket = GroupSeatBucketModel(DataTypes, sequelize);
db.Booking = BookingModel(DataTypes, sequelize);
db.Passenger = PassengerModel(DataTypes, sequelize);
db.PaymentProof = PaymentProofModel(DataTypes, sequelize);
db.AuditLog = AuditLogModel(DataTypes, sequelize);
db.AgencySettings = SettingsModel(DataTypes, sequelize);
db.Notification = NotificationModel(DataTypes, sequelize);


//  Define Associations

//  Agency - Users
db.Agency.hasMany(db.User, { foreignKey: "agency_id" });
db.User.belongsTo(db.Agency, { foreignKey: "agency_id" });

// Agency - Bookings
db.Agency.hasMany(db.Booking, { foreignKey: "agency_id" });
db.Booking.belongsTo(db.Agency, { foreignKey: "agency_id" });

// FlightGroup - Bookings
db.FlightGroup.hasMany(db.Booking, { foreignKey: "flight_group_id" });
db.Booking.belongsTo(db.FlightGroup, { foreignKey: "flight_group_id" });

// FlightGroup - SeatBuckets
db.FlightGroup.hasMany(db.GroupSeatBucket, {
    foreignKey: "flight_group_id",
    as: "buckets",
    onDelete: "CASCADE",
});
db.GroupSeatBucket.belongsTo(db.FlightGroup, {
    foreignKey: "flight_group_id",
});

// User - Bookings (requested_by)
db.User.hasMany(db.Booking, { foreignKey: "requested_by", constraints: false });
db.Booking.belongsTo(db.User, { foreignKey: "requested_by", constraints: false });

// Booking - Passengers 
db.Booking.hasMany(db.Passenger, { foreignKey: "booking_id" });
db.Passenger.belongsTo(db.Booking, { foreignKey: "booking_id" });

//  Booking - PaymentProof 
db.Booking.hasMany(db.PaymentProof, { foreignKey: "booking_id" });
db.PaymentProof.belongsTo(db.Booking, { foreignKey: "booking_id" });

//  User - PaymentProof (uploaded_by)
db.User.hasMany(db.PaymentProof, { foreignKey: "uploaded_by", constraints: false });
db.PaymentProof.belongsTo(db.User, { foreignKey: "uploaded_by", constraints: false });

// User - AuditLogs
db.User.hasMany(db.AuditLog, { foreignKey: "user_id", constraints: false });
db.AuditLog.belongsTo(db.User, { foreignKey: "user_id", constraints: false });

// Agency - AgencySettings
db.Agency.hasOne(db.AgencySettings, { foreignKey: "agency_id" });
db.AgencySettings.belongsTo(db.Agency, { foreignKey: "agency_id" });

// User - Notifications
db.User.hasMany(db.Notification, { foreignKey: "user_id", constraints: false });
db.Notification.belongsTo(db.User, { foreignKey: "user_id", constraints: false });

// Agency - Notifications
db.Agency.hasMany(db.Notification, { foreignKey: "agency_id", constraints: false });
db.Notification.belongsTo(db.Agency, { foreignKey: "agency_id", constraints: false });

export default db;
