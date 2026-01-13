#!/usr/bin/env node

/**
 * Script to create an admin user
 * Usage: tsx scripts/create-admin.ts <email> <password> <name>
 */

import bcrypt from 'bcryptjs';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const email = process.argv[2] || 'shaharro@gmail.com';
const password = process.argv[3] || '12345678';
const name = process.argv[4] || 'Admin User';

async function createAdmin() {
  try {
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (existingUser.length > 0) {
      console.log(`User with email ${email} already exists. Updating to admin...`);
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
      
      console.log('✅ User updated to admin:', {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        isAdmin: updated.isAdmin,
        isSuperAdmin: updated.isSuperAdmin,
      });
      process.exit(0);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        avatarColor: '#3b82f6',
        authProvider: 'email',
        isAdmin: true,
        isSuperAdmin: true,
        emailVerified: true,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
      })
      .returning();

    console.log('✅ Admin user created successfully:', {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      isAdmin: newUser.isAdmin,
      isSuperAdmin: newUser.isSuperAdmin,
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();

