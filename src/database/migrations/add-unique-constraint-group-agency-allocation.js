import { sequelize } from '../config/database.js';

/**
 * Migration: Add unique constraint to GroupAgencyAllocation
 * This migration adds a unique index on (flight_group_id, agency_id, pax_type)
 * and handles deduplication of existing duplicate rows.
 */
const addUniqueConstraintGroupAgencyAllocation = async () => {
  const transaction = await sequelize.transaction();
  try {
    console.log('🔄 Adding unique constraint to GroupAgencyAllocation...');

    // First, deduplicate existing rows (keep the one with highest reserved_seats or latest updated_at)
    console.log('🧹 Deduplicating existing duplicate rows...');
    await sequelize.query(`
      DELETE t1 FROM group_agency_allocations t1
      INNER JOIN group_agency_allocations t2
      WHERE t1.flight_group_id = t2.flight_group_id
        AND t1.agency_id = t2.agency_id
        AND t1.pax_type = t2.pax_type
        AND t1.id != t2.id
        AND (t1.reserved_seats < t2.reserved_seats 
             OR (t1.reserved_seats = t2.reserved_seats AND t1.updated_at < t2.updated_at));
    `, { transaction });

    // Now add the unique index
    console.log('📋 Adding unique index...');
    await sequelize.query(`
      ALTER TABLE group_agency_allocations
      ADD CONSTRAINT uk_agency_allocation
      UNIQUE (flight_group_id, agency_id, pax_type);
    `, { transaction });

    await transaction.commit();
    console.log('✅ Unique constraint added successfully');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

export default addUniqueConstraintGroupAgencyAllocation;
