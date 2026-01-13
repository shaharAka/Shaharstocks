/**
 * Migration script to migrate existing users to Firebase Authentication
 * 
 * This script:
 * 1. Creates Firebase users for existing email/password users
 * 2. Links existing Google users to Firebase
 * 3. Updates database records with firebaseUid
 * 
 * Usage:
 *   tsx scripts/migrate-users-to-firebase.ts
 */

import 'dotenv/config';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq, isNotNull } from 'drizzle-orm';
import { createUser, getUserByUid, updateUser as updateFirebaseUser } from '../server/firebaseAdmin';
import { initializeFirebaseAdmin } from '../server/firebaseAdmin';
import { log } from '../server/logger';

interface MigrationResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ email: string; error: string }>;
}

async function migrateUsersToFirebase(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin();
    log.info("Firebase Admin initialized", "migration");

    // Get all users
    const allUsers = await db.select().from(users).where(eq(users.archived, false));
    log.info(`Found ${allUsers.length} users to migrate`, "migration");

    for (const user of allUsers) {
      try {
        // Skip if already has firebaseUid
        if (user.firebaseUid) {
          log.info(`Skipping user ${user.email} - already has firebaseUid`, "migration");
          result.skipped++;
          continue;
        }

        // Handle email/password users
        if (user.authProvider === "email" && user.passwordHash) {
          log.info(`Migrating email user: ${user.email}`, "migration");
          
          try {
            // Check if Firebase user already exists with this email
            // Note: Firebase Admin SDK doesn't have a direct "get user by email" method
            // We'll try to create the user, and if it fails with "email-already-exists",
            // we'll need to handle it differently
            
            // For now, create a new Firebase user
            // In production, you might want to send password reset emails instead
            const firebaseUser = await createUser(user.email);
            
            // Update database with firebaseUid
            await db
              .update(users)
              .set({
                firebaseUid: firebaseUser.uid,
                authProvider: "firebase_email",
              })
              .where(eq(users.id, user.id));
            
            log.info(`✅ Migrated email user ${user.email} to Firebase UID: ${firebaseUser.uid}`, "migration");
            result.success++;
            
            // Note: The user will need to reset their password via Firebase
            // You may want to send them a password reset email here
            log.warn(`⚠️  User ${user.email} needs to reset password via Firebase`, "migration");
          } catch (error: any) {
            if (error.code === "auth/email-already-exists") {
              log.warn(`Firebase user already exists for ${user.email} - skipping`, "migration");
              result.skipped++;
            } else {
              throw error;
            }
          }
        }
        // Handle Google OAuth users
        else if (user.authProvider === "google" && user.googleSub) {
          log.info(`Migrating Google user: ${user.email}`, "migration");
          
          // For Google users, we can't create Firebase users directly
          // They need to sign in with Google through Firebase first
          // This will automatically create the Firebase user and we can link it
          log.warn(`⚠️  Google user ${user.email} needs to sign in with Google via Firebase to complete migration`, "migration");
          result.skipped++;
        }
        // Handle users without password or Google sub (edge case)
        else {
          log.warn(`Skipping user ${user.email} - no passwordHash or googleSub`, "migration");
          result.skipped++;
        }
      } catch (error: any) {
        log.error(`Failed to migrate user ${user.email}`, error, "migration");
        result.failed++;
        result.errors.push({
          email: user.email,
          error: error.message || "Unknown error",
        });
      }
    }

    return result;
  } catch (error) {
    log.error("Migration failed", error, "migration");
    throw error;
  }
}

// Run migration
if (require.main === module) {
  migrateUsersToFirebase()
    .then((result) => {
      console.log("\n=== Migration Complete ===");
      console.log(`✅ Successfully migrated: ${result.success}`);
      console.log(`❌ Failed: ${result.failed}`);
      console.log(`⏭️  Skipped: ${result.skipped}`);
      
      if (result.errors.length > 0) {
        console.log("\nErrors:");
        result.errors.forEach(({ email, error }) => {
          console.log(`  - ${email}: ${error}`);
        });
      }
      
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Migration error:", error);
      process.exit(1);
    });
}

export { migrateUsersToFirebase };

