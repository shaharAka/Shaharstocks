#!/usr/bin/env node
/**
 * Script to check user status in database
 * Usage: tsx scripts/check-user.ts <email>
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkUser() {
  const email = process.argv[2] || 'shaharro@gmail.com';
  
  console.log(`Checking user: ${email}\n`);
  
  try {
    const result = await db.select().from(users).where(eq(users.email, email));
    
    if (result.length === 0) {
      console.log('❌ User not found in database');
      process.exit(1);
    }
    
    const user = result[0];
    console.log('✅ User found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Has password:', !!user.passwordHash);
    console.log('  Email verified:', user.emailVerified);
    console.log('  Auth provider:', user.authProvider);
    console.log('  Subscription status:', user.subscriptionStatus);
    console.log('  Is admin:', user.isAdmin);
    console.log('  Is super admin:', user.isSuperAdmin);
    
    if (!user.passwordHash) {
      console.log('\n⚠️  User has no password - they must use Google Sign-In');
    }
    
    if (!user.emailVerified) {
      console.log('\n⚠️  Email not verified - user must verify email before login');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking user:', error);
    process.exit(1);
  }
}

checkUser();

