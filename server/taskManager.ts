import { storage } from "./storage";
import { auditLogger } from "./auditLogger";
import { recurringTaskHelper } from "./recurringTaskHelper";
import { 
  Task, InsertTask, UpdateTask, RecurringPattern, 
  AuditAction, AuditEntity, TaskStatus 
} from "../shared/schema";

/**
 * Task Manager - handles tasks with audit logging and recurring functionality
 */
export const taskManager = {
  /**
   * Create a new task with audit logging
   * @param task Task data to create
   * @param userId User ID who is creating the task
   * @returns Created task
   */
  async createTask(task: InsertTask, userId: number): Promise<Task> {
    // Create the task in storage
    const newTask = await storage.createTask(task);
    
    // Log the task creation in audit logs
    await auditLogger.logTaskCreated(
      newTask.id,
      userId,
      {
        title: newTask.title,
        isRecurring: newTask.isRecurring,
        assignedToId: newTask.assignedToId
      }
    );
    
    // If it's a recurring task, handle recurring functionality
    if (newTask.isRecurring && newTask.recurringPattern !== RecurringPattern.NONE) {
      // Schedule next recurring instance if needed
      await recurringTaskHelper.scheduleNextInstance(newTask);
    }
    
    return newTask;
  },
  
  /**
   * Update a task with audit logging
   * @param taskId Task ID to update
   * @param updateData Update data
   * @param userId User ID performing the update
   * @returns Updated task
   */
  async updateTask(taskId: number, updateData: UpdateTask, userId: number): Promise<Task | null> {
    // Get the original task for comparison
    const originalTask = await storage.getTask(taskId);
    if (!originalTask) {
      return null;
    }
    
    // Update the task
    const updatedTask = await storage.updateTask(taskId, updateData);
    if (!updatedTask) {
      return null;
    }
    
    // Determine what kind of changes occurred for audit logging
    const changes: any = {};
    const auditAction = this.determineAuditAction(originalTask, updatedTask, updateData, changes);
    
    // Log the specific audit action
    if (auditAction === AuditAction.ASSIGNED && updateData.assignedToId !== undefined) {
      // Ensure assignedToId is a number (not null) for the audit logger
      const assigneeId = typeof updateData.assignedToId === 'number' ? updateData.assignedToId : 0;
      await auditLogger.logTaskAssigned(
        taskId,
        userId,
        assigneeId,
        updatedTask.title
      );
    } else if (auditAction === AuditAction.STATUS_CHANGED && updateData.status) {
      await auditLogger.logTaskStatusChanged(
        taskId,
        userId,
        originalTask.status,
        updateData.status,
        updatedTask.title
      );
    } else if (auditAction === AuditAction.COMPLETED) {
      await auditLogger.logTaskCompleted(
        taskId,
        userId,
        updatedTask.title
      );
    } else {
      // Generic update
      await auditLogger.logTaskUpdated(
        taskId,
        userId,
        changes,
        originalTask
      );
    }
    
    // Handle recurring task changes
    if (updatedTask.isRecurring && 
        (updateData.isRecurring !== undefined || 
         updateData.recurringPattern !== undefined || 
         updateData.dueDate !== undefined)) {
      // If recurring options changed, reschedule
      await recurringTaskHelper.scheduleNextInstance(updatedTask);
    }
    
    return updatedTask;
  },
  
  /**
   * Delete a task with audit logging
   * @param taskId Task ID to delete
   * @param userId User ID performing the deletion
   * @returns Success indicator
   */
  async deleteTask(taskId: number, userId: number): Promise<boolean> {
    // Get the task before deletion for audit info
    const task = await storage.getTask(taskId);
    if (!task) {
      return false;
    }
    
    // Delete the task
    const success = await storage.deleteTask(taskId);
    
    if (success) {
      // Log the deletion
      await auditLogger.logTaskDeleted(
        taskId,
        userId,
        task.title
      );
    }
    
    return success;
  },
  
  /**
   * Process recurring tasks that need scheduling
   * This should be called regularly
   */
  async processRecurringTasks(): Promise<void> {
    await recurringTaskHelper.processRecurringTasks();
  },
  
  /**
   * Determine what kind of audit action occurred based on the changes
   * @private
   */
  determineAuditAction(
    originalTask: Task, 
    updatedTask: Task,
    updateData: UpdateTask,
    changes: any
  ): AuditAction {
    // Track what changed for audit logging
    if (updateData.title !== undefined && originalTask.title !== updateData.title) {
      changes.title = { from: originalTask.title, to: updateData.title };
    }
    
    if (updateData.description !== undefined && originalTask.description !== updateData.description) {
      changes.description = { from: originalTask.description, to: updateData.description };
    }
    
    if (updateData.priority !== undefined && originalTask.priority !== updateData.priority) {
      changes.priority = { from: originalTask.priority, to: updateData.priority };
    }
    
    if (updateData.dueDate !== undefined) {
      const oldDate = originalTask.dueDate ? new Date(originalTask.dueDate).toISOString() : null;
      const newDate = updateData.dueDate ? new Date(updateData.dueDate).toISOString() : null;
      
      if (oldDate !== newDate) {
        changes.dueDate = { from: oldDate, to: newDate };
      }
    }
    
    if (updateData.assignedToId !== undefined && originalTask.assignedToId !== updateData.assignedToId) {
      changes.assignedToId = { from: originalTask.assignedToId, to: updateData.assignedToId };
      return AuditAction.ASSIGNED;
    }
    
    if (updateData.status !== undefined && originalTask.status !== updateData.status) {
      changes.status = { from: originalTask.status, to: updateData.status };
      
      // If status changed to completed, use the COMPLETED action
      if (updateData.status === TaskStatus.COMPLETED) {
        return AuditAction.COMPLETED;
      }
      
      return AuditAction.STATUS_CHANGED;
    }
    
    // Default action is a general update
    return AuditAction.UPDATED;
  },
  
  /**
   * Get all recurring tasks
   * @returns Array of recurring tasks
   */
  async getRecurringTasks(): Promise<Task[]> {
    try {
      // Use the storage instance to get recurring tasks
      // We'll need to add this method to storage.ts
      const tasks = await storage.getAllTasks();
      return tasks.filter(task => task.isRecurring === true);
    } catch (error) {
      console.error("Error getting recurring tasks:", error);
      return [];
    }
  },
  
  /**
   * Get audit logs for a specific task
   * @param taskId Task ID
   * @returns Audit logs for the task
   */
  async getTaskAuditLogs(taskId: number): Promise<any[]> {
    try {
      return await storage.getAuditLogs(AuditEntity.TASK, taskId);
    } catch (error) {
      console.error(`Error getting audit logs for task ${taskId}:`, error);
      return [];
    }
  },
};
