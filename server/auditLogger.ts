import { storage } from "./storage";
import { AuditAction, AuditEntity, insertAuditLogSchema } from "../shared/schema";

/**
 * Utility to log audit events for tracking user actions
 */
export const auditLogger = {
  /**
   * Log an audit event
   * @param entityId - ID of the entity being modified
   * @param entityType - Type of entity (task, user, etc)
   * @param action - Action performed (create, update, delete)
   * @param userId - User who performed the action
   * @param details - Additional details about the change
   */
  async log(
    entityId: number,
    entityType: AuditEntity,
    action: AuditAction,
    userId: number,
    details?: any
  ) {
    try {
      const auditLog = {
        entityId,
        entityType,
        action,
        userId,
        details: details || {},
      };
      
      console.log(`[AUDIT] Logging ${action} on ${entityType} #${entityId} by user #${userId}`);
      
      // Insert audit log into database
      await storage.createAuditLog(auditLog);
      
      return true;
    } catch (error) {
      console.error("[AUDIT] Failed to log audit event:", error);
      return false;
    }
  },
  
  /**
   * Helper for logging task creation
   */
  async logTaskCreated(taskId: number, userId: number, taskData: any) {
    return this.log(
      taskId,
      AuditEntity.TASK,
      AuditAction.CREATED,
      userId,
      {
        taskTitle: taskData.title,
        isRecurring: taskData.isRecurring,
        assignedToId: taskData.assignedToId,
      }
    );
  },
  
  /**
   * Helper for logging task updates
   */
  async logTaskUpdated(taskId: number, userId: number, changes: any, originalTask: any) {
    return this.log(
      taskId,
      AuditEntity.TASK,
      AuditAction.UPDATED,
      userId,
      {
        taskTitle: originalTask.title,
        changes: changes,
      }
    );
  },
  
  /**
   * Helper for logging task assignment
   */
  async logTaskAssigned(taskId: number, userId: number, assigneeId: number, taskTitle: string) {
    return this.log(
      taskId,
      AuditEntity.TASK,
      AuditAction.ASSIGNED,
      userId,
      {
        taskTitle,
        assignedToId: assigneeId,
      }
    );
  },
  
  /**
   * Helper for logging task status changes
   */
  async logTaskStatusChanged(taskId: number, userId: number, oldStatus: string, newStatus: string, taskTitle: string) {
    return this.log(
      taskId,
      AuditEntity.TASK,
      AuditAction.STATUS_CHANGED,
      userId,
      {
        taskTitle,
        oldStatus,
        newStatus,
      }
    );
  },
  
  /**
   * Helper for logging task completion
   */
  async logTaskCompleted(taskId: number, userId: number, taskTitle: string) {
    return this.log(
      taskId,
      AuditEntity.TASK,
      AuditAction.COMPLETED,
      userId,
      {
        taskTitle,
      }
    );
  },
  
  /**
   * Helper for logging task deletion
   */
  async logTaskDeleted(taskId: number, userId: number, taskTitle: string) {
    return this.log(
      taskId,
      AuditEntity.TASK,
      AuditAction.DELETED,
      userId,
      {
        taskTitle,
      }
    );
  },
};
