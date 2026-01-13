import type { Express } from "express";
import { storage } from "../storage";
import { cancelPayPalSubscription } from "../paypalService";
import { getSubscriptionTransactions } from "../paypalService";

export function registerUserRoutes(app: Express) {
  app.get("/api/user/progress", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const progress = await storage.getUserProgress(req.session.userId);
      res.json(progress);
    } catch (error) {
      console.error("Get user progress error:", error);
      res.status(500).json({ error: "Failed to get user progress" });
    }
  });

  app.post("/api/user/complete-onboarding", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      await storage.completeUserOnboarding(req.session.userId);
      res.json({ message: "Onboarding completed successfully" });
    } catch (error) {
      console.error("Complete onboarding error:", error);
      res.status(500).json({ error: "Failed to complete onboarding" });
    }
  });

  app.post("/api/user/tutorial/:id/complete", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const tutorialId = req.params.id;
      await storage.completeTutorial(req.session.userId, tutorialId);
      res.json({ message: "Tutorial marked as completed" });
    } catch (error) {
      console.error("Complete tutorial error:", error);
      res.status(500).json({ error: "Failed to complete tutorial" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      // Only admin users can access the full user list
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Support includeArchived query parameter
      const includeArchived = req.query.includeArchived === "true";

      // Only return user info, not password hashes
      const users = await storage.getUsers({ includeArchived });
      const sanitizedUsers = users.map(user => ({
        ...user,
        passwordHash: undefined,
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, showAllOpportunities } = req.body;

      if (!req.session.userId || req.session.userId !== id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Build update object - only include provided fields
      const updateData: any = {};
      
      if (name !== undefined) {
        if (!name) {
          return res.status(400).json({ error: "Name cannot be empty" });
        }
        updateData.name = name;
      }
      
      if (email !== undefined) {
        if (!email) {
          return res.status(400).json({ error: "Email cannot be empty" });
        }
        
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== id) {
          return res.status(400).json({ error: "Email already in use" });
        }
        updateData.email = email;
      }
      
      if (showAllOpportunities !== undefined) {
        updateData.showAllOpportunities = Boolean(showAllOpportunities);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      const updatedUser = await storage.updateUser(id, updateData);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user: updatedUser });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.session.userId || req.session.userId !== id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Get user to check for PayPal subscription
      const user = await storage.getUser(id);
      
      // Cancel PayPal subscription if exists
      let subscriptionCancelled = false;
      if (user?.paypalSubscriptionId) {
        const cancelResult = await cancelPayPalSubscription(
          user.paypalSubscriptionId, 
          'Account deleted by user'
        );
        subscriptionCancelled = cancelResult.success;
        if (!cancelResult.success) {
          console.warn(`[Self Delete] Failed to cancel PayPal subscription for user ${id}: ${cancelResult.error}`);
        }
      }

      await storage.deleteUser(id);
      req.session.destroy((err) => {
        if (err) {
          console.error("Failed to destroy session:", err);
        }
      });

      res.json({ success: true, subscriptionCancelled });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Get subscription payment history
  app.get("/api/subscriptions/transactions", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.paypalSubscriptionId || user.paypalSubscriptionId === 'manual_activation') {
        return res.json({ 
          transactions: [],
          message: user.paypalSubscriptionId === 'manual_activation' 
            ? "Manual subscription - no PayPal transactions" 
            : "No active subscription" 
        });
      }

      const result = await getSubscriptionTransactions(user.paypalSubscriptionId);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to fetch transactions" });
      }

      res.json({ transactions: result.transactions || [] });
    } catch (error) {
      console.error("Get subscription transactions error:", error);
      res.status(500).json({ error: "Failed to fetch subscription transactions" });
    }
  });
}

