#!/usr/bin/env node
/**
 * Script to list all users in database
 * Usage: tsx scripts/list-users.ts
 */

import { db } from '../server/db';
import { users } from '../shared/schema';

async function listUsers() {
  try {
    const allUsers = await db.select({
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
      hasPassword: users.passwordHash,
      subscriptionStatus: users.subscriptionStatus,
      isAdmin: users.isAdmin,
    }).from(users).limit(20);
    
    if (allUsers.length === 0) {
      console.log('❌ No users found in database');
      process.exit(1);
    }
    
    console.log(`Found ${allUsers.length} user(s):\n`);
    allUsers.forEach((user, i) => {
      console.log(`${i + 1}. ${user.email} (${user.name})`);
      console.log(`   Verified: ${user.emailVerified}, Has Password: ${!!user.hasPassword}, Status: ${user.subscriptionStatus}, Admin: ${user.isAdmin}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing users:', error);
    process.exit(1);
  }
}

listUsers();

