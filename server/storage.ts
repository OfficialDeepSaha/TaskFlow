import { users, tasks, notifications, type User, type InsertUser, type Task, type InsertTask, type UpdateTask, type Notification, type InsertNotification } from "@shared/schema";
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
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<boolean>;
  
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
  private userCurrentId: number;
  private taskCurrentId: number;
  private notificationCurrentId: number;
  sessionStore: any; // Express SessionStore

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.notifications = new Map();
    this.userCurrentId = 1;
    this.taskCurrentId = 1;
    this.notificationCurrentId = 1;
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
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
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
}

// Choose the storage implementation based on environment
// For this project, we'll use the in-memory storage to keep things simple
export const storage = new MemStorage();

// To use the database storage, uncomment the following line:
// export const storage = new DatabaseStorage();
