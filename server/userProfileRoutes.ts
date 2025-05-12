import { Request, Response } from 'express';
import { storage } from './storage';

/**
 * Additional user profile routes for handling profile data needs
 */
export const registerUserProfileRoutes = (router: any) => {
  // Get user email specifically
  router.get("/user/email", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const currentUser = req.user as any;
      const userId = currentUser.id;
      console.log(`Getting email for user ID: ${userId}`);
      
      // Get user data directly from the database
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log and return just the email property
      console.log(`User email from database: ${user.email}`);
      res.json({ email: user.email || '' });
    } catch (error) {
      console.error('Error fetching user email:', error);
      res.status(500).json({ message: "Error fetching user email" });
    }
  });

  // Update user email specifically
  router.put("/user/email", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const currentUser = req.user as any;
      const userId = currentUser.id;
      const { email } = req.body;
      
      console.log(`Updating email for user ID: ${userId} to: ${email}`);
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Simple email validation
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      // Get user data
      const userToUpdate = await storage.getUserById(userId);
      
      if (!userToUpdate) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if email is already in use by another user
      const allUsers = await storage.getAllUsers();
      const emailExists = allUsers.some(user => 
        user.email === email && user.id !== userId
      );
      
      if (emailExists) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Update user with new email
      const updatedUser = {
        ...userToUpdate,
        email
      };
      
      await storage.updateUser(userId, updatedUser);
      
      res.json({ email });
    } catch (error) {
      console.error('Error updating user email:', error);
      res.status(500).json({ message: "Error updating user email" });
    }
  });
};
