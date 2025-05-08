import { 
  users, tasks, notifications, auditLogs, 
  type User, type InsertUser, 
  type Task, type InsertTask, type UpdateTask, 
  type Notification, type InsertNotification,
  type AuditLog, type InsertAuditLog,
  AuditAction, AuditEntity, UserRole, RecurringPattern, TaskStatus, NotificationChannel
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, or, lt, desc } from "drizzle-orm";
import postgres from "postgres";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Set up database connection for PostgreSQL
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString || "", { ssl: 'require' });

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserNotificationPreferences(userId: number, preferences: any): Promise<boolean>;
  
  // Task operations
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: UpdateTask): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  getAllTasks(): Promise<Task[]>;
  getTasksByAssignee(userId: number): Promise<Task[]>;
  getTasksByCreator(userId: number): Promise<Task[]>;
  getOverdueTasks(userId: number): Promise<Task[]>;
  searchTasks(query: string, filters?: TaskFilters): Promise<Task[]>;
  createRecurringTaskInstances(task: Task): Promise<Task[]>; // For handling recurring tasks
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<boolean>;
  
  // Audit logging operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(entityType?: string, entityId?: number, userId?: number): Promise<AuditLog[]>;
  
  // Session store
  sessionStore: any; // Express SessionStore
}

