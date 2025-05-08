import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertTaskSchema, updateTaskSchema } from "@shared/schema";
import { TaskPriority, TaskStatus, UserRole, AuditEntity, AuditAction, Task, NotificationChannel } from "@shared/schema";
import { ZodError } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import { 
  sendTaskAssignmentNotification, 
  sendTaskStatusUpdateNotification, 
  sendTaskCompletionNotification 
} from "./emailService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Task routes
  // Get all tasks
  app.get("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error fetching tasks" });
    }
  });

  // Get task by ID
  app.get("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Error fetching task" });
    }
  });

  // Create new task
  app.post("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const taskData = insertTaskSchema.parse({
        ...req.body,
        createdById: userId,
      });
      
      const task = await storage.createTask(taskData);
      
      // Create audit log for task creation
      await storage.createAuditLog({
        entityId: task.id,
        entityType: AuditEntity.TASK,
        action: AuditAction.CREATED,
        userId: userId,
        details: { taskTitle: task.title }
      });
      
      // Send real-time notification if task is assigned to someone
      if (task.assignedToId && task.assignedToId !== userId) {
        const creator = req.user!;
        const notification = await storage.createNotification({
          message: `${creator.name} assigned you a new task: ${task.title}`,
          userId: task.assignedToId,
          taskId: task.id,
          read: false
        });
        
        // Send WebSocket notification if available
        if (app.locals.sendNotification) {
          app.locals.sendNotification(task.assignedToId, notification);
        }
        
        // Create audit log for task assignment
        await storage.createAuditLog({
          entityId: task.id,
          entityType: AuditEntity.TASK,
          action: AuditAction.ASSIGNED,
          userId: userId,
          details: { assignedToId: task.assignedToId, taskTitle: task.title }
        });
        
        // Send email notification if the assigned user has that preference
        try {
          const assignedUser = await storage.getUser(task.assignedToId);
          if (assignedUser) {
            sendTaskAssignmentNotification(assignedUser, task, creator)
              .catch(err => console.error('Error sending task assignment email:', err));
          }
        } catch (error) {
          console.error('Error sending task assignment email notification:', error);
        }
      }
      
      // If it's a recurring task, create future instances
      if (task.isRecurring && task.recurringPattern !== 'none') {
        await storage.createRecurringTaskInstances(task);
      }
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid task data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating task" });
    }
  });

  // Update task
  app.patch("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Only allow updates if user is the creator or the assignee
      if (task.createdById !== req.user!.id && task.assignedToId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to update this task" });
      }
      
      const taskData = updateTaskSchema.parse(req.body);
      const updatedTask = await storage.updateTask(taskId, taskData);
      
      if (!updatedTask) {
        return res.status(500).json({ message: "Error updating task" });
      }
      
      // Create audit log for task update
      const userId = req.user!.id;
      
      // Determine specific action type based on what was changed
      let action = AuditAction.UPDATED;
      if (taskData.status === 'completed' && task.status !== 'completed') {
        action = AuditAction.COMPLETED;
      } else if (taskData.status && taskData.status !== task.status) {
        action = AuditAction.STATUS_CHANGED;
      } else if (taskData.assignedToId && taskData.assignedToId !== task.assignedToId) {
        action = AuditAction.ASSIGNED;
      }
      
      await storage.createAuditLog({
        entityId: task.id,
        entityType: AuditEntity.TASK,
        action,
        userId,
        details: { 
          taskTitle: updatedTask.title,
          changes: JSON.stringify(taskData)
        }
      });
      
      // Send real-time notification if task assignee has changed
      if (taskData.assignedToId && 
          taskData.assignedToId !== task.assignedToId && 
          taskData.assignedToId !== req.user!.id) {
        
        const creator = req.user!;
        const notification = await storage.createNotification({
          message: `${creator.name} assigned you a task: ${updatedTask.title}`,
          userId: taskData.assignedToId,
          taskId: updatedTask.id,
          read: false
        });
        
        // Send WebSocket notification if available
        if (app.locals.sendNotification) {
          app.locals.sendNotification(taskData.assignedToId, notification);
        }
        
        // Send email notification to the newly assigned user
        try {
          const assignedUser = await storage.getUser(taskData.assignedToId);
          if (assignedUser) {
            sendTaskAssignmentNotification(assignedUser, updatedTask, creator)
              .catch(err => console.error('Error sending task assignment email:', err));
          }
        } catch (error) {
          console.error('Error sending task assignment email notification:', error);
        }
      }
      
      // Send notification when task status is changed
      if (taskData.status && 
          taskData.status !== task.status && 
          task.assignedToId && 
          task.assignedToId !== req.user!.id) {
        
        const updater = req.user!;
        const statusText = taskData.status === 'completed' ? 'completed' : 'updated the status of';
        
        const notification = await storage.createNotification({
          message: `${updater.name} ${statusText} task: ${updatedTask.title}`,
          userId: task.assignedToId,
          taskId: updatedTask.id,
          read: false
        });
        
        // Send WebSocket notification if available
        if (app.locals.sendNotification && task.assignedToId) {
          app.locals.sendNotification(task.assignedToId, notification);
        }
        
        // Send email notification based on the user's preferences
        try {
          const assignedUser = await storage.getUser(task.assignedToId);
          if (assignedUser) {
            if (taskData.status === 'completed') {
              // Send completion notification
              sendTaskCompletionNotification(assignedUser, updatedTask, updater)
                .catch(err => console.error('Error sending task completion email:', err));
            } else {
              // Send status update notification
              sendTaskStatusUpdateNotification(
                assignedUser, 
                updatedTask, 
                updater, 
                task.status, 
                taskData.status
              ).catch(err => console.error('Error sending task status update email:', err));
            }
          }
        } catch (error) {
          console.error('Error sending task status email notification:', error);
        }
      }
      
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid task data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error updating task" });
    }
  });

  // Delete task
  app.delete("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Only allow deletion if user is the creator
      if (task.createdById !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to delete this task" });
      }
      
      await storage.deleteTask(taskId);
      
      // Create audit log for task deletion
      const userId = req.user!.id;
      await storage.createAuditLog({
        entityId: taskId,
        entityType: AuditEntity.TASK,
        action: AuditAction.DELETED,
        userId,
        details: { 
          taskTitle: task.title
        }
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error deleting task" });
    }
  });

  // Get tasks assigned to current user
  app.get("/api/tasks/assigned/me", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const tasks = await storage.getTasksByAssignee(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error fetching assigned tasks" });
    }
  });

  // Get tasks created by current user
  app.get("/api/tasks/created/me", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const tasks = await storage.getTasksByCreator(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error fetching created tasks" });
    }
  });

  // Get overdue tasks for current user
  app.get("/api/tasks/overdue", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const tasks = await storage.getOverdueTasks(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error fetching overdue tasks" });
    }
  });

  // Search and filter tasks
  app.get("/api/tasks/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const query = req.query.q as string || "";
      
      // Parse filters from query params
      const filters: any = {};
      
      if (req.query.status) {
        filters.status = Array.isArray(req.query.status) 
          ? req.query.status as string[]
          : [req.query.status as string];
      }
      
      if (req.query.priority) {
        filters.priority = Array.isArray(req.query.priority) 
          ? req.query.priority as string[]
          : [req.query.priority as string];
      }
      
      if (req.query.dueDate) {
        filters.dueDate = new Date(req.query.dueDate as string);
      }
      
      if (req.query.assignedToId) {
        filters.assignedToId = parseInt(req.query.assignedToId as string);
      }
      
      if (req.query.createdById) {
        filters.createdById = parseInt(req.query.createdById as string);
      }
      
      const tasks = await storage.searchTasks(query, filters);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error searching tasks" });
    }
  });

  // Get all users for task assignment
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const users = await storage.getAllUsers();
      // Don't send passwords
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });
  
  // Notification routes
  // Get notifications for current user
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Error fetching notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(notificationId);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error updating notification" });
    }
  });
  
  // Update user notification preferences
  app.patch("/api/users/notification-preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const preferences = req.body;
      
      // Validate the preferences
      if (!preferences || typeof preferences !== 'object') {
        return res.status(400).json({ message: "Invalid notification preferences" });
      }
      
      // Update user preferences
      const updated = await storage.updateUserNotificationPreferences(userId, preferences);
      
      if (!updated) {
        return res.status(404).json({ message: "Failed to update notification preferences" });
      }
      
      res.json({ success: true, preferences });
    } catch (error) {
      res.status(500).json({ message: "Error updating notification preferences" });
    }
  });
  
  // Analytics endpoints
  
  // Get task stats (counts by status, priority, etc.)
  app.get("/api/analytics/task-stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';
      const isManager = req.user!.role === 'manager';
      
      // Define task type based on what's returned from storage
      type TaskType = Awaited<ReturnType<typeof storage.getAllTasks>>[number];
      
      // Get tasks (all for admin/manager, only assigned/created for regular users)
      let tasks: TaskType[];
      if (isAdmin || isManager) {
        tasks = await storage.getAllTasks();
      } else {
        // For regular users, combine their created and assigned tasks
        const createdTasks = await storage.getTasksByCreator(userId);
        const assignedTasks = await storage.getTasksByAssignee(userId);
        
        // Combine and remove duplicates
        const taskMap = new Map<number, TaskType>();
        [...createdTasks, ...assignedTasks].forEach(task => {
          taskMap.set(task.id, task);
        });
        tasks = Array.from(taskMap.values());
      }
      
      // Calculate statistics
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
      const notStartedTasks = tasks.filter(t => t.status === 'not_started').length;
      
      const now = new Date();
      const overdueTasks = tasks.filter(t => 
        t.status !== 'completed' && 
        t.dueDate && 
        new Date(t.dueDate) < now
      ).length;
      
      // Tasks by priority
      const highPriorityTasks = tasks.filter(t => t.priority === 'high').length;
      const mediumPriorityTasks = tasks.filter(t => t.priority === 'medium').length;
      const lowPriorityTasks = tasks.filter(t => t.priority === 'low').length;
      
      // Completion rate
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      // Return statistics
      res.json({
        totalTasks,
        completedTasks,
        inProgressTasks,
        notStartedTasks,
        overdueTasks,
        highPriorityTasks,
        mediumPriorityTasks,
        lowPriorityTasks,
        completionRate: Math.round(completionRate * 100) / 100, // Round to 2 decimal places
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching task statistics" });
    }
  });
  
  // Get user performance metrics
  app.get("/api/analytics/user-performance", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    // Only admin and managers can see all user performance metrics
    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      return res.status(403).json({ message: "You don't have permission to access this data" });
    }
    
    try {
      const users = await storage.getAllUsers();
      const tasks = await storage.getAllTasks();
      
      // Calculate metrics for each user
      const userMetrics = await Promise.all(
        users.map(async (user) => {
          // Count tasks created by this user
          const createdTasks = tasks.filter(t => t.createdById === user.id);
          const totalCreated = createdTasks.length;
          
          // Count tasks assigned to this user
          const assignedTasks = tasks.filter(t => t.assignedToId === user.id);
          const totalAssigned = assignedTasks.length;
          
          // Count completed tasks
          const completedTasks = assignedTasks.filter(t => t.status === 'completed').length;
          
          // Count overdue tasks
          const now = new Date();
          const overdueTasks = assignedTasks.filter(t => 
            t.status !== 'completed' && 
            t.dueDate && 
            new Date(t.dueDate) < now
          ).length;
          
          // Calculate completion rate
          const completionRate = totalAssigned > 0 
            ? (completedTasks / totalAssigned) * 100 
            : 0;
          
          // Calculate average completion time
          const auditLogs = await storage.getAuditLogs(
            AuditEntity.TASK, 
            undefined, 
            user.id
          );
          
          // Skip private user data
          return {
            userId: user.id,
            name: user.name,
            totalCreated,
            totalAssigned,
            completedTasks,
            overdueTasks,
            completionRate: Math.round(completionRate * 100) / 100, // Round to 2 decimal places
          };
        })
      );
      
      res.json(userMetrics);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user performance metrics" });
    }
  });
  
  // Get overdue task trend (for charts)
  app.get("/api/analytics/overdue-trend", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';
      const isManager = req.user!.role === 'manager';
      
      // Define task type based on what's returned from storage
      type TaskType = Awaited<ReturnType<typeof storage.getAllTasks>>[number];
      
      // Get tasks (all for admin/manager, only assigned/created for regular users)
      let tasks: TaskType[];
      if (isAdmin || isManager) {
        tasks = await storage.getAllTasks();
      } else {
        // For regular users, combine their created and assigned tasks
        const createdTasks = await storage.getTasksByCreator(userId);
        const assignedTasks = await storage.getTasksByAssignee(userId);
        
        // Combine and remove duplicates
        const taskMap = new Map<number, TaskType>();
        [...createdTasks, ...assignedTasks].forEach(task => {
          taskMap.set(task.id, task);
        });
        tasks = Array.from(taskMap.values());
      }
      
      // Get overdue tasks
      const now = new Date();
      const overdueTasks = tasks.filter(t => 
        t.status !== 'completed' && 
        t.dueDate && 
        new Date(t.dueDate) < now
      );
      
      // Group by day for the past 4 weeks
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      
      // Initialize data for each day
      const trendData: { date: string; count: number }[] = [];
      for (let i = 0; i < 28; i++) {
        const date = new Date(fourWeeksAgo);
        date.setDate(date.getDate() + i);
        trendData.push({
          date: date.toISOString().split('T')[0],
          count: 0
        });
      }
      
      // Count overdue tasks for each day
      overdueTasks.forEach(task => {
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          if (dueDate >= fourWeeksAgo && dueDate <= now) {
            const dateStr = dueDate.toISOString().split('T')[0];
            const index = trendData.findIndex(d => d.date === dateStr);
            if (index !== -1) {
              trendData[index].count++;
            }
          }
        }
      });
      
      res.json(trendData);
    } catch (error) {
      res.status(500).json({ message: "Error fetching overdue trend data" });
    }
  });
  
  // Audit log routes
  // Get audit logs with optional filters
  app.get("/api/audit-logs", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    // Only users with admin role can see all audit logs
    // Regular users can only see logs related to their tasks
    if (req.user!.role !== 'admin' && 
        req.user!.role !== 'manager' && 
        (!req.query.entityType || req.query.entityType !== 'task')) {
      return res.status(403).json({ 
        message: "You don't have permission to access all audit logs. You can only see logs for your tasks." 
      });
    }
    
    try {
      // Extract filters from query params
      const entityType = req.query.entityType as string | undefined;
      const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : undefined;
      // For non-admin users, only show logs related to the current user
      const userId = req.user!.role === 'admin' || req.user!.role === 'manager' 
        ? (req.query.userId ? parseInt(req.query.userId as string) : undefined)
        : req.user!.id;
        
      const logs = await storage.getAuditLogs(entityType, entityId, userId);
      
      // Get related user data to enrich the logs
      const userIds = new Set(logs.map(log => log.userId));
      const users = await Promise.all(
        Array.from(userIds).map(id => storage.getUser(id))
      );
      const userMap = new Map(
        users.filter(Boolean).map(user => [user!.id, user!])
      );
      
      // Enrich logs with user data
      const enrichedLogs = logs.map(log => ({
        ...log,
        user: userMap.get(log.userId) 
          ? { id: userMap.get(log.userId)!.id, name: userMap.get(log.userId)!.name } 
          : { id: log.userId, name: 'Unknown User' }
      }));
      
      res.json(enrichedLogs);
    } catch (error) {
      res.status(500).json({ message: "Error fetching audit logs" });
    }
  });
  
  // Get activity timeline data (transformed audit logs for dashboard display)
  app.get("/api/activity-timeline", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      // Get limit from query params (default to 10)
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      // For managers and admins, show all activities
      // For regular users, show only activities related to them
      const userId = req.user!.role === 'admin' || req.user!.role === 'manager' 
        ? undefined 
        : req.user!.id;
      
      // Get audit logs
      const logs = await storage.getAuditLogs(undefined, undefined, userId);
      
      // Limit the number of logs
      const limitedLogs = logs.slice(0, limit);
      
      // Get all user IDs referenced in the logs
      const userIds = new Set(limitedLogs.map(log => log.userId));
      
      // Get task IDs referenced in the logs
      const taskIds = new Set(
        limitedLogs
          .filter(log => log.entityType === AuditEntity.TASK)
          .map(log => log.entityId)
      );
      
      // Fetch users and tasks
      const users = await Promise.all(
        Array.from(userIds).map(id => storage.getUser(id))
      );
      const tasks = await Promise.all(
        Array.from(taskIds).map(id => storage.getTask(id))
      );
      
      // Create maps for quick lookup
      const userMap = new Map(
        users.filter(Boolean).map(user => [user!.id, user!])
      );
      const taskMap = new Map(
        tasks.filter(Boolean).map(task => [task!.id, task!])
      );
      
      // Transform logs into activity timeline format
      const activities = limitedLogs.map(log => {
        const user = userMap.get(log.userId);
        const task = log.entityType === AuditEntity.TASK ? taskMap.get(log.entityId) : null;
        
        // Extract assignedTo user if available in the details
        let assignedToUser = null;
        if (log.action === AuditAction.ASSIGNED && log.details) {
          // Type assertion for the details object which can contain different properties
          const details = log.details as { assignedToId?: number };
          if (details.assignedToId) {
            assignedToUser = userMap.get(details.assignedToId) || null;
          }
        }
        
        return {
          id: log.id,
          type: log.action.toLowerCase(),
          task: task ? {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate
          } : null,
          user: user ? {
            id: user.id,
            name: user.name,
            avatar: user.avatar
          } : { id: log.userId, name: "Unknown User", avatar: null },
          timestamp: log.timestamp,
          assignedTo: assignedToUser ? {
            id: assignedToUser.id,
            name: assignedToUser.name,
            avatar: assignedToUser.avatar
          } : null,
          details: log.details
        };
      });
      
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Error fetching activity timeline" });
    }
  });
  
  // Get audit logs for a specific task
  app.get("/api/tasks/:id/audit-logs", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Check if user has permission to view this task's logs
      const userId = req.user!.id;
      if (req.user!.role !== 'admin' && 
          req.user!.role !== 'manager' && 
          task.createdById !== userId && 
          task.assignedToId !== userId) {
        return res.status(403).json({ 
          message: "You don't have permission to view this task's audit logs" 
        });
      }
      
      const logs = await storage.getAuditLogs(AuditEntity.TASK, taskId);
      
      // Get user data to enrich the logs
      const userIds = new Set(logs.map(log => log.userId));
      const users = await Promise.all(
        Array.from(userIds).map(id => storage.getUser(id))
      );
      const userMap = new Map(
        users.filter(Boolean).map(user => [user!.id, user!])
      );
      
      // Enrich logs with user data
      const enrichedLogs = logs.map(log => ({
        ...log,
        user: userMap.get(log.userId) 
          ? { id: userMap.get(log.userId)!.id, name: userMap.get(log.userId)!.name } 
          : { id: log.userId, name: 'Unknown User' }
      }));
      
      res.json(enrichedLogs);
    } catch (error) {
      res.status(500).json({ message: "Error fetching task audit logs" });
    }
  });

  // Create an HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active connections by user ID
  const clients = new Map<number, WebSocket[]>();
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    let userId: number | null = null;
    
    // Handle messages from clients
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle authentication
        if (data.type === 'auth') {
          userId = parseInt(data.userId);
          
          // Store the connection for this user
          if (!clients.has(userId)) {
            clients.set(userId, []);
          }
          clients.get(userId)?.push(ws);
          
          console.log(`User ${userId} connected via WebSocket`);
          
          // Send confirmation
          ws.send(JSON.stringify({ type: 'auth_success' }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      if (userId) {
        // Remove this connection from the client list
        const userConnections = clients.get(userId) || [];
        const index = userConnections.indexOf(ws);
        if (index !== -1) {
          userConnections.splice(index, 1);
        }
        
        // If no more connections for this user, remove the user entry
        if (userConnections.length === 0) {
          clients.delete(userId);
        }
        
        console.log(`User ${userId} disconnected from WebSocket`);
      }
    });
  });
  
  // Define a function to send notifications to users via WebSocket
  // This can be used from other parts of the application
  app.locals.sendNotification = (userId: number, notification: any) => {
    const userConnections = clients.get(userId) || [];
    
    // Send the notification to all connections for this user
    userConnections.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'notification',
          data: notification
        }));
      }
    });
  };
  
  return httpServer;
}
