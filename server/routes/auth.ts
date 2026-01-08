import type { Express } from "express";
import { storage } from "../storage";
import { 
  authRateLimiter, 
  passwordResetRateLimiter, 
  emailVerificationRateLimiter,
  registrationRateLimiter 
} from "../middleware/rateLimiter";
import { isDisposableEmail, generateVerificationToken, isTokenExpired } from "../utils/emailValidation";
import { sendVerificationEmail, notifySuperAdminsNewSignup, sendBugReport } from "../emailService";
import { isGoogleConfigured, generateState, getGoogleAuthUrl, handleGoogleCallback } from "../googleAuthService";
import { fetchInitialDataForUser } from "./utils";

export function registerAuthRoutes(app: Express) {
  // User authentication routes
  app.get("/api/auth/current-user", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.json({ user: null });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.userId = undefined;
        return res.json({ user: null });
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "Failed to get current user" });
    }
  });

  // Trial status endpoint
  app.get("/api/auth/trial-status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
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

  app.post("/api/auth/login", authRateLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check if user has a password (Google-only users don't have passwords)
      if (!user.passwordHash) {
        return res.status(401).json({ 
          error: "This account uses Google Sign-In. Please sign in with Google.",
          authProvider: user.authProvider 
        });
      }

      // Verify password
      const bcrypt = await import("bcryptjs");
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check email verification
      if (!user.emailVerified) {
        return res.status(403).json({ 
          error: "Please verify your email before logging in. Check your inbox for the verification link.",
          emailVerificationRequired: true,
          email: user.email
        });
      }

      // Check subscription status - allow trial and active users
      if (user.subscriptionStatus === "trial") {
        // Only check trial expiration for users with a trialEndsAt date
        if (user.trialEndsAt) {
          const now = new Date();
          const trialEnd = new Date(user.trialEndsAt);
          
          if (now > trialEnd) {
            // Trial expired - update status and block login
            await storage.updateUser(user.id, { subscriptionStatus: "expired" });
            return res.status(403).json({ 
              error: "Your free trial has expired. Please subscribe to continue.",
              subscriptionStatus: "expired",
              trialExpired: true
            });
          }
        }
        // Trial still active or no expiration date - allow login
      } else if (user.subscriptionStatus === "active") {
        // Active subscription - allow login
      } else {
        // Inactive, cancelled, or expired - block login
        return res.status(403).json({ 
          error: user.subscriptionStatus === "expired" 
            ? "Your free trial has expired. Please subscribe to continue."
            : "Subscription required",
          subscriptionStatus: user.subscriptionStatus,
          trialExpired: user.subscriptionStatus === "expired"
        });
      }

      req.session.userId = user.id;
      
      // Explicitly save session before sending response to ensure cookie is set
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to save session" });
        }
        
        res.json({ 
          user: {
            ...user,
            passwordHash: undefined, // Don't send password hash to client
          },
          subscriptionStatus: user.subscriptionStatus
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/signup", registrationRateLimiter, async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      // Check for disposable email domains
      if (isDisposableEmail(email)) {
        console.log(`[Signup] Blocked disposable email: ${email}`);
        return res.status(400).json({ error: "Disposable email addresses are not allowed. Please use a permanent email address." });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }

      // Hash password
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(password, 10);

      const avatarColors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
      const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

      // Generate verification token
      const verificationToken = generateVerificationToken();
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const newUser = await storage.createUser({
        name,
        email,
        passwordHash,
        avatarColor,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
        subscriptionStatus: "pending_verification", // Start with pending
      });

      // Send verification email
      // Check for production: Replit uses REPLIT_DEPLOYMENT=1, or NODE_ENV=production
      const isProduction = process.env.REPLIT_DEPLOYMENT === "1" || process.env.NODE_ENV === "production";
      const baseUrl = isProduction 
        ? `https://${req.get('host')}`
        : `http://${req.get('host')}`;
      const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
      
      const emailSent = await sendVerificationEmail({
        to: email,
        name,
        verificationUrl,
      });

      if (!emailSent) {
        console.error(`[Signup] Failed to send verification email to ${email}`);
        // Don't fail signup, but log the error
      }

      // Create admin notification for super admins
      try {
        await storage.createAdminNotification({
          type: "user_signup",
          title: "New User Signup (Pending Verification)",
          message: `${name} (${email}) has signed up and is pending email verification`,
          metadata: {
            userId: newUser.id,
            userName: name,
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
            userName: name,
            userEmail: email,
            signupMethod: 'email',
          });
        }
      }).catch(err => console.error("Failed to notify super admins of signup:", err));

      // Don't log them in - they need to verify email first
      res.json({ 
        success: true,
        message: "Account created! Please check your email to verify your account.",
        email: email
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
      // Check for production: Replit uses REPLIT_DEPLOYMENT=1, or NODE_ENV=production
      const isProduction = process.env.REPLIT_DEPLOYMENT === "1" || process.env.NODE_ENV === "production";
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
  app.post("/api/bug-report", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
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

  // Google OAuth: Check if configured
  app.get("/api/auth/google/configured", (req, res) => {
    res.json({ configured: isGoogleConfigured() });
  });

  // Google OAuth: Get authorization URL
  app.get("/api/auth/google/url", (req, res) => {
    try {
      if (!isGoogleConfigured()) {
        return res.status(503).json({ error: "Google Sign-In is not configured" });
      }

      const state = generateState();
      
      // Store state in session for verification
      req.session.googleOAuthState = state;
      
      // Get full host including port (e.g., localhost:5002)
      const host = req.get('host') || req.hostname || 'localhost';
      // For localhost, use http; otherwise use the request protocol or default to https
      const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : (req.protocol || 'https');
      const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
      
      // Enhanced logging for debugging
      console.log(`[Google OAuth] Request details:`, {
        hostHeader: req.get('host'),
        hostname: req.hostname,
        protocol: req.protocol,
        originalUrl: req.originalUrl,
        headers: {
          host: req.headers.host,
          'x-forwarded-host': req.headers['x-forwarded-host'],
          'x-forwarded-proto': req.headers['x-forwarded-proto'],
        },
        generatedRedirectUri: redirectUri
      });
      
      const authUrl = getGoogleAuthUrl(redirectUri, state);
      
      res.json({ url: authUrl, redirectUri: redirectUri }); // Include redirectUri in response for debugging
    } catch (error) {
      console.error("[Google OAuth] Failed to generate auth URL:", error);
      res.status(500).json({ error: "Failed to initialize Google Sign-In" });
    }
  });

  // Google OAuth: Callback handler
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, state, error: oauthError } = req.query;
      
      if (oauthError) {
        console.error("[Google OAuth] Error from Google:", oauthError);
        return res.redirect("/login?error=google_auth_failed");
      }

      if (!code || typeof code !== "string") {
        return res.redirect("/login?error=missing_code");
      }

      // Verify state to prevent CSRF
      if (!state || state !== req.session.googleOAuthState) {
        return res.redirect("/login?error=invalid_state");
      }
      
      // Clear the state
      delete req.session.googleOAuthState;

      // Get full host including port (e.g., localhost:5002)
      const host = req.get('host') || req.hostname || 'localhost';
      // For localhost, use http; otherwise use the request protocol or default to https
      const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : (req.protocol || 'https');
      const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

      // Exchange code for tokens and get user info
      const googleUser = await handleGoogleCallback(code, redirectUri);
      
      // Check if user exists by Google sub ID
      let user = await storage.getUserByGoogleSub(googleUser.sub);
      
      if (!user) {
        // Check if user exists by email (linking case)
        user = await storage.getUserByEmail(googleUser.email);
        
        if (user) {
          // Link Google account to existing email user
          await storage.linkGoogleAccount(user.id, googleUser.sub, googleUser.picture);
          
          // If they had pending verification, mark as verified since Google verified the email
          if (!user.emailVerified) {
            await storage.updateUser(user.id, { 
              emailVerified: true,
              subscriptionStatus: user.subscriptionStatus === "pending_verification" ? "trial" : user.subscriptionStatus,
              trialEndsAt: user.subscriptionStatus === "pending_verification" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : user.trialEndsAt,
            });
          }
        } else {
          // Create new user with Google account
          const avatarColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];
          const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
          
          user = await storage.createGoogleUser({
            name: googleUser.name,
            email: googleUser.email,
            googleSub: googleUser.sub,
            googlePicture: googleUser.picture,
            avatarColor,
            authProvider: "google",
            emailVerified: true, // Google already verified the email
            subscriptionStatus: "trial",
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day trial
          });

          // Send email notification to super admins for new Google signup (fire and forget)
          storage.getSuperAdminUsers().then(async (superAdmins) => {
            const adminEmails = superAdmins.map(a => a.email);
            if (adminEmails.length > 0) {
              const { notifySuperAdminsNewSignup } = await import("../emailService");
              await notifySuperAdminsNewSignup({
                adminEmails,
                userName: googleUser.name,
                userEmail: googleUser.email,
                signupMethod: 'google',
              });
            }
          }).catch(err => console.error("Failed to notify super admins of Google signup:", err));
        }
      }

      // Check subscription status before allowing login
      if (user.subscriptionStatus === "expired") {
        return res.redirect("/login?error=trial_expired");
      }

      if (user.subscriptionStatus !== "trial" && user.subscriptionStatus !== "active") {
        return res.redirect("/login?error=subscription_required");
      }

      // Set session
      req.session.userId = user.id;
      
      req.session.save((err) => {
        if (err) {
          console.error("[Google OAuth] Session save error:", err);
          return res.redirect("/login?error=session_error");
        }
        
        // Redirect to home on success
        res.redirect("/?login=success&provider=google");
      });
    } catch (error) {
      console.error("[Google OAuth] Callback error:", error);
      res.redirect("/login?error=google_auth_failed");
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to logout" });
        }
        res.json({ success: true });
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  app.post("/api/auth/mark-onboarding-complete", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.markUserHasSeenOnboarding(req.session.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark onboarding complete error:", error);
      res.status(500).json({ error: "Failed to mark onboarding as complete" });
    }
  });
}

