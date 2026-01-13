import type { Express } from "express";
import { storage } from "../storage";
import { 
  authRateLimiter, 
  passwordResetRateLimiter, 
  emailVerificationRateLimiter,
  registrationRateLimiter 
} from "../middleware/rateLimiter";
import { isDisposableEmail } from "../utils/emailValidation";
import { notifySuperAdminsNewSignup, sendBugReport } from "../emailService";
import { fetchInitialDataForUser } from "./utils";
import { verifyIdToken } from "../firebaseAdmin";
import { verifyFirebaseToken } from "../middleware/firebaseAuth";

export function registerAuthRoutes(app: Express) {
  // User authentication routes
  // GET /api/auth/current-user - Get current user from Firebase token
  app.get("/api/auth/current-user", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Remove sensitive fields
      const { passwordHash, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ error: "Failed to get current user" });
    }
  });

  // Trial status endpoint
  app.get("/api/auth/trial-status", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.subscriptionStatus !== "trial") {
        return res.json({
          status: user.subscriptionStatus,
          isTrialActive: false,
          daysRemaining: 0,
          showPaymentReminder: false,
        });
      }

      const now = new Date();
      const trialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
      
      if (!trialEnd) {
        return res.json({
          status: "trial",
          isTrialActive: true,
          daysRemaining: 0,
          showPaymentReminder: true,
        });
      }

      const msRemaining = trialEnd.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
      const isTrialActive = msRemaining > 0; // Active if any time remains
      const showPaymentReminder = daysRemaining <= 16 && isTrialActive; // Show reminder at day 14 (16 days remaining) but only if still active

      res.json({
        status: "trial",
        isTrialActive,
        daysRemaining,
        trialEndsAt: trialEnd.toISOString(),
        showPaymentReminder,
        isExpired: !isTrialActive && daysRemaining === 0,
      });
    } catch (error) {
      console.error("Trial status error:", error);
      res.status(500).json({ error: "Failed to get trial status" });
    }
  });

  // POST /api/auth/login - Verify Firebase ID token and return user
  app.post("/api/auth/login", authRateLimiter, async (req, res) => {
    try {
      const { idToken } = req.body;
      
      if (!idToken) {
        return res.status(400).json({ error: "ID token is required" });
      }

      // Verify Firebase ID token
      let decodedToken;
      try {
        decodedToken = await verifyIdToken(idToken);
      } catch (error: any) {
        return res.status(401).json({ 
          error: "Invalid or expired token. Please sign in again.",
          code: "TOKEN_INVALID"
        });
      }

      const firebaseUid = decodedToken.uid;
      const email = decodedToken.email;
      const emailVerified = decodedToken.email_verified || false;
      const name = decodedToken.name || email?.split("@")[0] || "User";
      const picture = decodedToken.picture;

      if (!email) {
        return res.status(400).json({ error: "Email is required in token" });
      }

      // Check if user exists in database
      let user = await storage.getUserByFirebaseUid(firebaseUid);
      
      if (!user) {
        // User doesn't exist - check if email exists (migration case)
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          // Link Firebase UID to existing user
          user = await storage.updateUser(existingUser.id, {
            firebaseUid,
            authProvider: decodedToken.firebase?.sign_in_provider === "google.com" ? "firebase_google" : "firebase_email",
            emailVerified: emailVerified || existingUser.emailVerified,
            googlePicture: picture || existingUser.googlePicture,
          });
        } else {
          // New user - create account
          const avatarColors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
          const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
          
          const now = new Date();
          const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

          user = await storage.createUser({
            name,
            email,
            firebaseUid,
            avatarColor,
            authProvider: decodedToken.firebase?.sign_in_provider === "google.com" ? "firebase_google" : "firebase_email",
            emailVerified: emailVerified,
            subscriptionStatus: emailVerified ? "trial" : "pending_verification",
            trialEndsAt: emailVerified ? trialEndsAt : undefined,
            subscriptionStartDate: emailVerified ? now : undefined,
            googlePicture: picture,
          });

          // Notify super admins of new signup
          storage.getSuperAdminUsers().then(async (superAdmins) => {
            const adminEmails = superAdmins.map(a => a.email);
            if (adminEmails.length > 0) {
              await notifySuperAdminsNewSignup({
                adminEmails,
                userName: name,
                userEmail: email,
                signupMethod: decodedToken.firebase?.sign_in_provider === "google.com" ? "google" : "email",
              });
            }
          }).catch(err => console.error("Failed to notify super admins of signup:", err));
        }
      } else {
        // Update user info from token (in case email/name changed in Firebase)
        user = await storage.updateUser(user.id, {
          emailVerified: emailVerified || user.emailVerified,
          googlePicture: picture || user.googlePicture,
        }) || user;
      }

      if (!user) {
        return res.status(500).json({ error: "Failed to create or retrieve user" });
      }

      // Check email verification (Firebase handles this, but we check our DB status)
      if (!user.emailVerified) {
        return res.status(403).json({ 
          error: "Please verify your email before logging in. Check your inbox for the verification link.",
          emailVerificationRequired: true,
          email: user.email
        });
      }

      // Check subscription status - allow trial and active users
      if (user.subscriptionStatus === "trial") {
        if (user.trialEndsAt) {
          const now = new Date();
          const trialEnd = new Date(user.trialEndsAt);
          
          if (now > trialEnd) {
            await storage.updateUser(user.id, { subscriptionStatus: "expired" });
            return res.status(403).json({ 
              error: "Your free trial has expired. Please subscribe to continue.",
              subscriptionStatus: "expired",
              trialExpired: true
            });
          }
        }
      } else if (user.subscriptionStatus === "active") {
        // Active subscription - allow login
      } else {
        return res.status(403).json({ 
          error: user.subscriptionStatus === "expired" 
            ? "Your free trial has expired. Please subscribe to continue."
            : "Subscription required",
          subscriptionStatus: user.subscriptionStatus,
          trialExpired: user.subscriptionStatus === "expired"
        });
      }

      // Remove sensitive fields
      const { passwordHash, ...safeUser } = user;
        
        res.json({ 
        user: safeUser,
          subscriptionStatus: user.subscriptionStatus
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // POST /api/auth/signup - Create user account from Firebase ID token
  // Note: Frontend should call Firebase createUserWithEmailAndPassword first, then send idToken here
  app.post("/api/auth/signup", registrationRateLimiter, async (req, res) => {
    try {
      const { idToken, name } = req.body;
      
      if (!idToken) {
        return res.status(400).json({ error: "ID token is required" });
      }

      // Verify Firebase ID token
      let decodedToken;
      try {
        decodedToken = await verifyIdToken(idToken);
      } catch (error: any) {
        return res.status(401).json({ 
          error: "Invalid or expired token. Please sign up again.",
          code: "TOKEN_INVALID"
        });
      }

      const firebaseUid = decodedToken.uid;
      const email = decodedToken.email;
      const emailVerified = decodedToken.email_verified || false;
      const displayName = name || decodedToken.name || email?.split("@")[0] || "User";
      const picture = decodedToken.picture;

      if (!email) {
        return res.status(400).json({ error: "Email is required in token" });
      }

      // Check for disposable email domains
      if (isDisposableEmail(email)) {
        console.log(`[Signup] Blocked disposable email: ${email}`);
        return res.status(400).json({ error: "Disposable email addresses are not allowed. Please use a permanent email address." });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByFirebaseUid(firebaseUid);
      if (existingUser) {
        return res.status(400).json({ error: "Account already exists. Please sign in instead." });
      }

      // Check if email is already in use (migration case)
      const existingEmailUser = await storage.getUserByEmail(email);
      if (existingEmailUser) {
        // Link Firebase UID to existing user
        const updatedUser = await storage.updateUser(existingEmailUser.id, {
          firebaseUid,
          authProvider: decodedToken.firebase?.sign_in_provider === "google.com" ? "firebase_google" : "firebase_email",
          emailVerified: emailVerified || existingEmailUser.emailVerified,
          googlePicture: picture || existingEmailUser.googlePicture,
        });
        
        if (updatedUser) {
          return res.json({ 
            success: true,
            message: "Account linked successfully!",
            user: updatedUser
          });
        }
      }

      // Create new user
      const avatarColors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
      const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

      const now = new Date();
      const trialEndsAt = emailVerified ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : undefined; // 30 days

      const newUser = await storage.createUser({
        name: displayName,
        email,
        firebaseUid,
        avatarColor,
        authProvider: decodedToken.firebase?.sign_in_provider === "google.com" ? "firebase_google" : "firebase_email",
        emailVerified: emailVerified,
        subscriptionStatus: emailVerified ? "trial" : "pending_verification",
        trialEndsAt,
        subscriptionStartDate: emailVerified ? now : undefined,
        googlePicture: picture,
      });

      // Create admin notification for super admins
      try {
        await storage.createAdminNotification({
          type: "user_signup",
          title: emailVerified ? "New User Signup" : "New User Signup (Pending Verification)",
          message: `${displayName} (${email}) has signed up${emailVerified ? "" : " and is pending email verification"}`,
          metadata: {
            userId: newUser.id,
            userName: displayName,
            userEmail: email,
          },
          isRead: false,
        });
      } catch (notifError) {
        console.error("Failed to create admin notification for new signup:", notifError);
      }

      // Send email notification to super admins (fire and forget)
      storage.getSuperAdminUsers().then(async (superAdmins) => {
        const adminEmails = superAdmins.map(a => a.email);
        if (adminEmails.length > 0) {
          await notifySuperAdminsNewSignup({
            adminEmails,
            userName: displayName,
            userEmail: email,
            signupMethod: decodedToken.firebase?.sign_in_provider === "google.com" ? "google" : "email",
          });
        }
      }).catch(err => console.error("Failed to notify super admins of signup:", err));

      // Remove sensitive fields
      const { passwordHash, ...safeUser } = newUser;

      res.json({ 
        success: true,
        message: emailVerified 
          ? "Account created successfully! Welcome to signal2."
          : "Account created! Please verify your email to continue.",
        user: safeUser,
        emailVerified
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  // Email verification endpoint
  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: "Invalid verification token" });
      }

      const user = await storage.getUserByVerificationToken(token);
      
      if (!user) {
        return res.status(404).json({ error: "Invalid or expired verification link" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }

      if (isTokenExpired(user.emailVerificationExpiry)) {
        return res.status(400).json({ error: "Verification link has expired. Please request a new one." });
      }

      // Verify email and start trial
      const verifiedUser = await storage.verifyUserEmail(user.id);
      
      if (!verifiedUser) {
        return res.status(500).json({ error: "Failed to verify email" });
      }

      console.log(`[EmailVerification] User ${user.email} verified successfully`);
      
      res.json({ 
        success: true,
        message: "Email verified successfully! You can now log in.",
        email: user.email
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  // Resend verification email
  app.post("/api/auth/resend-verification", emailVerificationRateLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ 
          success: true,
          message: "If an account with that email exists, a verification email has been sent."
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }

      // Generate new token
      const verificationToken = generateVerificationToken();
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await storage.updateVerificationToken(user.id, verificationToken, verificationExpiry);

      // Send verification email
      // Check for production: Cloud Run sets NODE_ENV=production
      const isProduction = process.env.NODE_ENV === "production";
      const baseUrl = isProduction 
        ? `https://${req.get('host')}`
        : `http://${req.get('host')}`;
      const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
      
      const emailSent = await sendVerificationEmail({
        to: email,
        name: user.name,
        verificationUrl,
      });

      if (!emailSent) {
        console.error(`[ResendVerification] Failed to send verification email to ${email}`);
        return res.status(500).json({ error: "Failed to send verification email" });
      }

      res.json({ 
        success: true,
        message: "Verification email sent. Please check your inbox."
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  });

  // Bug report endpoint
  app.post("/api/bug-report", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const { subject, description, url, userAgent } = req.body;

      if (!description || typeof description !== 'string' || description.trim().length === 0) {
        return res.status(400).json({ error: "Description is required" });
      }

      const emailSent = await sendBugReport({
        subject: subject || "Bug Report",
        description: description.trim(),
        reporterName: user.name,
        reporterEmail: user.email,
        url: url || "Unknown",
        userAgent: userAgent || "Unknown",
      });

      if (!emailSent) {
        return res.status(500).json({ error: "Failed to send bug report" });
      }

      console.log(`[BugReport] Report sent from ${user.email}: ${subject}`);
      res.json({ success: true, message: "Bug report sent successfully" });
    } catch (error) {
      console.error("Bug report error:", error);
      res.status(500).json({ error: "Failed to send bug report" });
    }
  });

  // POST /api/auth/logout - No server-side session, Firebase handles client-side
  // This endpoint is kept for compatibility but doesn't do anything
  app.post("/api/auth/logout", async (req, res) => {
    res.json({ success: true, message: "Logged out successfully" });
  });

  app.post("/api/auth/mark-onboarding-complete", verifyFirebaseToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.markUserHasSeenOnboarding(req.user.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark onboarding complete error:", error);
      res.status(500).json({ error: "Failed to mark onboarding as complete" });
    }
  });
}

