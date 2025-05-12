import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Migration script to add is_active column to users table
async function runMigration() {
  console.log('Starting migration to add is_active field to users table...');
  
  // Connect to the database
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  const client = postgres(connectionString, { ssl: 'require' });
  const db = drizzle(client);
  
  try {
    // Add is_active column if it doesn't exist
    // Call the client directly as a function to execute SQL
    await client`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
    `;
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close the database connection
    await client.end();
  }
}

// Run the migration
runMigration();