export type TaskFilters = {
  status?: string[];
  priority?: string[];
  dueDate?: Date;
  assignedToId?: number;
  createdById?: number;
};

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private notifications: Map<number, Notification>;
  private auditLogs: Map<number, AuditLog>;
  private userCurrentId: number;
  private taskCurrentId: number;
  private notificationCurrentId: number;
  private auditLogCurrentId: number;
  sessionStore: any; // Express SessionStore

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.notifications = new Map();
    this.auditLogs = new Map();
    this.userCurrentId = 1;
    this.taskCurrentId = 1;
    this.notificationCurrentId = 1;
    this.auditLogCurrentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { 
      id,
      username: insertUser.username,
      name: insertUser.name,
      password: insertUser.password,
      role: insertUser.role || 'user',
      lastActive: new Date(),
      avatar: null,
      email: insertUser.email || null,
      notificationPreferences: insertUser.notificationPreferences || {
        channels: [NotificationChannel.IN_APP],
        taskAssignment: true,
        taskStatusUpdate: true,
        taskCompletion: true,
        taskDueSoon: true,
        systemUpdates: true
      }
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async updateUserNotificationPreferences(userId: number, preferences: any): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    // Update the user's notification preferences
    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...preferences
    };
    
    this.users.set(userId, user);
    return true;
  }

  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskCurrentId++;
    const now = new Date();
    const task: Task = {
      ...insertTask,
      id,
      createdAt: now,
      status: insertTask.status || 'not_started',
      priority: insertTask.priority || 'medium',
      description: insertTask.description || null,
      dueDate: insertTask.dueDate || null,
      assignedToId: insertTask.assignedToId || null,
      // New fields for recurring tasks
      isRecurring: insertTask.isRecurring || false,
      recurringPattern: insertTask.recurringPattern || 'none',
      recurringEndDate: insertTask.recurringEndDate || null,
      parentTaskId: insertTask.parentTaskId || null,
    };
    
    this.tasks.set(id, task);
    
    // Create notification if task is assigned to someone
    if (task.assignedToId && task.assignedToId !== task.createdById) {
      const creator = this.users.get(task.createdById);
      if (creator) {
        this.createNotification({
          message: `${creator.name} assigned you a new task: ${task.title}`,
          userId: task.assignedToId,
          taskId: task.id,
          read: false
        });
      }
    }
    
    return task;
  }

  async updateTask(id: number, updateData: UpdateTask): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const prevAssignedToId = task.assignedToId;
    
    const updatedTask: Task = {
      ...task,
      ...updateData,
    };
    
    this.tasks.set(id, updatedTask);
    
    // Create notification if task assignee has changed
    if (updateData.assignedToId && 
        updateData.assignedToId !== prevAssignedToId && 
        updateData.assignedToId !== task.createdById) {
      const creator = this.users.get(task.createdById);
      if (creator) {
        this.createNotification({
          message: `${creator.name} assigned you a task: ${task.title}`,
          userId: updateData.assignedToId,
          taskId: task.id,
          read: false
        });
      }
    }
    
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTasksByAssignee(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.assignedToId === userId
    );
  }

  async getTasksByCreator(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.createdById === userId
    );
  }

  async getOverdueTasks(userId: number): Promise<Task[]> {
    const now = new Date();
    return Array.from(this.tasks.values()).filter(
      (task) => 
        (task.assignedToId === userId || task.createdById === userId) && 
        task.dueDate && 
        new Date(task.dueDate) < now
    );
  }

  async searchTasks(query: string, filters?: TaskFilters): Promise<Task[]> {
    let filteredTasks = Array.from(this.tasks.values());
    
    // Apply text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      filteredTasks = filteredTasks.filter(
        task => 
          task.title.toLowerCase().includes(lowerQuery) || 
          (task.description && task.description.toLowerCase().includes(lowerQuery))
      );
    }
    
    // Apply filters if provided
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        filteredTasks = filteredTasks.filter(task => filters.status!.includes(task.status));
      }
      
      if (filters.priority && filters.priority.length > 0) {
        filteredTasks = filteredTasks.filter(task => filters.priority!.includes(task.priority));
      }
      
      if (filters.dueDate) {
        const filterDate = new Date(filters.dueDate);
        filteredTasks = filteredTasks.filter(task => 
          task.dueDate && 
          new Date(task.dueDate).toDateString() === filterDate.toDateString()
        );
      }
      
      if (filters.assignedToId !== undefined) {
        filteredTasks = filteredTasks.filter(task => task.assignedToId === filters.assignedToId);
      }
      
      if (filters.createdById !== undefined) {
        filteredTasks = filteredTasks.filter(task => task.createdById === filters.createdById);
      }
    }
    
    return filteredTasks;
  }

  // Notification operations
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.notificationCurrentId++;
    const now = new Date();
    const notification: Notification = {
      ...insertNotification,
      id,
      createdAt: now,
      taskId: insertNotification.taskId || null,
      read: insertNotification.read !== undefined ? insertNotification.read : false,
    };
    
    this.notifications.set(id, notification);
    return notification;
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    notification.read = true;
    this.notifications.set(id, notification);
    return true;
  }

  // Audit log operations
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const id = this.auditLogCurrentId++;
    const now = new Date();
    const log: AuditLog = {
      ...insertLog,
      id,
      timestamp: now,
      details: insertLog.details || null
    };
    
    this.auditLogs.set(id, log);
    return log;
  }

  async getAuditLogs(entityType?: string, entityId?: number, userId?: number): Promise<AuditLog[]> {
    let logs = Array.from(this.auditLogs.values());
    
    if (entityType) {
      logs = logs.filter(log => log.entityType === entityType);
    }
    
    if (entityId) {
      logs = logs.filter(log => log.entityId === entityId);
    }
    
    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }
    
    // Sort by timestamp, most recent first
    return logs.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  }

  // Recurring task operations
  async createRecurringTaskInstances(task: Task): Promise<Task[]> {
    // Only create recurring instances for tasks that are set as recurring
    if (!task.isRecurring || task.recurringPattern === RecurringPattern.NONE) {
      return [];
    }
    
    const recurringEndDate = task.recurringEndDate || null;
    if (!task.dueDate || (recurringEndDate && new Date(task.dueDate) > new Date(recurringEndDate))) {
      return [];
    }
    
    const createdTasks: Task[] = [];
    const startDate = new Date(task.dueDate);
    const endDate = recurringEndDate ? new Date(recurringEndDate) : new Date(startDate.getTime() + (90 * 24 * 60 * 60 * 1000)); // Default to 90 days
    
    let currentDate = new Date(startDate);
    
    // Advance to the next occurrence
    switch (task.recurringPattern) {
      case RecurringPattern.DAILY:
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case RecurringPattern.WEEKLY:
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case RecurringPattern.MONTHLY:
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
    }
    
    // Create recurring instances until end date
    while (currentDate <= endDate) {
      const newTaskData: InsertTask = {
        title: task.title,
        description: task.description,
        status: "not_started", // Always start as not started
        priority: task.priority,
        dueDate: new Date(currentDate),
        createdById: task.createdById,
        assignedToId: task.assignedToId,
        isRecurring: false, // Child tasks are not recurring themselves
        recurringPattern: RecurringPattern.NONE,
        parentTaskId: task.id
      };
      
      const newTask = await this.createTask(newTaskData);
      createdTasks.push(newTask);
      
      // Advance to the next occurrence
      switch (task.recurringPattern) {
        case RecurringPattern.DAILY:
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case RecurringPattern.WEEKLY:
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case RecurringPattern.MONTHLY:
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
    }
    
    return createdTasks;
  }
}

// Create a DatabaseStorage implementation for PostgreSQL
export class DatabaseStorage implements IStorage {
  db: any;
  sessionStore: any; // Express SessionStore

