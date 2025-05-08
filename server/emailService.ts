import { MailService } from '@sendgrid/mail';
import { User, Task, NotificationChannel } from '@shared/schema';

// Initialize SendGrid with API key
if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable not set. Email notifications will be logged but not sent.");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY || '');

const DEFAULT_FROM_EMAIL = 'notifications@taskmanagementsystem.com';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends an email using SendGrid
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('Email would be sent (SENDGRID_API_KEY not set):', options);
      return true;
    }

    await mailService.send({
      to: options.to,
      from: DEFAULT_FROM_EMAIL,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    });
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Get a safe email address, ensuring it's a valid string
 */
function getSafeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }
  return email;
}

/**
 * Send notification about task assignment
 */
export async function sendTaskAssignmentNotification(
  user: User,
  task: Task,
  assignedByUser: User
): Promise<boolean> {
  // Check if user has enabled email notifications for task assignments
  if (!shouldSendEmailNotification(user, 'taskAssignment')) {
    return false;
  }

  const subject = `New Task Assigned: ${task.title}`;
  const text = `
    Hello ${user.name},

    ${assignedByUser.name} has assigned you a new task:

    Title: ${task.title}
    Priority: ${task.priority}
    Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
    Description: ${task.description || 'No description provided'}

    Log in to your Task Management System account to view more details and take action.

    Best regards,
    Task Management System Team
  `;

  return sendEmail({
    to: user.email,
    subject,
    text
  });
}

/**
 * Send notification about task status update
 */
export async function sendTaskStatusUpdateNotification(
  user: User,
  task: Task,
  updatedByUser: User,
  oldStatus: string,
  newStatus: string
): Promise<boolean> {
  // Check if user has enabled email notifications for status updates
  if (!shouldSendEmailNotification(user, 'taskStatusUpdate')) {
    return false;
  }

  const subject = `Task Status Updated: ${task.title}`;
  const text = `
    Hello ${user.name},

    ${updatedByUser.name} has updated the status of a task assigned to you:

    Title: ${task.title}
    Old Status: ${oldStatus}
    New Status: ${newStatus}
    Priority: ${task.priority}
    Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}

    Log in to your Task Management System account to view more details.

    Best regards,
    Task Management System Team
  `;

  return sendEmail({
    to: user.email,
    subject,
    text
  });
}

/**
 * Send notification about task completion
 */
export async function sendTaskCompletionNotification(
  user: User,
  task: Task,
  completedByUser: User
): Promise<boolean> {
  // Check if user has enabled email notifications for task completion
  if (!shouldSendEmailNotification(user, 'taskCompletion')) {
    return false;
  }

  const subject = `Task Completed: ${task.title}`;
  const text = `
    Hello ${user.name},

    ${completedByUser.name} has marked a task as completed:

    Title: ${task.title}
    Priority: ${task.priority}
    Completed On: ${new Date().toLocaleDateString()}

    Log in to your Task Management System account to view more details.

    Best regards,
    Task Management System Team
  `;

  return sendEmail({
    to: user.email,
    subject,
    text
  });
}

/**
 * Send notification about upcoming task due date
 */
export async function sendTaskDueSoonNotification(
  user: User,
  task: Task
): Promise<boolean> {
  // Check if user has enabled email notifications for due soon reminders
  if (!shouldSendEmailNotification(user, 'taskDueSoon')) {
    return false;
  }

  const subject = `Reminder: Task Due Soon - ${task.title}`;
  const text = `
    Hello ${user.name},

    This is a reminder that the following task is due soon:

    Title: ${task.title}
    Priority: ${task.priority}
    Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
    Description: ${task.description || 'No description provided'}

    Log in to your Task Management System account to view more details and take action.

    Best regards,
    Task Management System Team
  `;

  return sendEmail({
    to: user.email,
    subject,
    text
  });
}

/**
 * Helper function to check if user should receive email notifications for a specific event type
 */
function shouldSendEmailNotification(user: User, eventType: keyof Pick<User['notificationPreferences'], 'taskAssignment' | 'taskStatusUpdate' | 'taskCompletion' | 'taskDueSoon' | 'systemUpdates'>): boolean {
  // Abort if user has no email
  if (!user.email || typeof user.email !== 'string') {
    return false;
  }

  // Check if notification preferences exist and email channel is enabled
  if (
    !user.notificationPreferences ||
    !user.notificationPreferences.channels ||
    !user.notificationPreferences.channels.includes(NotificationChannel.EMAIL) ||
    user.notificationPreferences[eventType] === false
  ) {
    return false;
  }

  return true;
}