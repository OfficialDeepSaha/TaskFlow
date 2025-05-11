import { storage } from "./storage";
import { AuditEntity, AuditAction } from "../shared/schema";

/**
 * Helper module for working with user activity data from audit logs
 */
export const activityHelper = {
  /**
   * Get recent activity data for the dashboard
   * 
   * @param limit - Maximum number of activities to return
   * @returns Array of formatted activity data
   */
  async getRecentActivities(limit = 10) {
    try {
      // Get all audit logs, sorted by timestamp descending
      const allLogs = await storage.getAuditLogs();
      
      // Sort logs by timestamp (newest first)
      const sortedLogs = allLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Take only the most recent logs based on limit
      const recentLogs = sortedLogs.slice(0, limit);
      
      // Format the logs with user information
      const formattedActivities = await Promise.all(
        recentLogs.map(async (log) => {
          // Get user info for the activity
          const user = await storage.getUser(log.userId);
          const userName = user ? user.name : 'Unknown User';
          const userAvatar = user?.avatar || null;
          
          // Format the activity message based on entity type and action
          let activity = {
            id: log.id,
            timestamp: log.timestamp,
            userId: log.userId,
            userName,
            userAvatar,
            entityId: log.entityId,
            entityType: log.entityType,
            action: log.action,
            message: '',
            details: log.details || {}
          };
          
          // Format message based on entity type and action
          if (log.entityType === AuditEntity.TASK) {
            // Get task info if it's a task-related activity
            const taskTitle = (log.details as any)?.taskTitle || 'a task';
            
            switch (log.action) {
              case AuditAction.CREATED:
                activity.message = `${userName} created task "${taskTitle}"`;
                break;
              case AuditAction.UPDATED:
                activity.message = `${userName} updated task "${taskTitle}"`;
                break;
              case AuditAction.DELETED:
                activity.message = `${userName} deleted task "${taskTitle}"`;
                break;
              case AuditAction.ASSIGNED:
                // Get assignee name
                const assigneeId = (log.details as any)?.assignedToId;
                let assigneeName = 'someone';
                if (assigneeId) {
                  const assignee = await storage.getUser(assigneeId);
                  assigneeName = assignee ? assignee.name : 'another user';
                }
                activity.message = `${userName} assigned task "${taskTitle}" to ${assigneeName}`;
                break;
              case AuditAction.STATUS_CHANGED:
                const newStatus = (log.details as any)?.newStatus || 'unknown status';
                const formattedStatus = newStatus.replace('_', ' ');
                activity.message = `${userName} changed task "${taskTitle}" status to ${formattedStatus}`;
                break;
              case AuditAction.COMPLETED:
                activity.message = `${userName} completed task "${taskTitle}"`;
                break;
              default:
                activity.message = `${userName} performed an action on task "${taskTitle}"`;
            }
          } else if (log.entityType === AuditEntity.USER) {
            // User-related activities
            const targetUserName = (log.details as any)?.userName || 'a user';
            
            switch (log.action) {
              case AuditAction.CREATED:
                activity.message = `${userName} added a new user "${targetUserName}"`;
                break;
              case AuditAction.UPDATED:
                activity.message = `${userName} updated user "${targetUserName}"`;
                break;
              default:
                activity.message = `${userName} performed an action related to user "${targetUserName}"`;
            }
          } else {
            // Generic message for other entity types
            activity.message = `${userName} performed an action: ${log.action}`;
          }
          
          return activity;
        })
      );
      
      return formattedActivities;
    } catch (error) {
      console.error("Error getting recent activities:", error);
      return [];
    }
  }
};
