import bcrypt from "bcrypt";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function migratePasswords() {
  console.log('[MIGRATION] Starting password migration to bcrypt...');
  
  try {
    // Get all users with plain text passwords (not starting with $2b$)
    const plainTextUsers = await db.select()
      .from(users)
      .where(eq(users.password, users.password)); // Get all users first
    
    const usersToMigrate = plainTextUsers.filter(user => 
      !user.password.startsWith('$2b$') && 
      !user.password.startsWith('$2a$') &&
      !user.password.startsWith('$2y$')
    );
    
    console.log(`[MIGRATION] Found ${usersToMigrate.length} users with plain text passwords`);
    
    const saltRounds = 12;
    let migratedCount = 0;
    
    for (const user of usersToMigrate) {
      try {
        console.log(`[MIGRATION] Migrating password for user: ${user.username}`);
        
        // Hash the existing plain text password
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        
        // Update user with hashed password
        await db.update(users)
          .set({ 
            password: hashedPassword,
            updatedAt: new Date()
          })
          .where(eq(users.id, user.id));
        
        migratedCount++;
        console.log(`[MIGRATION] ✓ Migrated password for user ${user.username}`);
        
      } catch (error) {
        console.error(`[MIGRATION] ✗ Failed to migrate password for user ${user.username}:`, error);
      }
    }
    
    console.log(`[MIGRATION] Password migration completed. ${migratedCount}/${usersToMigrate.length} users migrated successfully.`);
    
    // Verify migration
    const remainingPlainText = await db.select()
      .from(users)
      .where(eq(users.password, users.password));
    
    const stillPlainText = remainingPlainText.filter(user => 
      !user.password.startsWith('$2b$') && 
      !user.password.startsWith('$2a$') &&
      !user.password.startsWith('$2y$')
    );
    
    if (stillPlainText.length === 0) {
      console.log('[MIGRATION] ✓ All passwords successfully migrated to bcrypt hashes');
    } else {
      console.log(`[MIGRATION] ⚠ Warning: ${stillPlainText.length} users still have plain text passwords`);
      stillPlainText.forEach(user => {
        console.log(`[MIGRATION] - ${user.username}: ${user.password.substring(0, 20)}...`);
      });
    }
    
  } catch (error) {
    console.error('[MIGRATION] Password migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  migratePasswords()
    .then(() => {
      console.log('[MIGRATION] Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[MIGRATION] Migration failed:', error);
      process.exit(1);
    });
}

export { migratePasswords };