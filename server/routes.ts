import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertTaskSchema, updateTaskSchema, insertTaskMoodReactionSchema } from "../shared/schema";
import { 
  TaskPriority, TaskStatus, UserRole, AuditEntity, AuditAction, Task, NotificationChannel,
  TaskMoodType, TaskColor
} from "../shared/schema";
import { ZodError } from "zod";
import { 
  sendTaskAssignmentNotification, 
  sendTaskStatusUpdateNotification, 
  sendTaskCompletionNotification 
} from "./emailService";

export async function registerRoutes(app: Express, apiRouter: unknown): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Create HTTP server
  const httpServer = createServer(app);

  // User routes
  // Get current user (ensure we don't have duplicate routes)
  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Ensure content type is set
    res.contentType('application/json');
    
    // Remove password from response
    const user = req.user as any;
    const { password, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  });

  // Get all users
  app.get("/api/users", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      // Debug logging
      console.log('GET /api/users - Fetching all users');
      
      // Ensure content type is set
      res.contentType('application/json');
      
      const users = await storage.getAllUsers();
      
      // More debug logging
      console.log(`GET /api/users - Found ${users.length} users`);
      
      // Remove passwords from response
      const safeUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user as any;
        return userWithoutPassword;
      });
      
      // Set explicit content type again for safety
      res.setHeader('Content-Type', 'application/json');
      
      res.json(safeUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  // Task routes
  // Get all tasks
  app.get("/api/tasks", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const tasks = await storage.getAllTasks();
      
      // Set explicit content type
      res.contentType('application/json');
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error fetching tasks" });
    }
  });

  // Get task by ID
  app.get("/api/tasks/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Set explicit content type
      res.contentType('application/json');
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Error fetching task" });
    }
  });

  // Rest of your routes...

  // Return the HTTP server without starting it
  return httpServer;
}
