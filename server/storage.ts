import {
  users, tasks, notifications, auditLogs, taskMoodReactions,
  type User, type InsertUser, 
  type Task, type InsertTask, type UpdateTask, 
  type Notification, type InsertNotification,
  type AuditLog, type InsertAuditLog,
  type TaskMoodReaction, type InsertTaskMoodReaction,
  AuditAction, AuditEntity, UserRole, RecurringPattern, TaskStatus, NotificationChannel, TaskColor, TaskMoodType
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, or, lt, desc, isNotNull, ne, sql } from "drizzle-orm";
// Use dynamic import with await for ESM compatibility
import postgres from "postgres";
// If you encounter issues with the import above, you can use:
// const postgres = (await import('postgres')).default;

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Set up database connection for PostgreSQL
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString || "", { ssl: 'require' });

// Define the interface for storage operations
export interface IStorage {
  // Session store for auth
  sessionStore: any;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: string | number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string | number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string | number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getUserNotificationPreferences(userId: number): Promise<any[]>;
  saveUserNotificationPreferences(userId: number, preferences: any[]): Promise<boolean>;
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
  getRecurringTasks(): Promise<Task[]>;
  createRecurringTaskInstances(task: Task): Promise<Task[]>;
  getAllOverdueTasks(): Promise<Task[]>; // Add method to get all overdue tasks regardless of user
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<boolean>;
  
  // Audit logging operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(entityType?: string, entityId?: number, userId?: number): Promise<AuditLog[]>;
  
  // Task mood reactions operations
  createTaskMoodReaction(moodReaction: InsertTaskMoodReaction): Promise<TaskMoodReaction>;
  getTaskMoodReactions(taskId: number): Promise<TaskMoodReaction[]>;
  getUserMoodReactions(userId: number): Promise<TaskMoodReaction[]>;
}

// Define the TaskFilters interface
export interface TaskFilters {
  status?: string[];
  priority?: string[];
  dueDate?: Date;
  assignedToId?: number;
  createdById?: number;
}

// Database storage class implementation
class DatabaseStorage implements IStorage {
  // Database connection
  private db = drizzle(client);
  
