#!/usr/bin/env node
/**
 * Script to promote user to admin - can be run in Cloud Run environment
 * Usage: Run this in Cloud Run shell or via gcloud run jobs
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const email = process.argv[2] || 'shaharro@gmail.com';

async function promoteAdmin() {
  try {
    const [updated] = await db
      .update(users)
      .set({
        isAdmin: true,
        isSuperAdmin: true,
        emailVerified: true,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
      })
      .where(eq(users.email, email))
      .returning();

    if (!updated) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    console.log('✅ User promoted to admin:', {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      isAdmin: updated.isAdmin,
      isSuperAdmin: updated.isSuperAdmin,
      emailVerified: updated.emailVerified,
      subscriptionStatus: updated.subscriptionStatus,
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error promoting user:', error);
    process.exit(1);
  }
}

promoteAdmin();
