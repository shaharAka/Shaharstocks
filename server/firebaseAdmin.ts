import * as admin from "firebase-admin";
import { log } from "./logger";

let firebaseAdminInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * Service account can be provided as:
 * 1. JSON string in FIREBASE_ADMIN_SERVICE_ACCOUNT env var
 * 2. Path to JSON file in FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH env var
 * 3. Default credentials (if running on GCP)
 */
export function initializeFirebaseAdmin() {
  if (firebaseAdminInitialized) {
    return;
  }

  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      firebaseAdminInitialized = true;
      log.info("Firebase Admin already initialized", "firebase");
      return;
    }

    // Try to get service account from environment
    const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
    const serviceAccountPath = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH;

    let serviceAccount: admin.ServiceAccount | undefined;

    if (serviceAccountJson) {
      try {
        serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
        log.info("Firebase Admin: Using service account from FIREBASE_ADMIN_SERVICE_ACCOUNT", "firebase");
      } catch (error) {
        log.error("Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT JSON", error, "firebase");
        throw new Error("Invalid FIREBASE_ADMIN_SERVICE_ACCOUNT JSON");
      }
    } else if (serviceAccountPath) {
      // Service account from file path
      const serviceAccountData = require(serviceAccountPath);
      serviceAccount = serviceAccountData as admin.ServiceAccount;
      log.info(`Firebase Admin: Using service account from ${serviceAccountPath}`, "firebase");
    }

    // Initialize Firebase Admin
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Try default credentials (for GCP environments)
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      log.info("Firebase Admin: Using default application credentials", "firebase");
    }

    firebaseAdminInitialized = true;
    log.info("Firebase Admin SDK initialized successfully", "firebase");
  } catch (error) {
    log.error("Failed to initialize Firebase Admin SDK", error, "firebase");
    throw error;
  }
}

/**
 * Verify a Firebase ID token and return the decoded token
 * @param idToken - The Firebase ID token to verify
 * @returns Decoded token with user information
 */
export async function verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  if (!firebaseAdminInitialized) {
    initializeFirebaseAdmin();
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error: any) {
    log.error("Firebase token verification failed", error, "firebase");
    throw new Error(`Invalid or expired token: ${error.message}`);
  }
}

/**
 * Get a Firebase user by UID
 * @param uid - Firebase user UID
 * @returns Firebase user record
 */
export async function getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
  if (!firebaseAdminInitialized) {
    initializeFirebaseAdmin();
  }

  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord;
  } catch (error: any) {
    log.error(`Failed to get Firebase user ${uid}`, error, "firebase");
    throw error;
  }
}

/**
 * Create a Firebase user programmatically (for migration)
 * @param email - User email
 * @param password - User password (optional)
 * @returns Firebase user record
 */
export async function createUser(
  email: string,
  password?: string
): Promise<admin.auth.UserRecord> {
  if (!firebaseAdminInitialized) {
    initializeFirebaseAdmin();
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false, // Will need to verify via email
    });
    log.info(`Created Firebase user: ${email}`, "firebase");
    return userRecord;
  } catch (error: any) {
    log.error(`Failed to create Firebase user ${email}`, error, "firebase");
    throw error;
  }
}

/**
 * Update a Firebase user
 * @param uid - Firebase user UID
 * @param updates - Properties to update
 */
export async function updateUser(
  uid: string,
  updates: admin.auth.UpdateRequest
): Promise<admin.auth.UserRecord> {
  if (!firebaseAdminInitialized) {
    initializeFirebaseAdmin();
  }

  try {
    const userRecord = await admin.auth().updateUser(uid, updates);
    return userRecord;
  } catch (error: any) {
    log.error(`Failed to update Firebase user ${uid}`, error, "firebase");
    throw error;
  }
}

/**
 * Delete a Firebase user
 * @param uid - Firebase user UID
 */
export async function deleteUser(uid: string): Promise<void> {
  if (!firebaseAdminInitialized) {
    initializeFirebaseAdmin();
  }

  try {
    await admin.auth().deleteUser(uid);
    log.info(`Deleted Firebase user: ${uid}`, "firebase");
  } catch (error: any) {
    log.error(`Failed to delete Firebase user ${uid}`, error, "firebase");
    throw error;
  }
}

/**
 * Send password reset email
 * @param email - User email
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  if (!firebaseAdminInitialized) {
    initializeFirebaseAdmin();
  }

  try {
    const link = await admin.auth().generatePasswordResetLink(email);
    // Note: In production, you'd send this link via your email service
    // For now, we'll log it (you may want to integrate with your email service)
    log.info(`Password reset link for ${email}: ${link}`, "firebase");
    // TODO: Send email via your email service (Resend, etc.)
  } catch (error: any) {
    log.error(`Failed to generate password reset link for ${email}`, error, "firebase");
    throw error;
  }
}

/**
 * Check if Firebase Admin is configured
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ||
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