  // Add session store for authentication
  sessionStore = new PostgresSessionStore({
    conObject: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    },
  });
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      // Try to get user with standard fields first
      // Just get the basic user fields we know exist
      const results = await this.db.select({
        id: users.id,
        username: users.username,
        name: users.name,
        password: users.password,
        role: users.role,
        lastActive: users.lastActive,
        avatar: users.avatar,
        notificationPreferences: users.notificationPreferences,
        email: users.email
      }).from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      if (results.length === 0) {
        return undefined;
      }
      
      // Create a properly typed user object with default isActive value
      const user = {
        ...results[0],
        isActive: true // Default to active
      };
      
      return user as User;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }
  
  async getUserById(id: string | number): Promise<User | undefined> {
    return this.getUser(Number(id));
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const results = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    try {
      return await this.db.select().from(users);
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }
  
  async createUser(user: InsertUser): Promise<User> {
    try {
      const result = await this.db.insert(users).values(user).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  async updateUser(id: string | number, userData: Partial<User>): Promise<User | undefined> {
    const userId = Number(id);
    try {
      // First, get the user to make sure they exist
      const user = await this.getUser(userId);
      if (!user) return undefined;
      
      // Remove id from userData to prevent id updates
      const { id: _, ...updateData } = userData as any;
      
      // Update the user in the database
      await this.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId));
      
      // Create audit log for the update
      await this.createAuditLog({
        action: AuditAction.UPDATED,
        entityType: AuditEntity.USER,
        entityId: userId,
        userId: userId,
        details: JSON.stringify({ updated: Object.keys(updateData) })
      });
      
      // Get the updated user
      return this.getUser(userId);
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }
  
  async deleteUser(id: string | number): Promise<boolean> {
    const userId = Number(id);
    try {
      // First, get the user to make sure they exist
      const user = await this.getUser(userId);
      if (!user) return false;
      
      // Delete the user from the database
      await this.db
        .delete(users)
        .where(eq(users.id, userId));
      
      // Create audit log for the deletion
      await this.createAuditLog({
        action: AuditAction.DELETED,
        entityType: AuditEntity.USER,
        entityId: userId,
        userId: userId,
        details: JSON.stringify({ deleted: true })
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    try {
      // Validate ID to prevent NaN errors
      if (!id || isNaN(id) || id <= 0) {
        console.error(`Invalid task ID: ${id}`);
        return undefined;
      }

      // Ensure ID is an integer
      const taskId = Math.floor(Number(id));
      const results = await this.db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error('Error getting task:', error);
      return undefined;
    }
  }
  
  async getAllTasks(): Promise<Task[]> {
    try {
      console.log('Executing getAllTasks database query...');
      const result = await this.db.select().from(tasks);
      console.log(`getAllTasks query successful, retrieved ${result.length} tasks`);
      return result;
    } catch (error) {
      console.error('Error getting all tasks:', error);
      return [];
    }
  }
  
  async getTasksByAssignee(userId: number): Promise<Task[]> {
    try {
      const result = await this.db.select().from(tasks);
      return result.filter(task => task.assignedToId === userId);
    } catch (error) {
      console.error('Error getting tasks by assignee:', error);
      return [];
    }
  }
  
  async getTasksByCreator(userId: number): Promise<Task[]> {
    try {
      const result = await this.db.select().from(tasks);
      return result.filter(task => task.createdById === userId);
    } catch (error) {
      console.error('Error getting tasks by creator:', error);
      return [];
    }
  }
  
  async getOverdueTasks(userId: number): Promise<Task[]> {
    try {
      // Validate userId
      if (!userId || isNaN(userId) || userId <= 0) {
        console.error(`Invalid user ID for overdue tasks: ${userId}`);
        return [];
      }

      const now = new Date();
      console.log(`Fetching overdue tasks for user ${userId}, current date: ${now.toISOString()}`);
      
      // Get tasks assigned to or created by this user
      const result = await this.db.select().from(tasks);
      
      // Filter for overdue and incomplete tasks
      const overdueTasks = result.filter(task => {
        // Skip tasks without due date
        if (!task.dueDate) return false;
        
        // Task must be assigned to or created by user
        const isRelevantToUser = 
          (task.assignedToId === userId || task.createdById === userId);
        if (!isRelevantToUser) return false;
        
        // Task must not be completed
        if (task.status === 'completed') return false;
        
        // Check if due date is in the past
        try {
          const dueDate = new Date(task.dueDate);
          return dueDate < now;
        } catch (err) {
          console.error(`Error parsing due date for task ${task.id}:`, err);
          return false;
        }
      });
      
      console.log(`Found ${overdueTasks.length} overdue tasks for user ${userId}`);
      return overdueTasks;
    } catch (error) {
      console.error('Error getting overdue tasks:', error);
      return [];
    }
  }
  
  /**
   * Get all overdue tasks across all users - for admin and manager roles
   */
  async getAllOverdueTasks(): Promise<Task[]> {
    try {
      const now = new Date();
      console.log(`Fetching all overdue tasks across all users, current date: ${now.toISOString()}`);
      
      // Get all tasks
      const result = await this.db.select().from(tasks);
      
      // Filter for all overdue and incomplete tasks regardless of user assignment
      const allOverdueTasks = result.filter(task => {
        // Skip tasks without due date
        if (!task.dueDate) return false;
        
        // Task must not be completed
        if (task.status === 'completed') return false;
        
        // Check if due date is in the past
        try {
          const dueDate = new Date(task.dueDate);
          return dueDate < now;
        } catch (err) {
          console.error(`Error parsing due date for task ${task.id}:`, err);
          return false;
        }
      });
      
      console.log(`Found ${allOverdueTasks.length} total overdue tasks across all users`);
      return allOverdueTasks;
    } catch (error) {
      console.error('Error getting all overdue tasks:', error);
      return [];
    }
  }
  
  async searchTasks(query: string, filters?: TaskFilters): Promise<Task[]> {
    try {
      // Get all tasks and filter in memory
      const allTasks = await this.db.select().from(tasks);
      
      let filteredTasks = [...allTasks];
      
      // Apply text search
      if (query) {
        const lowerQuery = query.toLowerCase();
        filteredTasks = filteredTasks.filter(
          task => 
            task.title.toLowerCase().includes(lowerQuery) || 
            (task.description && task.description.toLowerCase().includes(lowerQuery))
        );
      }
      
      // Apply additional filters if provided
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          filteredTasks = filteredTasks.filter(task => 
            filters.status!.includes(task.status)
          );
        }
        
        if (filters.priority && filters.priority.length > 0) {
          filteredTasks = filteredTasks.filter(task => 
            filters.priority!.includes(task.priority)
          );
        }
        
        if (filters.dueDate) {
          const dueDate = new Date(filters.dueDate);
          filteredTasks = filteredTasks.filter(task => 
            task.dueDate && new Date(task.dueDate) <= dueDate
          );
        }
        
        if (filters.assignedToId !== undefined) {
          filteredTasks = filteredTasks.filter(task => 
            task.assignedToId === filters.assignedToId
          );
        }
        
        if (filters.createdById !== undefined) {
          filteredTasks = filteredTasks.filter(task => 
            task.createdById === filters.createdById
          );
        }
      }
      
      return filteredTasks;
    } catch (error) {
      console.error('Error searching tasks:', error);
      return [];
    }
  }
  
  async getRecurringTasks(): Promise<Task[]> {
    try {
      const result = await this.db.select().from(tasks);
      return result.filter(task => 
        task.isRecurring && task.recurringPattern !== RecurringPattern.NONE
      );
    } catch (error) {
      console.error('Error getting recurring tasks:', error);
      return [];
    }
  }
  
  async createTask(task: InsertTask): Promise<Task> {
    try {
      const result = await this.db.insert(tasks).values(task).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }
  
  async updateTask(id: number, task: UpdateTask): Promise<Task | undefined> {
    try {
      await this.db.update(tasks)
        .set(task)
        .where(eq(tasks.id, id));
      return this.getTask(id);
    } catch (error) {
      console.error('Error updating task:', error);
      return undefined;
    }
  }
  
  async deleteTask(id: number): Promise<boolean> {
    try {
      await this.db.delete(tasks).where(eq(tasks.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  }
  
  async createRecurringTaskInstances(task: Task): Promise<Task[]> {
    if (!task.isRecurring || task.recurringPattern === RecurringPattern.NONE) {
      return [];
    }
    
    const recurringEndDate = task.recurringEndDate || null;
    if (!task.dueDate || (recurringEndDate && new Date(task.dueDate) > new Date(recurringEndDate))) {
      return [];
    }
    
    try {
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
          status: "not_started",
          priority: task.priority,
          dueDate: new Date(currentDate),
          createdById: task.createdById,
          assignedToId: task.assignedToId,
          isRecurring: false,
          recurringPattern: RecurringPattern.NONE,
          parentTaskId: task.id,
          colorCode: TaskColor.BLUE
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
    } catch (error) {
      console.error('Error creating recurring task instances:', error);
      return [];
    }
  }
  
  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const result = await this.db.insert(notifications).values(notification).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
  
  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    try {
      const results = await this.db.select().from(notifications);
      return results
        .filter(notification => notification.userId === userId)
        .sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    } catch (error) {
      console.error('Error getting notifications by user:', error);
      return [];
    }
  }
  
  async markNotificationAsRead(id: number): Promise<boolean> {
    try {
      await this.db.update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, id));
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }
  
  // Audit logging operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    try {
      const result = await this.db.insert(auditLogs).values(log).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  }
  
  async getAuditLogs(entityType?: string, entityId?: number, userId?: number): Promise<AuditLog[]> {
    try {
      const allLogs = await this.db.select().from(auditLogs);
      
      // Apply filters in memory
      return allLogs
        .filter(log => {
          let match = true;
          if (entityType) match = match && log.entityType === entityType;
          if (entityId) match = match && log.entityId === entityId;
          if (userId) match = match && log.userId === userId;
          return match;
        })
        .sort((a, b) => {
          // Use timestamp for audit logs since they have timestamp, not createdAt
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  }
  
  // Task mood reactions operations
  async createTaskMoodReaction(moodReaction: InsertTaskMoodReaction): Promise<TaskMoodReaction> {
    try {
      const result = await this.db.insert(taskMoodReactions).values(moodReaction).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating task mood reaction:', error);
      throw error;
    }
  }
  
  async getTaskMoodReactions(taskId: number): Promise<TaskMoodReaction[]> {
    try {
      const results = await this.db.select().from(taskMoodReactions);
      return results
        .filter(reaction => reaction.taskId === taskId)
        .sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    } catch (error) {
      console.error('Error getting task mood reactions:', error);
      return [];
    }
  }
  
  async getUserMoodReactions(userId: number): Promise<TaskMoodReaction[]> {
    try {
      const results = await this.db.select().from(taskMoodReactions);
      return results
        .filter(reaction => reaction.userId === userId)
        .sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    } catch (error) {
      console.error('Error getting user mood reactions:', error);
      return [];
    }
  }
  
  // User preferences operations
  async getUserNotificationPreferences(userId: number): Promise<any[]> {
    // Implementation would depend on your schema
    return [{ channel: NotificationChannel.EMAIL, enabled: true }];
  }
  
  async saveUserNotificationPreferences(userId: number, preferences: any[]): Promise<boolean> {
    // Implementation would depend on your schema
    return true;
  }
  
  async updateUserNotificationPreferences(userId: number, preferences: any): Promise<boolean> {
    // Implementation would depend on your schema
    return true;
  }
}

// Create an instance of DatabaseStorage
const dbStorage = new DatabaseStorage();

// Export the storage instance
export const storage: IStorage = dbStorage;

// Export enums for use in other files
export { AuditAction, AuditEntity, UserRole, RecurringPattern, TaskStatus, NotificationChannel, TaskColor, TaskMoodType };
