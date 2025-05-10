import { Task, RecurringPattern, InsertTask, TaskColor } from "../shared/schema";
import { storage } from "./storage";

/**
 * Utility to manage recurring tasks
 */
export const recurringTaskHelper = {
  /**
   * Create a recurring task instance
   * @param parentTask - The parent recurring task
   * @param date - The date for this instance
   * @returns The created task instance
   */
  async createRecurringInstance(parentTask: Task, date: Date): Promise<Task | null> {
    try {
      // Create a new task based on the parent task
      const newTaskData: InsertTask = {
        title: parentTask.title,
        description: parentTask.description,
        status: parentTask.status,
        priority: parentTask.priority,
        dueDate: date,
        createdById: parentTask.createdById,
        assignedToId: parentTask.assignedToId,
        isRecurring: false, // The instance is not recurring itself
        recurringPattern: RecurringPattern.NONE,
        parentTaskId: parentTask.id, // Link to parent task
        colorCode: parentTask.colorCode && Object.values(TaskColor).includes(parentTask.colorCode as TaskColor) ? parentTask.colorCode as TaskColor : TaskColor.DEFAULT,
      };

      // Insert the new task instance
      const newTask = await storage.createTask(newTaskData);
      
      console.log(`Created recurring task instance for task #${parentTask.id} with due date ${date.toISOString()}`);
      
      return newTask;
    } catch (error) {
      console.error(`Failed to create recurring task instance for task #${parentTask.id}:`, error);
      return null;
    }
  },

  /**
   * Schedule the next instance of a recurring task
   * @param task - The recurring task
   * @returns The created next instance or null if scheduling failed
   */
  async scheduleNextInstance(task: Task): Promise<Task | null> {
    if (!task.isRecurring || task.recurringPattern === RecurringPattern.NONE) {
      console.log(`Task #${task.id} is not recurring, won't schedule next instance`);
      return null;
    }

    // Check if recurring end date is reached
    if (task.recurringEndDate && new Date(task.recurringEndDate) < new Date()) {
      console.log(`Task #${task.id} has reached its recurring end date, won't schedule next instance`);
      return null;
    }

    // Get the next due date based on the recurring pattern
    const nextDueDate = this.calculateNextDueDate(
      task.dueDate ? new Date(task.dueDate) : new Date(),
      (task.recurringPattern as RecurringPattern) || RecurringPattern.NONE
    );

    // Check if the next due date is beyond the end date
    if (task.recurringEndDate && nextDueDate > new Date(task.recurringEndDate)) {
      console.log(`Next due date for task #${task.id} would be beyond the recurring end date, won't schedule`);
      return null;
    }

    // Create the next recurring instance
    return this.createRecurringInstance(task, nextDueDate);
  },

  /**
   * Calculate the next due date based on recurring pattern
   * @param currentDueDate - The current due date
   * @param pattern - The recurring pattern
   * @returns The next due date
   */
  calculateNextDueDate(currentDueDate: Date, pattern: RecurringPattern): Date {
    const nextDueDate = new Date(currentDueDate);
    
    switch (pattern) {
      case RecurringPattern.DAILY:
        nextDueDate.setDate(nextDueDate.getDate() + 1);
        break;
      case RecurringPattern.WEEKLY:
        nextDueDate.setDate(nextDueDate.getDate() + 7);
        break;
      case RecurringPattern.MONTHLY:
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        break;
      default:
        // No change for non-recurring tasks
        break;
    }
    
    return nextDueDate;
  },

  /**
   * Process all recurring tasks that need scheduling
   * This should be called regularly by a scheduled job
   */
  async processRecurringTasks(): Promise<void> {
    try {
      // Get all recurring tasks
      const recurringTasks = await storage.getRecurringTasks();
      
      console.log(`Processing ${recurringTasks.length} recurring tasks`);
      
      // Process each task
      for (const task of recurringTasks) {
        // Skip tasks without due dates
        if (!task.dueDate) continue;
        
        const dueDate = new Date(task.dueDate);
        const now = new Date();
        
        // If the due date has passed, schedule the next instance
        if (dueDate < now) {
          console.log(`Scheduling next instance for task #${task.id} (${task.title})`);
          await this.scheduleNextInstance(task);
        }
      }
    } catch (error) {
      console.error("Error processing recurring tasks:", error);
    }
  },
};
