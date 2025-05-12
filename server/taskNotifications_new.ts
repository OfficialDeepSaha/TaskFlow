import { Task, User, TaskStatus } from "../shared/schema";
import { notificationService } from "./notificationService";
import { storage } from "./storage";
import { WebSocketServer } from "ws";

// Define notification types
export type TaskNotificationType = 'task_assigned' | 'task_updated' | 'task_completed';

export interface TaskNotification {
  type: TaskNotificationType;
  taskId: number;
  taskTitle: string;
  message: string;
  timestamp: number;
}

// Helper to send task notifications via WebSocket
export function createTaskNotificationSystem(app: any, wss: WebSocketServer, clients: Map<number, any>) {
  
  // Send notification to a specific user
  const sendTaskNotification = (userId: number, notification: TaskNotification) => {
    console.log(`[NOTIFICATION] Sending to user ${userId}:`, JSON.stringify(notification));
    
    if (!clients.has(userId)) {
      console.log(`[NOTIFICATION] User ${userId} not connected, notification not sent`);
      return false;
    }
    
    try {
      const userClients = clients.get(userId);
      let sentToAtLeastOne = false;
      
      userClients.forEach((client: any) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: 'notification',
            data: notification,
            timestamp: Date.now()
          }));
          sentToAtLeastOne = true;
        }
      });
      
      return sentToAtLeastOne;
    } catch (error) {
      console.error('[NOTIFICATION] Error sending notification:', error);
      return false;
    }
  };
  
  // Task assigned notification
  const notifyTaskAssigned = async (task: Task, assigneeId: number, assignerName: string) => {
    if (!task || !assigneeId) return;
    
    const notification: TaskNotification = {
      type: 'task_assigned',
      taskId: task.id,
      taskTitle: task.title,
      message: `${assignerName} assigned you a new task: ${task.title}`,
      timestamp: Date.now()
    };
    
    // Send WebSocket notification
    sendTaskNotification(assigneeId, notification);
    
    try {
      // Send email notification too
      const assignee = await storage.getUser(assigneeId);
      // Using username as email since that's where the email is stored
      if (assignee && assignee.username) {
        const userWithEmail = {
          ...assignee,
          email: assignee.username // Set email field to username for notification service
        };
        
        await notificationService.sendEmailNotification(userWithEmail, 'taskAssigned', {
          taskTitle: task.title,
          assignerName: assignerName,
          taskData: task
        });
        console.log(`Task assignment email notification sent to user ${assigneeId} at ${assignee.username}`);
      } else {
        console.log(`Could not send email notification: User ${assigneeId} not found or has no username (email)`);
      }
    } catch (error) {
      console.error('Failed to send email notification for task assignment:', error);
    }
    
    return true;
  };
  
  // Task updated notification
  const notifyTaskUpdated = async (task: Task, userId: number, updaterName: string) => {
    if (!task || !userId) return;
    
    const notification: TaskNotification = {
      type: 'task_updated',
      taskId: task.id,
      taskTitle: task.title,
      message: `${updaterName} updated a task assigned to you: ${task.title}`,
      timestamp: Date.now()
    };
    
    // Send WebSocket notification
    sendTaskNotification(userId, notification);
    
    try {
      // Send email notification too
      const user = await storage.getUser(userId);
      // Using username as email since that's where the email is stored
      if (user && user.username) {
        const userWithEmail = {
          ...user,
          email: user.username // Set email field to username for notification service
        };
        
        await notificationService.sendEmailNotification(userWithEmail, 'taskUpdate', {
          taskTitle: task.title,
          updaterName: updaterName,
          updateType: 'Details updated',
          taskData: task
        });
        console.log(`Task update email notification sent to user ${userId} at ${user.username}`);
      } else {
        console.log(`Could not send email notification: User ${userId} not found or has no username (email)`);
      }
    } catch (error) {
      console.error('Failed to send email notification for task update:', error);
    }
    
    return true;
  };
  
  // Task completed notification
  const notifyTaskCompleted = async (task: Task, userId: number, completerName: string) => {
    if (!task || !userId) return;
    
    const notification: TaskNotification = {
      type: 'task_completed',
      taskId: task.id,
      taskTitle: task.title,
      message: `${completerName} marked a task as completed: ${task.title}`,
      timestamp: Date.now()
    };
    
    // Send WebSocket notification
    sendTaskNotification(userId, notification);
    
    try {
      // Send email notification too
      const user = await storage.getUser(userId);
      // Using username as email since that's where the email is stored
      if (user && user.username) {
        const userWithEmail = {
          ...user,
          email: user.username // Set email field to username for notification service
        };
        
        await notificationService.sendEmailNotification(userWithEmail, 'taskCompleted', {
          taskTitle: task.title,
          completedBy: completerName,
          taskData: {
            ...task,
            completedAt: new Date()
          }
        });
        console.log(`Task completion email notification sent to user ${userId} at ${user.username}`);
      } else {
        console.log(`Could not send email notification: User ${userId} not found or has no username (email)`);
      }
    } catch (error) {
      console.error('Failed to send email notification for task completion:', error);
    }
    
    return true;
  };
  
  // Store notification functions on app.locals for access in route handlers
  app.locals.taskNotifications = {
    sendTaskNotification,
    notifyTaskAssigned,
    notifyTaskUpdated,
    notifyTaskCompleted
  };
  
  return {
    sendTaskNotification,
    notifyTaskAssigned,
    notifyTaskUpdated,
    notifyTaskCompleted
  };
}
