import nodemailer from 'nodemailer';
import { User, NotificationChannel, Task, TaskPriority } from '@shared/schema';

// Extended Task type with completion information
interface ExtendedTask extends Task {
  completedAt?: Date;
}

// Extended NotificationPreferences type
interface NotificationPreferences {
  channels: NotificationChannel[];
  taskAssignment: boolean;
  taskStatusUpdate: boolean;
  taskCompletion: boolean;
  taskDueSoon: boolean;
  systemUpdates: boolean;
  taskReminders?: boolean;
  comments?: boolean;
}

// Helper functions for email formatting

/**
 * Format a date for display in email templates
 */
function formatDate(dateString: string | Date): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(dateString);
  }
}

/**
 * Get background color for priority badges
 */
function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'high':
      return '#ef4444'; // Red
    case 'medium':
      return '#f59e0b'; // Amber
    case 'low':
      return '#10b981'; // Green
    default:
      return '#6366f1'; // Indigo
  }
}

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'deepsaha01896@gmail.com',
    pass: process.env.SMTP_PASS || 'qcfz jlva siyc fngl', // Using SMTP_PASS instead of SMTP_PASSWORD to match our .env file
  },
});

// Modern notification templates with beautiful designs
// Using gradient backgrounds, glass-morphism effects, and responsive layouts
const templates = {
  taskAssigned: (user: User, taskTitle: string, assignerName: string, taskData: Partial<Task> = {}) => ({
    subject: `[TaskFlow] New Task Assigned: ${taskTitle}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Task Assigned</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7ff; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom right, rgba(255,255,255,0.9), rgba(255,255,255,0.8)); backdrop-filter: blur(10px); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(99, 102, 241, 0.1); margin-top: 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">TaskFlow</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 5px 0 0; font-size: 16px;">Your collaborative task management platform</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 25px;">
            <h2 style="margin-top: 0; margin-bottom: 20px; color: #4f46e5; font-size: 22px; font-weight: 600;">New Task Assigned</h2>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 15px;">Hello ${user.name},</p>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">A new task has been assigned to you by <strong>${assignerName}</strong>:</p>
            
            <!-- Task Card -->
            <div style="background: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border-left: 5px solid #6366f1;">
              <h3 style="margin-top: 0; margin-bottom: 12px; color: #4f46e5; font-size: 18px;">${taskTitle}</h3>
              ${taskData.description ? `<p style="color: #555; margin-bottom: 12px; line-height: 1.5;">${taskData.description}</p>` : ''}
              <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px;">
                ${taskData.priority ? `<div style="background: ${getPriorityColor(taskData.priority)}; color: white; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 12px;">${taskData.priority.toUpperCase()}</div>` : ''}
                ${taskData.dueDate ? `<div style="background: #f59e0b; color: white; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 12px;">${formatDate(taskData.dueDate)}</div>` : ''}
              </div>
            </div>
            
            <!-- CTA Button -->
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/tasks" style="display: inline-block; background: linear-gradient(90deg, #6366f1, #8b5cf6); color: white; font-size: 16px; font-weight: 500; text-decoration: none; padding: 12px 25px; border-radius: 6px; text-align: center; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);">
              View Task Details
            </a>
            
            <!-- Additional Info -->
            <p style="margin-top: 25px; font-size: 14px; color: #555; line-height: 1.5;">
              You can manage your notification preferences in your <a href="${process.env.APP_URL || 'http://localhost:3000'}/profile" style="color: #6366f1; text-decoration: none; font-weight: 500;">profile settings</a>.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: rgba(243, 244, 246, 0.7); padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0 0 10px;">
              &copy; ${new Date().getFullYear()} TaskFlow. All rights reserved.
            </p>
            <p style="margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
  
  taskReminder: (user: User, taskTitle: string, dueDate: string, taskData: Partial<Task> = {}) => ({
    subject: `[TaskFlow] Reminder: Task Due Soon - ${taskTitle}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Reminder</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7ff; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom right, rgba(255,255,255,0.9), rgba(255,255,255,0.8)); backdrop-filter: blur(10px); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(255, 171, 0, 0.1); margin-top: 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">TaskFlow</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 5px 0 0; font-size: 16px;">Your collaborative task management platform</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 25px;">
            <h2 style="margin-top: 0; margin-bottom: 20px; color: #d97706; font-size: 22px; font-weight: 600;">Task Reminder</h2>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 15px;">Hello ${user.name},</p>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">This is a reminder that the following task is <strong>due soon</strong>:</p>
            
            <!-- Task Card -->
            <div style="background: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border-left: 5px solid #f59e0b;">
              <h3 style="margin-top: 0; margin-bottom: 12px; color: #d97706; font-size: 18px;">${taskTitle}</h3>
              ${taskData.description ? `<p style="color: #555; margin-bottom: 12px; line-height: 1.5;">${taskData.description}</p>` : ''}
              <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px;">
                ${taskData.priority ? `<div style="background: ${getPriorityColor(taskData.priority)}; color: white; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 12px;">${taskData.priority.toUpperCase()}</div>` : ''}
                <div style="background: #f59e0b; color: white; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 12px;">Due: ${dueDate}</div>
              </div>
            </div>
            
            <!-- CTA Button -->
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/tasks" style="display: inline-block; background: linear-gradient(90deg, #f59e0b, #d97706); color: white; font-size: 16px; font-weight: 500; text-decoration: none; padding: 12px 25px; border-radius: 6px; text-align: center; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(249, 115, 22, 0.3);">
              View Task Details
            </a>
            
            <!-- Additional Info -->
            <p style="margin-top: 25px; font-size: 14px; color: #555; line-height: 1.5;">
              You can manage your notification preferences in your <a href="${process.env.APP_URL || 'http://localhost:3000'}/profile" style="color: #f59e0b; text-decoration: none; font-weight: 500;">profile settings</a>.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: rgba(243, 244, 246, 0.7); padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0 0 10px;">
              &copy; ${new Date().getFullYear()} TaskFlow. All rights reserved.
            </p>
            <p style="margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
  
  taskUpdate: (user: User, taskTitle: string, updaterName: string, updateType: string, taskData: Partial<Task> = {}) => ({
    subject: `[TaskFlow] Task Updated: ${taskTitle}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Updated</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7ff; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom right, rgba(255,255,255,0.9), rgba(255,255,255,0.8)); backdrop-filter: blur(10px); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.1); margin-top: 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">TaskFlow</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 5px 0 0; font-size: 16px;">Your collaborative task management platform</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 25px;">
            <h2 style="margin-top: 0; margin-bottom: 20px; color: #059669; font-size: 22px; font-weight: 600;">Task Updated</h2>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 15px;">Hello ${user.name},</p>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;"><strong>${updaterName}</strong> has updated a task you're involved with:</p>
            
            <!-- Task Card -->
            <div style="background: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border-left: 5px solid #10b981;">
              <h3 style="margin-top: 0; margin-bottom: 12px; color: #059669; font-size: 18px;">${taskTitle}</h3>
              ${taskData.description ? `<p style="color: #555; margin-bottom: 12px; line-height: 1.5;">${taskData.description}</p>` : ''}
              <div style="background: #10b981; color: white; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 12px; display: inline-block; margin-bottom: 10px;">Update type: ${updateType}</div>
              <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                ${taskData.priority ? `<div style="background: ${getPriorityColor(taskData.priority)}; color: white; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 12px;">${taskData.priority.toUpperCase()}</div>` : ''}
                ${taskData.dueDate ? `<div style="background: #f59e0b; color: white; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 12px;">${formatDate(taskData.dueDate)}</div>` : ''}
              </div>
            </div>
            
            <!-- CTA Button -->
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/tasks" style="display: inline-block; background: linear-gradient(90deg, #10b981, #059669); color: white; font-size: 16px; font-weight: 500; text-decoration: none; padding: 12px 25px; border-radius: 6px; text-align: center; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);">
              View Task Details
            </a>
            
            <!-- Additional Info -->
            <p style="margin-top: 25px; font-size: 14px; color: #555; line-height: 1.5;">
              You can manage your notification preferences in your <a href="${process.env.APP_URL || 'http://localhost:3000'}/profile" style="color: #10b981; text-decoration: none; font-weight: 500;">profile settings</a>.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: rgba(243, 244, 246, 0.7); padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0 0 10px;">
              &copy; ${new Date().getFullYear()} TaskFlow. All rights reserved.
            </p>
            <p style="margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
  
  commentAdded: (user: User, taskTitle: string, commenterName: string, commentText: string) => ({
    subject: `[TaskFlow] New Comment on: ${taskTitle}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Comment</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7ff; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom right, rgba(255,255,255,0.9), rgba(255,255,255,0.8)); backdrop-filter: blur(10px); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(99, 102, 241, 0.1); margin-top: 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">TaskFlow</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 5px 0 0; font-size: 16px;">Your collaborative task management platform</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 25px;">
            <h2 style="margin-top: 0; margin-bottom: 20px; color: #8b5cf6; font-size: 22px; font-weight: 600;">New Comment</h2>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 15px;">Hello ${user.name},</p>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;"><strong>${commenterName}</strong> added a comment to task <strong>${taskTitle}</strong>:</p>
            
            <!-- Comment Card -->
            <div style="background: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border-left: 5px solid #8b5cf6;">
              <div style="position: relative; padding-left: 40px; min-height: 40px;">
                <div style="position: absolute; left: 0; top: 0; width: 32px; height: 32px; background-color: #8b5cf6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">
                  ${commenterName.charAt(0)}
                </div>
                <div style="font-weight: 600; color: #4f46e5; margin-bottom: 6px;">${commenterName}</div>
                <div style="font-style: italic; color: #6b7280; font-size: 12px; margin-bottom: 10px;">${new Date().toLocaleString()}</div>
              </div>
              <div style="background-color: #f9fafb; border-radius: 6px; padding: 15px; margin-top: 10px; border-left: 3px solid #e5e7eb;">
                <p style="color: #374151; line-height: 1.6; margin: 0;">${commentText}</p>
              </div>
            </div>
            
            <!-- CTA Button -->
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/tasks" style="display: inline-block; background: linear-gradient(90deg, #8b5cf6, #6366f1); color: white; font-size: 16px; font-weight: 500; text-decoration: none; padding: 12px 25px; border-radius: 6px; text-align: center; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(139, 92, 246, 0.3);">
              View Task Details
            </a>
            
            <!-- Additional Info -->
            <p style="margin-top: 25px; font-size: 14px; color: #555; line-height: 1.5;">
              You can manage your notification preferences in your <a href="${process.env.APP_URL || 'http://localhost:3000'}/profile" style="color: #8b5cf6; text-decoration: none; font-weight: 500;">profile settings</a>.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: rgba(243, 244, 246, 0.7); padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0 0 10px;">
              &copy; ${new Date().getFullYear()} TaskFlow. All rights reserved.
            </p>
            <p style="margin: 0;">
              This is an automated message. Please do not reply to this email.
    `,
  }),
  
  systemUpdate: (user: User, updateTitle: string, updateDetails: string) => ({
    subject: `[TaskFlow] System Update: ${updateTitle}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>System Update</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7ff; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom right, rgba(255,255,255,0.9), rgba(255,255,255,0.8)); backdrop-filter: blur(10px); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(99, 102, 241, 0.1); margin-top: 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">TaskFlow</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 5px 0 0; font-size: 16px;">Your collaborative task management platform</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 25px;">
            <h2 style="margin-top: 0; margin-bottom: 20px; color: #2563eb; font-size: 22px; font-weight: 600;">System Update</h2>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 15px;">Hello ${user.name},</p>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">We have an important update about TaskFlow:</p>
            
            <!-- Update Card -->
            <div style="background: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border-left: 5px solid #3b82f6;">
              <h3 style="margin-top: 0; margin-bottom: 12px; color: #2563eb; font-size: 18px;">${updateTitle}</h3>
              <div style="color: #555; margin-bottom: 0; line-height: 1.5;">${updateDetails}</div>
            </div>
            
            <!-- CTA Button -->
            <a href="${process.env.APP_URL || 'http://localhost:3000'}" style="display: inline-block; background: linear-gradient(90deg, #3b82f6, #2563eb); color: white; font-size: 16px; font-weight: 500; text-decoration: none; padding: 12px 25px; border-radius: 6px; text-align: center; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);">
              Go to TaskFlow
            </a>
            
            <!-- Additional Info -->
            <p style="margin-top: 25px; font-size: 14px; color: #555; line-height: 1.5;">
              You can manage your notification preferences in your <a href="${process.env.APP_URL || 'http://localhost:3000'}/profile" style="color: #3b82f6; text-decoration: none; font-weight: 500;">profile settings</a>.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: rgba(243, 244, 246, 0.7); padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0 0 10px;">
              &copy; ${new Date().getFullYear()} TaskFlow. All rights reserved.
            </p>
            <p style="margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  taskCompleted: (user: User, taskTitle: string, completedBy: string, taskData: Partial<ExtendedTask> = {}) => ({
    subject: `[TaskFlow] Task Completed: ${taskTitle}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Completed</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7ff; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom right, rgba(255,255,255,0.9), rgba(255,255,255,0.8)); backdrop-filter: blur(10px); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(34, 197, 94, 0.1); margin-top: 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">TaskFlow</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 5px 0 0; font-size: 16px;">Your collaborative task management platform</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 25px;">
            <h2 style="margin-top: 0; margin-bottom: 20px; color: #16a34a; font-size: 22px; font-weight: 600;">Task Completed</h2>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 15px;">Hello ${user.name},</p>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Great news! A task has been completed by <strong>${completedBy}</strong>:</p>
            
            <!-- Task Card -->
            <div style="background: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border-left: 5px solid #22c55e;">
              <h3 style="margin-top: 0; margin-bottom: 12px; color: #16a34a; font-size: 18px;">${taskTitle}</h3>
              ${taskData.description ? `<p style="color: #555; margin-bottom: 12px; line-height: 1.5;">${taskData.description}</p>` : ''}
              <div style="display: flex; margin-top: 10px; align-items: center;">
                <div style="display: inline-block; margin-right: 15px;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;">
                    <circle cx="12" cy="12" r="10" fill="#22c55e"/>
                    <path d="M8 12L11 15L16 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span style="vertical-align: middle; margin-left: 5px; color: #16a34a; font-weight: 500;">Completed</span>
                </div>
                ${taskData.completedAt ? `<span style="color: #6b7280; font-size: 14px;">on ${formatDate(taskData.completedAt)}</span>` : ''}
              </div>
            </div>
            
            <!-- CTA Button -->
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/tasks" style="display: inline-block; background: linear-gradient(90deg, #22c55e, #16a34a); color: white; font-size: 16px; font-weight: 500; text-decoration: none; padding: 12px 25px; border-radius: 6px; text-align: center; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(34, 197, 94, 0.3);">
              View Task Details
            </a>
            
            <!-- Additional Info -->
            <p style="margin-top: 25px; font-size: 14px; color: #555; line-height: 1.5;">
              You can manage your notification preferences in your <a href="${process.env.APP_URL || 'http://localhost:3000'}/profile" style="color: #16a34a; text-decoration: none; font-weight: 500;">profile settings</a>.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: rgba(243, 244, 246, 0.7); padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0 0 10px;">
              &copy; ${new Date().getFullYear()} TaskFlow. All rights reserved.
            </p>
            <p style="margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  welcomeUser: (user: User) => ({
    subject: `Welcome to TaskFlow, ${user.name}!`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to TaskFlow</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7ff; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom right, rgba(255,255,255,0.9), rgba(255,255,255,0.8)); backdrop-filter: blur(10px); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(139, 92, 246, 0.15); margin-top: 20px;">
          <!-- Header with hero image -->
          <div style="background: linear-gradient(135deg, #8b5cf6, #ec4899); padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700;">Welcome to TaskFlow</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 18px;">Your journey to better productivity begins now</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 35px 25px;">
            <h2 style="margin-top: 0; margin-bottom: 20px; color: #8b5cf6; font-size: 24px; font-weight: 600;">Hello ${user.name}!</h2>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">We're excited to have you on board! TaskFlow is designed to help you manage your tasks efficiently and collaborate with your team seamlessly.</p>
            
            <!-- Features -->
            <div style="margin: 30px 0;">
              <h3 style="color: #8b5cf6; font-size: 18px; margin-bottom: 15px;">What you can do with TaskFlow:</h3>
              
              <div style="display: flex; margin-bottom: 15px; align-items: center;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #8b5cf6, #6366f1); display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0;">
                  <span style="color: white; font-weight: bold;">1</span>
                </div>
                <div>
                  <h4 style="margin: 0 0 5px; color: #4c1d95;">Create & Manage Tasks</h4>
                  <p style="margin: 0; color: #555; line-height: 1.5;">Organize your work with customizable tasks and deadlines</p>
                </div>
              </div>
              
              <div style="display: flex; margin-bottom: 15px; align-items: center;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #8b5cf6, #6366f1); display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0;">
                  <span style="color: white; font-weight: bold;">2</span>
                </div>
                <div>
                  <h4 style="margin: 0 0 5px; color: #4c1d95;">Collaborate with Your Team</h4>
                  <p style="margin: 0; color: #555; line-height: 1.5;">Assign tasks, share updates, and keep everyone in the loop</p>
                </div>
              </div>
              
              <div style="display: flex; margin-bottom: 15px; align-items: center;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #8b5cf6, #6366f1); display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0;">
                  <span style="color: white; font-weight: bold;">3</span>
                </div>
                <div>
                  <h4 style="margin: 0 0 5px; color: #4c1d95;">Track Progress</h4>
                  <p style="margin: 0; color: #555; line-height: 1.5;">Visualize your progress with beautiful charts and analytics</p>
                </div>
              </div>
            </div>
            
            <!-- Get Started Button -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; background: linear-gradient(90deg, #8b5cf6, #ec4899); color: white; font-size: 18px; font-weight: 500; text-decoration: none; padding: 14px 30px; border-radius: 8px; text-align: center; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);">
                Get Started Now
              </a>
            </div>
            
            <!-- Settings reminder -->
            <p style="margin-top: 25px; font-size: 15px; color: #555; line-height: 1.5;">
              Don't forget to personalize your experience by updating your <a href="${process.env.APP_URL || 'http://localhost:3000'}/profile" style="color: #8b5cf6; text-decoration: none; font-weight: 500;">profile settings</a> and notification preferences.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: rgba(243, 244, 246, 0.7); padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0 0 10px;">
              &copy; ${new Date().getFullYear()} TaskFlow. All rights reserved.
            </p>
            <p style="margin: 0 0 15px;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/terms" style="color: #8b5cf6; text-decoration: none; margin: 0 10px;">Terms of Service</a> | 
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/privacy" style="color: #8b5cf6; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
            </p>
            <p style="margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

// Email notification service
export const notificationService = {
  /**
   * Send an email notification
   * @param user The user to send the notification to
   * @param templateName The template to use for the email
   * @param data Template-specific data
   */
  async sendEmailNotification(user: User, templateName: keyof typeof templates, data: any) {
    if (!user.email || !user.notificationPreferences?.channels.includes(NotificationChannel.EMAIL)) {
      console.log(`Email notification skipped for user ${user.id} - no email address or email notifications disabled`);
      return;
    }

    try {
      // Check user's notification preferences
      const { notificationPreferences } = user;
      
      if (!notificationPreferences) {
        console.log(`Email notification skipped for user ${user.id} - no notification preferences`);
        return;
      }
      
      // Check if this notification type is enabled
      let shouldSend = false;
      
      // Cast notification preferences to our extended interface
      const preferences = notificationPreferences as NotificationPreferences;
      
      switch (templateName) {
        case 'taskAssigned':
          shouldSend = preferences.taskAssignment;
          break;
        case 'taskUpdate':
          shouldSend = preferences.taskStatusUpdate;
          break;
        case 'taskCompleted':
          shouldSend = preferences.taskCompletion || preferences.taskStatusUpdate;
          break;
        case 'welcomeUser':
          // Always send welcome emails
          shouldSend = true;
          break;
        case 'systemUpdate':
          // Always send system updates
          shouldSend = preferences.systemUpdates;
          break;
        case 'commentAdded':
          shouldSend = (preferences.comments !== undefined ? preferences.comments : false) || preferences.taskStatusUpdate;
          break;
        case 'taskReminder':
          shouldSend = (preferences.taskReminders !== undefined ? preferences.taskReminders : false) || preferences.taskDueSoon;
          break;
      }
      
      if (!shouldSend) {
        console.log(`Email notification skipped for user ${user.id} - ${templateName} notifications disabled`);
        return;
      }
      
      // Get the template function
      const templateFn = templates[templateName];
      if (!templateFn) {
        throw new Error(`Email template ${templateName} not found`);
      }
      
      // Generate the email content
      const { subject, html } = templateFn(user, ...(Object.values(data) as [string, string, string]));
      
      // Send the email
      const info = await transporter.sendMail({
        from: `"TaskFlow" <${process.env.SMTP_FROM || 'noreply@taskflow.com'}>`,
        to: user.email,
        subject,
        html,
      });
      
      console.log(`Email notification sent to ${user.email}: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error('Error sending email notification:', error);
      throw error;
    }
  },
  
  /**
   * Update user notification preferences
   * @param userId User ID
   * @param preferences Updated notification preferences
   */
  async updateNotificationPreferences(userId: string | number, preferences: any) {
    // Implementation will depend on your storage mechanism
    // This would typically update the user's record in the database
    // Return the updated user with new preferences
    return { success: true, userId, preferences };
  }
};
