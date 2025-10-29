import { sequelize } from '../../config/database.js';
import { User, Agency, Group, Booking, Passenger, AgencySettings, Allocation } from '../index.js';

/**
 * Database Migration Script
 * Run this once to create all tables and seed initial data
 */
const migrateDatabase = async () => {
  try {
    console.log('🔄 Starting database migration...');

    // Create tables in order (respecting foreign key constraints)
    console.log('📋 Creating tables...');

    // Create independent tables first
    await Agency.sync();
    console.log('✅ Agencies table created');

    await AgencySettings.sync();
    console.log('✅ Agency Settings table created');

    await User.sync();
    console.log('✅ Users table created');

    await Group.sync();
    console.log('✅ Groups table created');

    await Allocation.sync();
    console.log('✅ Allocations table created');

    await Booking.sync();
    console.log('✅ Bookings table created');

    await Passenger.sync();
    console.log('✅ Passengers table created');

    // Seed initial data
    console.log('🌱 Seeding initial data...');
    
    // Guard: Prevent seeding in production unless explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.SEED_DB !== 'true') {
      console.log('⚠️  Skipping seed data in production (set SEED_DB=true to enable)');
      console.log('✅ Database migration completed (tables created, no seed data)');
      return;
    }

    // Seed Agencies
    const agencies = [
      {
        code: 'ABC123',
        name: 'ABC Travel Services',
        contactEmail: 'admin@abc-travel.com',
        contactPhone: '+92-21-1234567',
        address: '123 Main Street, Karachi, Pakistan',
        city: 'Karachi',
        country: 'Pakistan',
        isActive: true
      },
      {
        code: 'XYZ456',
        name: 'XYZ Tours & Travels',
        contactEmail: 'contact@xyz-tours.com',
        contactPhone: '+92-42-7654321',
        address: '456 Business Avenue, Lahore, Pakistan',
        city: 'Lahore',
        country: 'Pakistan',
        isActive: true
      }
    ];

    for (const agency of agencies) {
      try {
        await Agency.create(agency);
        console.log(`✅ Agency ${agency.code} created`);
      } catch (error) {
        console.log(`⚠️ Agency ${agency.code} might already exist:`, error.message);
      }
    }
    console.log('✅ Agencies seeding completed');

    // Seed Users
    // Use environment variables for passwords, fallback to development defaults
    const bcrypt = (await import('bcryptjs')).default;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'password123';
    const managerPassword = process.env.SEED_MANAGER_PASSWORD || 'password123';
    const agentPassword = process.env.SEED_AGENT_PASSWORD || 'password123';
    
    // Warn if using default passwords
    if (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_MANAGER_PASSWORD || !process.env.SEED_AGENT_PASSWORD) {
      console.log('⚠️  WARNING: Using default passwords for seed users. Set SEED_ADMIN_PASSWORD, SEED_MANAGER_PASSWORD, SEED_AGENT_PASSWORD in production.');
    }
    
    const users = [
      {
        username: 'admin',
        password: await bcrypt.hash(adminPassword, 10),
        role: 'Admin',
        agencyCode: 'ABC123',
        name: 'System Admin',
        email: 'admin@abc-travel.com',
        phone: '+92-21-1234567',
        isActive: true
      },
      {
        username: 'manager',
        password: await bcrypt.hash(managerPassword, 10),
        role: 'Manager',
        agencyCode: 'ABC123',
        name: 'Branch Manager',
        email: 'manager@abc-travel.com',
        phone: '+92-21-7654321',
        isActive: true
      },
      {
        username: 'agent',
        password: await bcrypt.hash(agentPassword, 10),
        role: 'Agent',
        agencyCode: 'XYZ456',
        name: 'Travel Agent',
        email: 'agent@xyz-tours.com',
        phone: '+92-42-1234567',
        isActive: true
      }
    ];

    for (const user of users) {
      try {
        await User.create(user);
        console.log(`✅ User ${user.username} created`);
      } catch (error) {
        console.log(`⚠️ User ${user.username} might already exist:`, error.message);
      }
    }
    console.log('✅ Users seeding completed');

    // Seed Agency Settings
    const settings = [
      {
        agencyId: 'ABC123',
        agencyName: 'ABC Travel Services',
        email: 'admin@abc-travel.com',
        phone: '+92-21-1234567',
        address: '123 Main Street, Karachi, Pakistan',
        currency: 'PKR',
        timezone: 'Asia/Karachi',
        language: 'en',
        maxBookingsPerDay: 50,
        autoApprovalEnabled: false,
        notificationEnabled: true,
        emailNotifications: {
          bookingConfirmed: true,
          paymentReceived: true,
          ticketIssued: true,
          bookingCancelled: true
        },
        smsNotifications: {
          bookingConfirmed: false,
          paymentReceived: true,
          ticketIssued: false,
          bookingCancelled: true
        },
        paymentSettings: {
          bankTransferEnabled: true,
          onlinePaymentEnabled: false,
          paymentDeadlineHours: 24
        }
      },
      {
        agencyId: 'XYZ456',
        agencyName: 'XYZ Tours & Travels',
        email: 'contact@xyz-tours.com',
        phone: '+92-42-7654321',
        address: '456 Business Avenue, Lahore, Pakistan',
        currency: 'PKR',
        timezone: 'Asia/Karachi',
        language: 'en',
        maxBookingsPerDay: 30,
        autoApprovalEnabled: true,
        notificationEnabled: true,
        emailNotifications: {
          bookingConfirmed: true,
          paymentReceived: false,
          ticketIssued: true,
          bookingCancelled: false
        },
        smsNotifications: {
          bookingConfirmed: true,
          paymentReceived: true,
          ticketIssued: true,
          bookingCancelled: true
        },
        paymentSettings: {
          bankTransferEnabled: true,
          onlinePaymentEnabled: true,
          paymentDeadlineHours: 48
        }
      }
    ];

    for (const setting of settings) {
      try {
        await AgencySettings.create(setting);
        console.log(`✅ Settings for ${setting.agencyId} created`);
      } catch (error) {
        console.log(`⚠️ Settings for ${setting.agencyId} might already exist:`, error.message);
      }
    }
    console.log('✅ Agency Settings seeding completed');

    // Seed Groups
    const groups = [
      {
        agencyCode: 'ABC123',
        flight: 'PK305',
        route: 'LHE-KHI',
        status: 'open',
        totalSeats: 50,
        availableSeats: 45,
        allocatedSeats: 5,
        salesWindowFrom: '2025-10-01T00:00:00Z',
        salesWindowTo: '2025-11-01T00:00:00Z',
        departureDate: '2025-10-15T10:00:00Z',
        basePrice: 15000.00,
        currency: 'PKR'
      },
      {
        agencyCode: 'ABC123',
        flight: 'PK306',
        route: 'KHI-LHE',
        status: 'open',
        totalSeats: 50,
        availableSeats: 50,
        allocatedSeats: 0,
        salesWindowFrom: '2025-10-02T00:00:00Z',
        salesWindowTo: '2025-11-02T00:00:00Z',
        departureDate: '2025-10-16T14:00:00Z',
        basePrice: 15000.00,
        currency: 'PKR'
      },
      {
        agencyCode: 'XYZ456',
        flight: 'PK201',
        route: 'LHE-ISB',
        status: 'draft',
        totalSeats: 30,
        availableSeats: 30,
        allocatedSeats: 0,
        salesWindowFrom: '2025-10-05T00:00:00Z',
        salesWindowTo: '2025-11-05T00:00:00Z',
        departureDate: '2025-10-20T08:00:00Z',
        basePrice: 12000.00,
        currency: 'PKR'
      }
    ];

    for (const group of groups) {
      try {
        await Group.create(group);
        console.log(`✅ Group ${group.flight} ${group.route} created`);
      } catch (error) {
        console.log(`⚠️ Group ${group.flight} ${group.route} might already exist:`, error.message);
      }
    }
    console.log('✅ Groups seeding completed');

    console.log('🎉 Database migration completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Agencies: ${agencies.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Agency Settings: ${settings.length}`);
    console.log(`   - Groups: ${groups.length}`);

  } catch (error) {
    console.error('❌ Database migration failed:', error);
    throw error;
  }
};

// Export for use in scripts
export { migrateDatabase };

// If run directly, execute migration
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
