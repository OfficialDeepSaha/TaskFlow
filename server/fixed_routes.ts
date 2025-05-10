import type { Express, Request, Response, Router, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertTaskSchema, updateTaskSchema, insertTaskMoodReactionSchema } from "../shared/schema";
import { 
  TaskPriority, TaskStatus, UserRole, AuditEntity, AuditAction, Task, NotificationChannel,
  TaskMoodType, TaskColor, Notification, UpdateTask
} from "../shared/schema";
import { taskManager } from "./taskManager";
import { ZodError } from "zod";
import { analyticsHelper } from "./analyticsHelper";
import { WebSocketServer, WebSocket } from "ws";
import { 
  sendTaskAssignmentNotification, 
  sendTaskStatusUpdateNotification, 
  sendTaskCompletionNotification 
} from "./emailService";
import { createTaskNotificationSystem } from "./taskNotifications";

// Port listen is now handled in index.ts

// Custom middleware to check authentication
function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  try {
    // Check for passport's isAuthenticated
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    
    // If passport's method is missing or returns false, return 401
    return res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    console.error("Authentication check error:", error);
    return res.status(500).json({ message: "Authentication check failed" });
  }
}

export async function registerRoutes(app: Express, apiRouter?: Router): Promise<Server> {
  // Set up authentication routes with the apiRouter
  setupAuth(app, apiRouter);
  
  // Create HTTP server to attach WebSocket server
  const httpServer = createServer(app);
  
  // Use the appropriate router - either the provided apiRouter or the main app
  const router = apiRouter || app;
  
  // Set up WebSocket server for real-time notifications
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: undefined, // Allow connections to the root path
    clientTracking: true,
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      concurrencyLimit: 10,
      threshold: 1024
    }
  });
  
  console.log('[WEBSOCKET] Server initialized and listening on the same port as HTTP server');

  // Implement heartbeat to prevent connection dropouts
  const heartbeat = function(this: WebSocket) {
    (this as any).isAlive = true;
    console.log('[WEBSOCKET] Heartbeat received from client');
  };
  
  // Store active connections by user ID
  const clients = new Map<number, Set<WebSocket>>();
  
  // Initialize task notification system
  const notifications = createTaskNotificationSystem(app, wss, clients);
  
  // Set up the heartbeat interval
  const pingInterval = setInterval(() => {
    let activeConnections = 0;
    
    wss.clients.forEach((ws) => {
      activeConnections++;
      
      if ((ws as any).isAlive === false) {
        console.log('[WEBSOCKET] Terminating dead connection');
        return ws.terminate();
      }
      
      // Mark as inactive for the next ping
      (ws as any).isAlive = false;
      // Send ping
      ws.ping();
    });
    
    if (activeConnections > 0) {
      console.log(`[WEBSOCKET] Sent heartbeat to ${activeConnections} connections`);
    }
  }, 30000); // 30 seconds interval
  
  // Clear interval when server is closed
  wss.on('close', () => {
    clearInterval(pingInterval);
  });
  
  // New endpoints for recurring tasks and audit logs

  // Get all recurring tasks
  router.get("/recurring-tasks", ensureAuthenticated, async (req: Request, res: Response) => {
    // Only admins and managers can see all recurring tasks
    const currentUser = req.user as any;
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
      return res.status(403).json({ message: "Insufficient permissions to view all recurring tasks" });
    }
    
    try {
      // Use the taskManager to get recurring tasks
      const recurringTasks = await taskManager.getRecurringTasks();
      res.json(recurringTasks);
    } catch (error) {
      console.error('Error fetching recurring tasks:', error);
      res.status(500).json({ message: "Error fetching recurring tasks" });
    }
  });

  // Process recurring tasks (manually trigger the creation of the next instances)
  // This would typically be handled by a scheduler in production
  router.post("/recurring-tasks/process", ensureAuthenticated, async (req: Request, res: Response) => {
    // Only admins can process recurring tasks
    const currentUser = req.user as any;
    if (currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Insufficient permissions to process recurring tasks" });
    }
    
    try {
      await taskManager.processRecurringTasks();
      res.json({ success: true, message: "Recurring tasks processed successfully" });
    } catch (error) {
      console.error('Error processing recurring tasks:', error);
      res.status(500).json({ message: "Error processing recurring tasks" });
    }
  });

  // Get audit logs for a specific task
  router.get("/tasks/:id/audit-logs", ensureAuthenticated, async (req: Request, res: Response) => {
    // Get task ID from params
    const taskId = parseInt(req.params.id);
    
    // Check if task exists
    const task = await storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    // Only admins, managers, or the task's creator/assignee can view audit logs
    const currentUser = req.user as any;
    if (currentUser.role !== UserRole.ADMIN && 
        currentUser.role !== UserRole.MANAGER && 
        task.createdById !== currentUser.id && 
        task.assignedToId !== currentUser.id) {
      return res.status(403).json({ message: "Insufficient permissions to view task audit logs" });
    }
    
    try {
      const auditLogs = await taskManager.getTaskAuditLogs(taskId);
      res.json(auditLogs);
    } catch (error) {
      console.error(`Error fetching audit logs for task ${taskId}:`, error);
      res.status(500).json({ message: "Error fetching audit logs" });
    }
  });

  // Get all audit logs (admin only)
  router.get("/audit-logs", ensureAuthenticated, async (req: Request, res: Response) => {
    // Only admins can see all audit logs
    const currentUser = req.user as any;
    if (currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Insufficient permissions to view all audit logs" });
    }
    
    try {
      // Get all audit logs from storage
      const auditLogs = await storage.getAuditLogs();
      res.json(auditLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ message: "Error fetching audit logs" });
    }
  });

  // Get audit logs for current user
  router.get("/audit-logs/me", ensureAuthenticated, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    
    try {
      // Get audit logs for the current user
      const auditLogs = await storage.getAuditLogs(undefined, undefined, userId);
      res.json(auditLogs);
    } catch (error) {
      console.error(`Error fetching audit logs for user ${userId}:`, error);
      res.status(500).json({ message: "Error fetching audit logs" });
    }
  });
  
  // Websocket connection handler
  wss.on('connection', async (ws: WebSocket, req: any) => {
    console.log('--------------------------------');
    console.log('[WEBSOCKET] New connection from:', req.headers.origin);
    console.log('[WEBSOCKET] Connection URL:', req.url);
    
    // Track connection lifetime
    const connectedAt = Date.now();
    let userId: number | null = null;
    
    // Initialize heartbeat
    (ws as any).isAlive = true;
    ws.on('pong', heartbeat);
    
    // Handle errors
    ws.on('error', (error: any) => {
      console.error('[WEBSOCKET] Connection error:', error);
    });
    
    try {
      // Add this WebSocket to a set of pending connections
      console.log('[WEBSOCKET] Connection pending authentication');
      
      // Authentication will happen when client sends auth message
      // or via URL token parameter
      
      // Try to authenticate from URL parameters first
      if (req.url) {
        try {
          const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          const token = parsedUrl.searchParams.get('token');
          const sessionId = parsedUrl.searchParams.get('sessionId');
          
          // First try session-based authentication if sessionId is provided
          let authenticated = false;
          
          if (sessionId) {
            console.log('[WEBSOCKET] Attempting to authenticate with session ID');
            
            try {
              // Verify session exists and contains userId
              const session = await new Promise<any>((resolve, reject) => {
                storage.sessionStore.get(sessionId, (err: Error | null, session: any) => {
                  if (err) reject(err);
                  else resolve(session);
                });
              });
              
              if (session && session.userId) {
                // Session found with userId
                const validUserId = session.userId as number; // Ensure this is a number
                userId = validUserId;
                const user = await storage.getUser(validUserId);
                
                if (user) {
                  console.log(`[WEBSOCKET] User ${validUserId} (${user.name}) authenticated via session ID`);
                  authenticated = true;
                  
                  // Save userId on the socket for later reference
                  (ws as any).userId = validUserId;
                  
                  // Add connection to clients map
                  if (!clients.has(validUserId)) {
                    clients.set(validUserId, new Set());
                  }
                  clients.get(validUserId)!.add(ws);
                  
                  // Send authentication success message
                  ws.send(JSON.stringify({
                    type: 'auth_success',
                    userId: validUserId, // Use the validated userId
                    timestamp: Date.now(),
                    authMethod: 'session'
                  }));
                  
                  // Refresh session to prevent expiration
                  storage.sessionStore.touch(sessionId, session, (err: Error | null) => {
                    if (err) console.error('[WEBSOCKET] Error refreshing session:', err);
                    else console.log('[WEBSOCKET] Session refreshed successfully');
                  });
                  
                  console.log('[WEBSOCKET] Session-based authentication successful');
                }
              }
            } catch (error) {
              console.error('[WEBSOCKET] Session authentication error:', error);
            }
          }
          
          // If session auth failed, try token-based auth
          if (!authenticated && token && !isNaN(parseInt(token))) {
            const validTokenId = parseInt(token);
            userId = validTokenId;
            console.log('[WEBSOCKET] Token authentication from URL:', validTokenId);
            
            // Verify user exists
            const user = await storage.getUser(validTokenId);
            if (user) {
              console.log(`[WEBSOCKET] User ${validTokenId} (${user.name}) authenticated via token`);
              
              // Save userId on the socket for later reference
              (ws as any).userId = validTokenId;
              
              // Add connection to clients map
              if (!clients.has(validTokenId)) {
                clients.set(validTokenId, new Set());
              }
              clients.get(validTokenId)!.add(ws);
              
              // Send authentication success message
              ws.send(JSON.stringify({
                type: 'auth_success',
                userId: validTokenId,
                timestamp: Date.now(),
                authMethod: 'token'
              }));
              
              // Authentication successful, no need to wait for auth message
              console.log('[WEBSOCKET] URL token authentication successful');
            } else {
              console.error('[WEBSOCKET] User not found:', userId);
              // Don't close yet, wait for auth message
            }
          }
        } catch (error) {
          console.error('[WEBSOCKET] Error parsing URL:', error);
          // Continue to message-based auth
        }
      }
      
      // Handle messages
      ws.on('message', async (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          console.log(`[WEBSOCKET] Message received:`, typeof data === 'object' ? data.type : 'unknown format');
          
          // Handle auth messages (if not already authenticated via URL)
          if (data.type === 'auth' && !userId) {
            if (data.userId && !isNaN(parseInt(data.userId.toString()))) {
              const authenticatingUserId = parseInt(data.userId.toString());
              console.log('[WEBSOCKET] Authenticating user:', authenticatingUserId);
              
              // Verify user exists
              const user = await storage.getUser(authenticatingUserId);
              if (user) {
                userId = authenticatingUserId;
                console.log(`[WEBSOCKET] User ${userId} (${user.name}) authenticated via message`);
                
                // Save userId on the socket for later reference
                (ws as any).userId = userId;
                
                // Add connection to clients map
                if (!clients.has(userId)) {
                  clients.set(userId, new Set());
                }
                clients.get(userId)!.add(ws);
                
                // Send authentication success message
                ws.send(JSON.stringify({
                  type: 'auth_success',
                  userId: userId,
                  timestamp: Date.now()
                }));
              } else {
                console.error('[WEBSOCKET] User not found:', authenticatingUserId);
                ws.send(JSON.stringify({
                  type: 'auth_error',
                  message: 'User not found',
                  timestamp: Date.now()
                }));
              }
            } else {
              console.error('[WEBSOCKET] Invalid userId in auth message:', data.userId);
              ws.send(JSON.stringify({
                type: 'auth_error',
                message: 'Invalid user ID',
                timestamp: Date.now()
              }));
            }
          }
          // Handle ping messages (client heartbeat)
          else if (data.type === 'ping') {
            console.log('[WEBSOCKET] Ping received, sending pong');
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: data.timestamp || Date.now(),
              serverTime: Date.now()
            }));
          }
          // Log any other message types
          else {
            console.log(`[WEBSOCKET] Received message of type: ${data.type}`);
          }
        } catch (error) {
          console.error('[WEBSOCKET] Error processing message:', error);
        }
      });
      
      // Handle disconnection
      ws.on('close', (code, reason) => {
        const duration = Date.now() - connectedAt;
        console.log(`[WEBSOCKET] User ${userId} disconnected after ${duration}ms. Code: ${code}, Reason: ${reason || 'None'}`);
        
        // Remove from clients map
        if (userId && clients.has(userId)) {
          clients.get(userId)!.delete(ws);
          if (clients.get(userId)!.size === 0) {
            clients.delete(userId);
          }
        }
      });
    } catch (error) {
      console.error('[WEBSOCKET] Error in connection handling:', error);
      ws.close(1011, 'Server error');
    }
  });
  
  // Helper to send notifications to users - always store on app.locals for consistent access
  app.locals.sendNotification = (userId: number, notification: any) => {
    if (!clients.has(userId)) return;
    
    clients.get(userId)!.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'notification',
          data: notification,
          timestamp: Date.now()
        }));
      }
    });
  };
  
  // Now define all the REST API routes
  
  // Task routes
  // Get all tasks
  router.get("/tasks", ensureAuthenticated, async (req: Request, res: Response) => {
    console.log("GET /tasks - Handling request from user:", (req.user as any)?.id);
    // Role-based access: regular users see only their assigned tasks
    const currentUser = req.user as any;
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
      try {
        const tasks = await storage.getTasksByAssignee(currentUser.id);
        return res.json(tasks);
      } catch (error) {
        console.error('Error fetching assigned tasks for user:', error);
        return res.status(500).json({ message: "Error fetching tasks" });
      }
    }
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error fetching tasks" });
    }
  });
  
  // Handle the same route but with trailing slash
  router.get("/tasks/", ensureAuthenticated, (req, res) => {
    // This route redirects to the non-trailing slash version
    res.redirect("/tasks");
  });

  // Get task by ID
  router.get("/tasks/:id", ensureAuthenticated, async (req: Request, res: Response) => {
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

  // Create a new task
  router.post("/tasks", ensureAuthenticated, async (req: Request, res: Response) => {
    // Only admin and manager can create tasks
    const currentUser = req.user as any;
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions to create tasks" });
    }
    try {
      // Validate request body
      const taskData = insertTaskSchema.parse(req.body);
      
      // Ensure assignedToId is either null or a number (not undefined, NaN, etc.)
      if (taskData.assignedToId !== null && isNaN(Number(taskData.assignedToId))) {
        console.error(`Invalid assignedToId value: "${taskData.assignedToId}" (${typeof taskData.assignedToId})`);
        return res.status(400).json({ message: "Invalid assignedToId value" });
      }
      
      // If assignedToId is a string, convert it to a number
      if (typeof taskData.assignedToId === 'string') {
        taskData.assignedToId = parseInt(taskData.assignedToId);
        console.log(`Converted string assignedToId to number: ${taskData.assignedToId}`);
      }
      
      // DEBUG: Log the task data being created
      console.log("Creating task with data:", JSON.stringify({
        ...taskData,
        createdById: currentUser.id,
        assignedToId: taskData.assignedToId
      }, null, 2));
      
      // Use taskManager to create the task with audit logging and recurring task handling
      const newTask = await taskManager.createTask(taskData, currentUser.id);
      
      // DEBUG: Log the created task
      console.log("Task created:", JSON.stringify(newTask, null, 2));
      
      // Send notification if the task is assigned to someone
      if (newTask.assignedToId && notifications) {
        try {
          // Get the assigner (creator) name
          const assigner = await storage.getUser(currentUser.id);
          const assignerName = assigner ? assigner.name : 'An admin';
          
          // Notify the assignee
          notifications.notifyTaskAssigned(newTask, newTask.assignedToId, assignerName);
          
          console.log(`Notification sent to user ${newTask.assignedToId} for task assignment`);
        } catch (notifyError) {
          console.error('Error sending task assignment notification:', notifyError);
          // Don't fail the request if notification fails
        }
      }
      
      // Return created task
      res.status(201).json(newTask);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Error creating task" });
    }
  });

  // Delete a task
  router.delete("/tasks/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      // Only admin and manager can delete tasks
      const currentUser = req.user as any;
      if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
        return res.status(403).json({ message: "Forbidden: insufficient permissions to delete tasks" });
      }
      
      const taskId = parseInt(req.params.id);
      const userId = currentUser.id;
      
      // Use taskManager to delete the task with audit logging
      const success = await taskManager.deleteTask(taskId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json({ success: true, message: "Task deleted successfully" });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ message: "Error deleting task" });
    }
  });
  
  // Get tasks assigned to current user
  router.get("/tasks/assigned/me", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      console.log("Fetching tasks assigned to user ID:", userId);
      const tasks = await storage.getTasksByAssignee(userId);
      console.log("Found assigned tasks:", JSON.stringify(tasks, null, 2));
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching assigned tasks:', error);
      res.status(500).json({ message: "Error fetching tasks" });
    }
  });
  // Get all users
  router.get("/users", async (req: Request, res: Response) => {    
    try {
      // Debug logging
      console.log('GET /users - Fetching all users (authentication bypassed)');
      
      // Ensure content type is set
      res.contentType('application/json');
      
      const users = await storage.getAllUsers();
      
      // Remove passwords from response
      const safeUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user as any;
        return userWithoutPassword;
      });
      
      res.json(safeUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Return empty array instead of error to ensure client gets something
      res.json([]);
    }
  });
  
  // Handle the same route but with trailing slash
  router.get("/users/", ensureAuthenticated, (req, res) => {
    // This route redirects to the non-trailing slash version
    res.redirect("/users");
  });
  
  // Get current user's notification preferences
  router.get("/users/me/notification-preferences", ensureAuthenticated, async (req, res) => {
    try {
      console.log('Getting notification preferences for current user');
      
      // Get current user ID
      const userId = (req.user as any).id;
      if (!userId) {
        console.error('No user ID found in authenticated request');
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      console.log(`Fetching notification preferences for user ID: ${userId}`);
      
      // Get user notification preferences
      const preferences = await storage.getUserNotificationPreferences(userId);
      
      // Return response
      res.json({ preferences });
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({ message: "Error fetching notification preferences" });
    }
  });
  
  // Update current user's notification preferences
  router.put("/users/me/notification-preferences", ensureAuthenticated, async (req, res) => {
    try {
      console.log('Updating notification preferences for current user');
      console.log('Request body:', JSON.stringify(req.body));
      
      // Get current user ID
      const userId = (req.user as any).id;
      if (!userId) {
        console.error('No user ID found in authenticated request');
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Extract preferences from body
      const { preferences } = req.body;
      if (!preferences || !Array.isArray(preferences)) {
        console.error('Invalid preferences format:', req.body);
        return res.status(400).json({ message: "Invalid preferences format" });
      }
      
      console.log(`Saving preferences for user ID: ${userId}`);
      
      // Save user notification preferences
      const success = await storage.saveUserNotificationPreferences(userId, preferences);
      
      if (success) {
        // Return success response
        res.json({ message: "Notification preferences updated successfully" });
      } else {
        res.status(500).json({ message: "Failed to update notification preferences" });
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ message: "Error updating notification preferences" });
    }
  });
  
  // Update task (PATCH) endpoint
  router.patch("/tasks/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as any;
      const taskId = parseInt(req.params.id);
      
      // Validate input
      let taskData: UpdateTask;
      try {
        taskData = updateTaskSchema.parse(req.body);
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          return res.status(400).json({ message: "Invalid task data", errors: validationError.errors });
        }
        throw validationError;
      }
      
      // Use taskManager to update the task with audit logging and recurring task handling
      const updatedTask = await taskManager.updateTask(taskId, taskData, currentUser.id);
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found or could not be updated" });
      }
      
      // Handle notifications
      if (notifications) {
        try {
          // Get updater name
          const updater = await storage.getUser(currentUser.id);
          const updaterName = updater ? updater.name : 'An admin';
          
          // Get the original task for comparison (needed for notification logic)
          const originalTask = await storage.getTask(taskId);
          
          if (originalTask) {
            // Case 1: Task assignment changed
            if (taskData.assignedToId !== undefined && 
                updatedTask.assignedToId !== null && 
                originalTask.assignedToId !== updatedTask.assignedToId) {
              // New assignment
              notifications.notifyTaskAssigned(updatedTask, updatedTask.assignedToId, updaterName);
              console.log(`Assignment notification sent to user ${updatedTask.assignedToId}`);
            } 
            // Case 2: Task was updated with the same assignee
            else if (updatedTask.assignedToId && updatedTask.assignedToId === originalTask.assignedToId) {
              // Update notification
              notifications.notifyTaskUpdated(updatedTask, updatedTask.assignedToId, updaterName);
              console.log(`Update notification sent to user ${updatedTask.assignedToId}`);
            }
            
            // Case 3: Status changed to completed
            if (taskData.status === TaskStatus.COMPLETED && originalTask.status !== TaskStatus.COMPLETED) {
              // Send completion notification to task creator
              if (originalTask.createdById !== currentUser.id) {
                notifications.notifyTaskCompleted(updatedTask, originalTask.createdById, updaterName);
                console.log(`Completion notification sent to creator ${originalTask.createdById}`);
              }
            }
          }
        } catch (notifyError) {
          console.error('Error sending task update notification:', notifyError);
          // Don't fail the request if notification fails
        }
      }
      
      // Return updated task
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Error updating task" });
    }
  });

  // Debug endpoint to check session cookie and authentication status
  router.get("/debug/auth", (req, res) => {
    try {
      // Get session information
      const sessionId = req.sessionID || "No session ID found";
      const isAuthenticated = req.isAuthenticated ? req.isAuthenticated() : false;
      const user = req.user ? { 
        id: req.user.id, 
        username: req.user.username,
        name: req.user.name,
        role: req.user.role
      } : null;
      
      // Get cookie information
      const cookies = req.headers.cookie || "No cookies found";
      
      res.json({
        sessionId,
        isAuthenticated,
        user,
        cookies,
        headers: {
          cookie: req.headers.cookie,
          authorization: req.headers.authorization
        }
      });
    } catch (error: any) {
      console.error("Error in debug route:", error);
      res.status(500).json({ error: "Internal server error", message: error.message });
    }
  });

  // Get analytics data (admin only)
  router.get("/analytics", ensureAuthenticated, async (req: Request, res: Response) => {
    // Only admin can access analytics
    const currentUser = req.user as any;
    if (currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Forbidden: only admins can access analytics" });
    }
    
    try {
      // Get date range from query parameters
      const startDate = req.query.startDate as string || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Default to 7 days ago
      const endDate = req.query.endDate as string || new Date().toISOString().split('T')[0]; // Default to today
      
      // Get analytics data
      const analyticsData = await analyticsHelper.getAnalyticsData(startDate, endDate);
      
      res.json(analyticsData);
    } catch (error) {
      console.error('Error generating analytics:', error);
      res.status(500).json({ message: "Error generating analytics data" });
    }
  });

  // DEBUG ENDPOINT: Get all tasks with their assignments (admin only)
  router.get("/debug/tasks", ensureAuthenticated, async (req: Request, res: Response) => {
    // Only admin can access this debug endpoint
    const currentUser = req.user as any;
    if (currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Forbidden: only admins can access this endpoint" });
    }
    
    try {
      const allTasks = await storage.getAllTasks();
      const taskSummary = allTasks.map(task => ({
        id: task.id,
        title: task.title,
        createdById: task.createdById,
        assignedToId: task.assignedToId,
        status: task.status
      }));
      
      res.json({
        totalTasks: allTasks.length,
        tasks: taskSummary
      });
    } catch (error) {
      console.error('Error fetching all tasks for debug:', error);
      res.status(500).json({ message: "Error fetching tasks" });
    }
  });

  // Rest of your routes...

  // Return HTTP server; listening is handled in index.ts
  return httpServer;
}
