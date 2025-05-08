import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertTaskSchema, updateTaskSchema } from "@shared/schema";
import { TaskPriority, TaskStatus, UserRole } from "@shared/schema";
import { ZodError } from "zod";
import { WebSocketServer, WebSocket } from "ws";

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
