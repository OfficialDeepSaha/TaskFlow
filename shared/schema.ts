import { pgTable, text, serial, integer, boolean, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User role options
export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager",
  USER = "user",
}

// Create the enum in the database
export const roleEnum = pgEnum('user_role', ['admin', 'manager', 'user']);

// Notification channel preferences
export enum NotificationChannel {
  IN_APP = "in_app",
  EMAIL = "email"
}

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default(UserRole.USER),
  lastActive: timestamp("last_active"),
  avatar: text("avatar"),
  
  // Notification preferences
  notificationPreferences: json("notification_preferences").$type<{
    channels: NotificationChannel[];
    taskAssignment: boolean;
    taskStatusUpdate: boolean;
    taskCompletion: boolean;
    taskDueSoon: boolean;
    systemUpdates: boolean;
  }>(),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true), // Add isActive field defaulting to true
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  name: true,
  password: true,
  role: true,
  email: true,
  notificationPreferences: true,
  isActive: true,
}).extend({
  role: z.nativeEnum(UserRole).optional().default(UserRole.USER),
  email: z.string().email().optional(),
  isActive: z.boolean().optional().default(true),
  notificationPreferences: z
    .object({
      channels: z.array(z.nativeEnum(NotificationChannel)).optional().default([NotificationChannel.IN_APP]),
      taskAssignment: z.boolean().optional().default(true),
      taskStatusUpdate: z.boolean().optional().default(true),
      taskCompletion: z.boolean().optional().default(true),
      taskDueSoon: z.boolean().optional().default(true),
      systemUpdates: z.boolean().optional().default(true),
    })
    .optional()
    .default({
      channels: [NotificationChannel.IN_APP],
      taskAssignment: true,
      taskStatusUpdate: true,
      taskCompletion: true,
      taskDueSoon: true,
      systemUpdates: true,
    }),
});

// Task priority options
export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high"
}

// Task status options
export enum TaskStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed"
}

// Recurring patterns for tasks
export enum RecurringPattern {
  NONE = "none",
  DAILY = "daily", 
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

// Emoji reaction types for task mood tracking
export enum TaskMoodType {
  HAPPY = "happy",
  EXCITED = "excited",
  NEUTRAL = "neutral",
  WORRIED = "worried",
  STRESSED = "stressed",
  CONFUSED = "confused",
}

// Available colors for task color coding
export enum TaskColor {
  DEFAULT = "default",
  RED = "red",
  ORANGE = "orange",
  YELLOW = "yellow",
  GREEN = "green",
  BLUE = "blue",
  PURPLE = "purple",
  PINK = "pink",
}

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default(TaskStatus.NOT_STARTED),
  priority: text("priority").notNull().default(TaskPriority.MEDIUM),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  assignedToId: integer("assigned_to_id").references(() => users.id),
  // Recurring task properties
  isRecurring: boolean("is_recurring").default(false).notNull(),
  recurringPattern: text("recurring_pattern").default(RecurringPattern.NONE),
  recurringEndDate: timestamp("recurring_end_date"),
  parentTaskId: integer("parent_task_id"),
  // Color coding for visual prioritization
  colorCode: text("color_code").default(TaskColor.DEFAULT),
});

export const insertTaskSchema = createInsertSchema(tasks)
  .omit({ id: true, createdAt: true })
  .extend({
    dueDate: z.coerce.date().optional(),
    recurringEndDate: z.coerce.date().optional(),
    recurringPattern: z.nativeEnum(RecurringPattern).optional().default(RecurringPattern.NONE),
    isRecurring: z.boolean().optional().default(false),
    colorCode: z.nativeEnum(TaskColor).optional().default(TaskColor.DEFAULT),
  });

export const updateTaskSchema = createInsertSchema(tasks)
  .omit({ id: true, createdAt: true, createdById: true })
  .extend({
    dueDate: z.coerce.date().optional(),
    recurringEndDate: z.coerce.date().optional(),
  })
  .partial();

// Action types for audit logs
export enum AuditAction {
  CREATED = "created",
  UPDATED = "updated",
  DELETED = "deleted",
  ASSIGNED = "assigned",
  COMPLETED = "completed",
  STATUS_CHANGED = "status_changed",
}

// Entity types that can be audited
export enum AuditEntity {
  TASK = "task",
  USER = "user",
  NOTIFICATION = "notification",
}

// Audit logs table for tracking all actions
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").notNull(), // ID of the entity being modified
  entityType: text("entity_type").notNull(), // Type of entity (task, user, etc)
  action: text("action").notNull(), // Action performed (create, update, delete)
  userId: integer("user_id").notNull().references(() => users.id), // User who performed the action
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  details: json("details"), // Additional details about the change
});

export const insertAuditLogSchema = createInsertSchema(auditLogs)
  .omit({ id: true, timestamp: true });

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  taskId: integer("task_id").references(() => tasks.id),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Task mood reactions for collaborative mood tracking
export const taskMoodReactions = pgTable("task_mood_reactions", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  userId: integer("user_id").notNull().references(() => users.id),
  mood: text("mood").notNull(), // The mood emoji/reaction name
  comment: text("comment"), // Optional comment explaining the mood
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskMoodReactionSchema = createInsertSchema(taskMoodReactions).omit({
  id: true,
  createdAt: true,
});

// Define the table types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type TaskMoodReaction = typeof taskMoodReactions.$inferSelect;
export type InsertTaskMoodReaction = z.infer<typeof insertTaskMoodReactionSchema>;
