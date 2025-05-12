import { Request, Response } from 'express';
import { storage } from './storage';
import { UserRole } from '@shared/schema';

/**
 * User management routes for administrators
 */
export const registerUserManagementRoutes = (router: any) => {
  // Get a specific user by ID
  router.get("/users/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Check if user is admin
    const currentUser = req.user as any;
    if (currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    
    try {
      const userId = req.params.id;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user as any;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: "Error fetching user" });
    }
  });

  // Update a user (admin only)
  router.put("/users/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Check if user is admin
    const currentUser = req.user as any;
    if (currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    
    try {
      const userId = req.params.id;
      const userToUpdate = await storage.getUserById(userId);
      
      if (!userToUpdate) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get updated fields from request body
      const { name, email, role, isActive } = req.body;
      
      // Update user in database
      const updatedUser = {
        ...userToUpdate,
        name: name || userToUpdate.name,
        email: email || userToUpdate.email,
        role: role || userToUpdate.role
        // isActive is not part of the User type, so we're removing it
      };
      
      // If isActive was provided in the request, add it to the updateData as a type assertion
      if (isActive !== undefined) {
        (updatedUser as any).isActive = isActive;
      }
      
      await storage.updateUser(userId, updatedUser);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser as any;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: "Error updating user" });
    }
  });

  // Disable/Enable a user (admin only) - soft delete
  router.patch("/users/:id/status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Check if user is admin
    const currentUser = req.user as any;
    if (currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    
    try {
      const userId = req.params.id;
      const userToUpdate = await storage.getUserById(userId);
      
      if (!userToUpdate) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Cannot disable yourself
      if (userId === currentUser.id) {
        return res.status(400).json({ message: "Cannot modify your own account status" });
      }
      
      const { isActive } = req.body;
      
      if (isActive === undefined) {
        return res.status(400).json({ message: "isActive status is required" });
      }
      
      // Update user status in database - now using the proper isActive field from the schema
      const updatedUser = {
        ...userToUpdate,
        isActive: isActive // Using the properly defined isActive field
      };
      
      await storage.updateUser(userId, updatedUser);
      
      res.json({ message: isActive ? "User activated" : "User deactivated", userId });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ message: "Error updating user status" });
    }
  });

  // Delete a user (admin only) - hard delete
  router.delete("/users/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Check if user is admin
    const currentUser = req.user as any;
    if (currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    
    try {
      const userId = req.params.id;
      const userToDelete = await storage.getUserById(userId);
      
      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Cannot delete yourself
      if (userId === currentUser.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      // Delete user from database
      await storage.deleteUser(userId);
      
      res.json({ message: "User deleted", userId });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: "Error deleting user" });
    }
  });
};