  constructor() {
    this.db = drizzle(client);
    this.sessionStore = new PostgresSessionStore({ 
      conObject: {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }, 
      createTableIfMissing: true 
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(user).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }
  
  async updateUserNotificationPreferences(userId: number, preferences: any): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user) return false;
      
      // Update notification preferences
      const updatedPreferences = {
        ...user.notificationPreferences,
        ...preferences
      };
      
      // Update the user in the database
      const result = await this.db.update(users)
        .set({ notificationPreferences: updatedPreferences })
        .where(eq(users.id, userId))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Error updating user notification preferences:', error);
      return false;
    }
  }

  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    const result = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0];
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await this.db.insert(tasks).values({
      ...task,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateTask(id: number, task: UpdateTask): Promise<Task | undefined> {
    const result = await this.db.update(tasks)
      .set(task)
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await this.db.delete(tasks).where(eq(tasks.id, id));
    return !!result;
  }

  async getAllTasks(): Promise<Task[]> {
    return await this.db.select().from(tasks);
  }

  async getTasksByAssignee(userId: number): Promise<Task[]> {
    return await this.db.select().from(tasks).where(eq(tasks.assignedToId, userId));
  }

  async getTasksByCreator(userId: number): Promise<Task[]> {
    return await this.db.select().from(tasks).where(eq(tasks.createdById, userId));
  }

  async getOverdueTasks(userId: number): Promise<Task[]> {
    const now = new Date();
    return await this.db.select().from(tasks)
      .where(
        and(
          or(
            eq(tasks.assignedToId, userId),
            eq(tasks.createdById, userId)
          ),
          lt(tasks.dueDate, now)
        )
      );
  }

  async searchTasks(query: string, filters?: TaskFilters): Promise<Task[]> {
    // Implementation would use more complex SQL for filtering
    // This is a simplified version
    const allTasks = await this.getAllTasks();
    
    let filteredTasks = allTasks;
    
    // Apply text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      filteredTasks = filteredTasks.filter(
        task => 
          task.title.toLowerCase().includes(lowerQuery) || 
          (task.description && task.description.toLowerCase().includes(lowerQuery))
      );
    }
    
    // Apply filters if provided
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        filteredTasks = filteredTasks.filter(task => filters.status!.includes(task.status));
      }
      
      if (filters.priority && filters.priority.length > 0) {
        filteredTasks = filteredTasks.filter(task => filters.priority!.includes(task.priority));
      }
      
      if (filters.dueDate) {
        const filterDate = new Date(filters.dueDate);
        filteredTasks = filteredTasks.filter(task => 
          task.dueDate && 
          new Date(task.dueDate).toDateString() === filterDate.toDateString()
        );
      }
      
      if (filters.assignedToId !== undefined) {
        filteredTasks = filteredTasks.filter(task => task.assignedToId === filters.assignedToId);
      }
      
      if (filters.createdById !== undefined) {
        filteredTasks = filteredTasks.filter(task => task.createdById === filters.createdById);
      }
    }
    
    return filteredTasks;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await this.db.insert(notifications).values({
      ...notification,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return await this.db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await this.db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
    return !!result;
  }

  // Audit log operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await this.db.insert(auditLogs).values({
      ...log,
      timestamp: new Date()
    }).returning();
    return result[0];
  }

  async getAuditLogs(entityType?: string, entityId?: number, userId?: number): Promise<AuditLog[]> {
    let query = this.db.select().from(auditLogs);
    
    // Build query with filters
    if (entityType) {
      query = query.where(eq(auditLogs.entityType, entityType));
    }
    
    if (entityId) {
      query = query.where(eq(auditLogs.entityId, entityId));
    }
    
    if (userId) {
      query = query.where(eq(auditLogs.userId, userId));
    }
    
    // Sort by timestamp, most recent first
    return await query.orderBy(desc(auditLogs.timestamp));
  }

  // Recurring task operations
  async createRecurringTaskInstances(task: Task): Promise<Task[]> {
    // Only create recurring instances for tasks that are set as recurring
    if (!task.isRecurring || task.recurringPattern === RecurringPattern.NONE) {
      return [];
    }
    
    const recurringEndDate = task.recurringEndDate || null;
    if (!task.dueDate || (recurringEndDate && new Date(task.dueDate) > new Date(recurringEndDate))) {
      return [];
    }
    
    const createdTasks: Task[] = [];
    const startDate = new Date(task.dueDate);
    const endDate = recurringEndDate ? new Date(recurringEndDate) : new Date(startDate.getTime() + (90 * 24 * 60 * 60 * 1000)); // Default to 90 days
    
    let currentDate = new Date(startDate);
    
    // Advance to the next occurrence
    switch (task.recurringPattern) {
      case RecurringPattern.DAILY:
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case RecurringPattern.WEEKLY:
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case RecurringPattern.MONTHLY:
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
    }
    
    // Create recurring instances until end date
    while (currentDate <= endDate) {
      const newTaskData: InsertTask = {
        title: task.title,
        description: task.description,
        status: "not_started", // Always start as not started
        priority: task.priority,
        dueDate: new Date(currentDate),
        createdById: task.createdById,
        assignedToId: task.assignedToId,
        isRecurring: false, // Child tasks are not recurring themselves
        recurringPattern: RecurringPattern.NONE,
        parentTaskId: task.id
      };
      
      const newTask = await this.createTask(newTaskData);
      createdTasks.push(newTask);
      
      // Advance to the next occurrence
      switch (task.recurringPattern) {
        case RecurringPattern.DAILY:
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case RecurringPattern.WEEKLY:
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case RecurringPattern.MONTHLY:
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
    }
    
    return createdTasks;
  }
}

// Choose the storage implementation based on environment
// For this project, we'll use the in-memory storage to keep things simple
export const storage = new MemStorage();

// To use the database storage, uncomment the following line:
// export const storage = new DatabaseStorage();
