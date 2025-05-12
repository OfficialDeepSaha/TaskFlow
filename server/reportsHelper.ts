import { storage } from './storage';
import { Task, TaskStatus, User, AuditLog, AuditAction } from '@shared/schema';
import { format, parseISO, subDays, startOfDay, endOfDay, differenceInHours, differenceInDays } from 'date-fns';

// Define interfaces for report data types
interface UserPerformance {
  name: string;
  userId: number;
  tasksCompleted: number;
  tasksAssigned: number;
  onTimeRate: number;
  avgTimePerTask: number;
  tasksCreated: number;
}

interface UserActivity {
  id: number;
  user: string;
  userId: number;
  date: string;
  time: string;
  action: string;
  task: string;
  taskId: number | null;
  details: string;
}

/**
 * Reports helper functions for generating detailed user performance and activity reports
 */
export const reportsHelper = {
  /**
   * Get detailed user performance data for reporting
   * @param timeRange The time range to filter data (today, yesterday, 7days, 30days, 90days, year)
   */
  async getUserPerformanceReport(timeRange: string): Promise<any[]> {
    // Get all users and tasks from the database
    const users = await (storage as any).getAllUsers();
    const allTasks = await (storage as any).getAllTasks();
    
    // Filter tasks based on the time range
    const filteredTasks = this.filterTasksByTimeRange(allTasks, timeRange);
    
    // Get all audit logs to calculate completion times accurately
    const auditLogs = await (storage as any).getAuditLogs();
    
    return users
      .filter((user: User) => user.isActive !== false) // Only include active users
      .map((user: User) => {
        const userId = String(user.id);
        
        // Get all tasks assigned to this user in the selected time range
        const userTasks = filteredTasks.filter((task: Task) => 
          task.assignedToId !== undefined && String(task.assignedToId) === userId
        );
        
        // Get tasks created by this user
        const tasksCreated = filteredTasks.filter((task: Task) => 
          String(task.createdById) === userId
        ).length;
        
        // Tasks completed by this user in the time range
        const tasksCompleted = userTasks.filter((task: Task) => 
          String(task.status).toUpperCase() === 'COMPLETED'
        ).length;
        
        // Calculate on-time completion rate
        let onTimeCount = 0;
        let totalWithDueDate = 0;
        
        userTasks.forEach((task: Task) => {
          if (task.dueDate && String(task.status).toUpperCase() === 'COMPLETED') {
            totalWithDueDate++;
            
            // Find completion timestamp from audit logs
            const completionLog = auditLogs.find((log: AuditLog) => 
              log.entityId === task.id && 
              log.entityType === 'task' && 
              log.action === AuditAction.COMPLETED
            );
            
            const completionDate = completionLog 
              ? new Date(completionLog.timestamp) 
              : new Date(); // Default to now if not found
            
            // Check if completed on or before due date
            if (completionDate <= new Date(task.dueDate)) {
              onTimeCount++;
            }
          }
        });
        
        // Calculate on-time rate
        const onTimeRate = totalWithDueDate > 0 
          ? Math.round((onTimeCount / totalWithDueDate) * 100) 
          : 100; // If no tasks with due dates, assume 100% on time
        
        // Calculate average time per completed task
        let totalCompletionTime = 0;
        let completedTasksWithTimes = 0;
        
        userTasks.forEach((task: Task) => {
          if (String(task.status).toUpperCase() === 'COMPLETED') {
            // Find task creation and completion times from audit logs
            const creationLog = auditLogs.find((log: AuditLog) => 
              log.entityId === task.id && 
              log.entityType === 'task' && 
              log.action === AuditAction.CREATED
            );
            
            const completionLog = auditLogs.find((log: AuditLog) => 
              log.entityId === task.id && 
              log.entityType === 'task' && 
              log.action === AuditAction.COMPLETED
            );
            
            if (creationLog && completionLog) {
              const creationTime = new Date(creationLog.timestamp);
              const completionTime = new Date(completionLog.timestamp);
              
              // Calculate hours between creation and completion
              const hoursToComplete = differenceInHours(completionTime, creationTime);
              totalCompletionTime += hoursToComplete;
              completedTasksWithTimes++;
            }
          }
        });
        
        // Average time per task in hours, rounded to 1 decimal place
        const avgTimePerTask = completedTasksWithTimes > 0 
          ? Math.round((totalCompletionTime / completedTasksWithTimes) * 10) / 10 
          : 0;
        
        return {
          name: user.name,
          userId: user.id,
          tasksCompleted,
          tasksAssigned: userTasks.length,
          onTimeRate,
          avgTimePerTask,
          tasksCreated
        };
      })
      .sort((a: UserPerformance, b: UserPerformance) => b.tasksCompleted - a.tasksCompleted); // Sort by most tasks completed
  },
  
  /**
   * Get detailed user activity data for reporting
   * @param timeRange The time range to filter data (today, yesterday, 7days, 30days, 90days, year)
   */
  async getUserActivityReport(timeRange: string): Promise<any[]> {
    // Get all audit logs from the database
    const auditLogs = await (storage as any).getAuditLogs();
    
    // Get all users and tasks for reference
    const users = await (storage as any).getAllUsers();
    const tasks = await (storage as any).getAllTasks();
    
    // Create a user lookup map
    const userMap = new Map();
    users.forEach((user: User) => {
      userMap.set(String(user.id), user.name);
    });
    
    // Create a task lookup map
    const taskMap = new Map();
    tasks.forEach((task: Task) => {
      taskMap.set(String(task.id), task.title);
    });
    
    // Filter logs based on time range
    const filteredLogs = this.filterAuditLogsByTimeRange(auditLogs, timeRange);
    
    // Convert logs to activity records
    return filteredLogs.map((log: AuditLog) => {
      // Map user ID to name
      const userName = userMap.get(String(log.userId)) || `User #${log.userId}`;
      
      // Map entity ID to name for tasks
      let taskName = '';
      if (log.entityType === 'task') {
        taskName = taskMap.get(String(log.entityId)) || `Task #${log.entityId}`;
      }
      
      // Format the timestamp
      const timestamp = new Date(log.timestamp);
      const date = format(timestamp, 'yyyy-MM-dd');
      const time = format(timestamp, 'HH:mm');
      
      // Format the action for better readability
      let action = log.action;
      if (action === AuditAction.STATUS_CHANGED) {
        action = 'updated status';
      }
      
      // Parse details for additional information
      let details = '';
      if (log.details) {
        try {
          const detailsObj = typeof log.details === 'string' 
            ? JSON.parse(log.details) 
            : log.details;
          
          if (log.action === AuditAction.STATUS_CHANGED && detailsObj.newStatus) {
            details = `Changed to ${detailsObj.newStatus}`;
          } else if (log.action === AuditAction.ASSIGNED && detailsObj.assignedTo) {
            const assigneeName = userMap.get(String(detailsObj.assignedTo)) || `User #${detailsObj.assignedTo}`;
            details = `Assigned to ${assigneeName}`;
          } else if (log.action === AuditAction.UPDATED && detailsObj.updated) {
            details = `Updated ${Array.isArray(detailsObj.updated) ? detailsObj.updated.join(', ') : detailsObj.updated}`;
          }
        } catch (e) {
          // If details parsing fails, use a default message
          details = 'Action details not available';
        }
      }
      
      return {
        id: log.id,
        user: userName,
        userId: log.userId,
        date,
        time,
        action,
        task: taskName,
        taskId: log.entityType === 'task' ? log.entityId : null,
        details
      };
    })
    .sort((a, b) => {
      // Sort by date and time descending (newest first)
      const dateA = `${a.date} ${a.time}`;
      const dateB = `${b.date} ${b.time}`;
      return dateB.localeCompare(dateA);
    });
  },
  
  /**
   * Filter tasks based on a specified time range
   */
  filterTasksByTimeRange(tasks: Task[], timeRange: string): Task[] {
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'yesterday':
        startDate = startOfDay(subDays(now, 1));
        break;
      case '7days':
        startDate = subDays(now, 7);
        break;
      case '30days':
        startDate = subDays(now, 30);
        break;
      case '90days':
        startDate = subDays(now, 90);
        break;
      case 'year':
        startDate = subDays(now, 365);
        break;
      default:
        startDate = subDays(now, 7); // Default to 7 days
    }
    
    return tasks.filter((task: Task) => {
      // Use createdAt as the reference date
      const taskDate = task.createdAt ? new Date(task.createdAt) : null;
      return taskDate && taskDate >= startDate && taskDate <= now;
    });
  },
  
  /**
   * Filter audit logs based on a specified time range
   */
  filterAuditLogsByTimeRange(logs: AuditLog[], timeRange: string): AuditLog[] {
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'yesterday':
        startDate = startOfDay(subDays(now, 1));
        break;
      case '7days':
        startDate = subDays(now, 7);
        break;
      case '30days':
        startDate = subDays(now, 30);
        break;
      case '90days':
        startDate = subDays(now, 90);
        break;
      case 'year':
        startDate = subDays(now, 365);
        break;
      default:
        startDate = subDays(now, 7); // Default to 7 days
    }
    
    return logs.filter((log: AuditLog) => {
      const logDate = log.timestamp ? new Date(log.timestamp) : null;
      return logDate && logDate >= startDate && logDate <= now;
    });
  }
};
