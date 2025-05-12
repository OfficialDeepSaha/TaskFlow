import { Request, Response } from 'express';
import { storage } from './storage';
import { notificationService } from './notificationService';
import { User, NotificationChannel } from '@shared/schema';

/**
 * Routes for user notification preferences
 */
export const registerNotificationRoutes = (router: any) => {
  // Get user notification preferences
  router.get("/user/notification-preferences", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const currentUser = req.user as User;
      const user = await storage.getUserById(currentUser.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user.notificationPreferences || {
        channels: [],
        taskAssignment: true,
        taskStatusUpdate: true,
        taskCompletion: true,
        taskDueSoon: true,
        systemUpdates: false
      });
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({ message: "Error fetching notification preferences" });
    }
  });

  // Update user notification preferences
  router.put("/user/notification-preferences", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const currentUser = req.user as User;
      const userId = currentUser.id;
      const userToUpdate = await storage.getUserById(userId);
      
      if (!userToUpdate) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get updated preferences from request body
      const { 
        channels,
        taskAssignment,
        taskStatusUpdate,
        taskCompletion,
        taskDueSoon,
        systemUpdates
      } = req.body;
      
      // Validate channels if provided
      if (channels && !Array.isArray(channels)) {
        return res.status(400).json({ message: "Channels must be an array" });
      }
      
      // Update user preferences in database
      const updatedPreferences = {
        channels: channels || userToUpdate.notificationPreferences?.channels || [],
        taskAssignment: taskAssignment !== undefined ? taskAssignment : userToUpdate.notificationPreferences?.taskAssignment ?? true,
        taskStatusUpdate: taskStatusUpdate !== undefined ? taskStatusUpdate : userToUpdate.notificationPreferences?.taskStatusUpdate ?? true,
        taskCompletion: taskCompletion !== undefined ? taskCompletion : userToUpdate.notificationPreferences?.taskCompletion ?? true,
        taskDueSoon: taskDueSoon !== undefined ? taskDueSoon : userToUpdate.notificationPreferences?.taskDueSoon ?? true,
        systemUpdates: systemUpdates !== undefined ? systemUpdates : userToUpdate.notificationPreferences?.systemUpdates ?? false
      };
      
      const updatedUser = {
        ...userToUpdate,
        notificationPreferences: updatedPreferences
      };
      
      await storage.updateUser(userId, updatedUser);
      
      res.json(updatedPreferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ message: "Error updating notification preferences" });
    }
  });
  
  // Test sending an email notification (for development purposes)
  router.post("/test-email-notification", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const currentUser = req.user as User;
      
      if (!currentUser.email) {
        return res.status(400).json({ message: "User has no email address" });
      }
      
      const { type } = req.body;
      
      let result;
      switch (type) {
        case 'taskAssigned':
          result = await notificationService.sendEmailNotification(
            currentUser, 
            'taskAssigned', 
            { taskTitle: 'Example Task', assignerName: 'System Admin' }
          );
          break;
        case 'taskReminder':
          result = await notificationService.sendEmailNotification(
            currentUser, 
            'taskReminder', 
            { taskTitle: 'Example Task', dueDate: 'Tomorrow at 5 PM' }
          );
          break;
        case 'taskUpdate':
          result = await notificationService.sendEmailNotification(
            currentUser, 
            'taskUpdate', 
            { taskTitle: 'Example Task', updaterName: 'System Admin', updateType: 'Status change' }
          );
          break;
        case 'commentAdded':
          result = await notificationService.sendEmailNotification(
            currentUser, 
            'commentAdded', 
            { taskTitle: 'Example Task', commenterName: 'System Admin', commentText: 'This is a test comment for email notifications!' }
          );
          break;
        case 'systemUpdate':
          result = await notificationService.sendEmailNotification(
            currentUser, 
            'systemUpdate', 
            { updateTitle: 'New Feature Available', updateDetails: 'You can now customize your notification preferences!' }
          );
          break;
        default:
          return res.status(400).json({ message: "Invalid notification type" });
      }
      
      res.json({ 
        message: "Test email notification sent", 
        result
      });
    } catch (error) {
      console.error('Error sending test email notification:', error);
      res.status(500).json({ message: "Error sending test email notification" });
    }
  });
};
