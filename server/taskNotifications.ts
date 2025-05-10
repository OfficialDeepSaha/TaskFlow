import { Task, User, TaskStatus } from "../shared/schema";
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
  const notifyTaskAssigned = (task: Task, assigneeId: number, assignerName: string) => {
    if (!task || !assigneeId) return;
    
    const notification: TaskNotification = {
      type: 'task_assigned',
      taskId: task.id,
      taskTitle: task.title,
      message: `${assignerName} assigned you a new task: ${task.title}`,
      timestamp: Date.now()
    };
    
    return sendTaskNotification(assigneeId, notification);
  };
  
  // Task updated notification
  const notifyTaskUpdated = (task: Task, userId: number, updaterName: string) => {
    if (!task || !userId) return;
    
    const notification: TaskNotification = {
      type: 'task_updated',
      taskId: task.id,
      taskTitle: task.title,
      message: `${updaterName} updated a task assigned to you: ${task.title}`,
      timestamp: Date.now()
    };
    
    return sendTaskNotification(userId, notification);
  };
  
  // Task completed notification
  const notifyTaskCompleted = (task: Task, userId: number, completerName: string) => {
    if (!task || !userId) return;
    
    const notification: TaskNotification = {
      type: 'task_completed',
      taskId: task.id,
      taskTitle: task.title,
      message: `${completerName} marked a task as completed: ${task.title}`,
      timestamp: Date.now()
    };
    
    return sendTaskNotification(userId, notification);
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
