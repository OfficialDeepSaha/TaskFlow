import { storage } from './storage';
import { Task, TaskStatus, UserRole } from '@shared/schema';
import { differenceInDays } from 'date-fns';

/**
 * Analytics helper functions for generating task and user metrics
 */
export const analyticsHelper = {
  /**
   * Get analytics data for the specified date range
   */
  async getAnalyticsData(startDate: string, endDate: string) {
    const allTasks = await storage.getAllTasks();
    const users = await storage.getAllUsers();
    
    // Filter tasks within the date range (created within the period)
    const startDateTime = new Date(startDate).getTime();
    const endDateTime = new Date(endDate).getTime();
    
    const tasksInPeriod = allTasks.filter(task => {
      const createdAt = new Date(task.createdAt || 0).getTime();
      return (createdAt >= startDateTime && createdAt <= endDateTime);
    });
    
    // Calculate user completion rates
    const userCompletionRates = await this.getUserCompletionRates(users, tasksInPeriod);
    
    // Calculate task status distribution
    const taskStatusDistribution = this.getTaskStatusDistribution(tasksInPeriod);
    
    // Calculate task trends over time
    const taskTrends = await this.getTaskTrends(startDate, endDate, allTasks);
    
    // Calculate overdue tasks by priority
    const overdueByPriority = this.getOverdueByPriority(tasksInPeriod);
    
    // Calculate average time to complete by priority
    const timeToCompleteAvg = this.getTimeToCompleteAvg(tasksInPeriod);
    
    return {
      userCompletionRates,
      taskStatusDistribution,
      taskTrends,
      overdueByPriority,
      timeToCompleteAvg
    };
  },
  
  /**
   * Calculate task completion rates for each user
   * Fixed to correctly identify completed tasks
   */
  async getUserCompletionRates(users: any[], tasks: Task[]) {
    // Get ALL tasks from the database to ensure we have everything
    // This is crucial to make sure we count tasks that might not be in the filtered period
    const allTasks = await storage.getAllTasks();
    
    return users
      .filter(user => user.role !== UserRole.ADMIN) // Exclude admin users
      .map(user => {
        // Use string representation of IDs for consistent comparison
        const userId = String(user.id);
        
        // Get all tasks ever assigned to this user
        const userTasks = allTasks.filter(task => {
          if (task.assignedToId !== undefined && task.assignedToId !== null) {
            return String(task.assignedToId) === userId;
          }
          return false;
        });
        
        // Consider a task completed if its status is COMPLETED (or any equivalent)
        const completedTasks = userTasks.filter(task => {
          const status = String(task.status).toUpperCase();
          return status === 'COMPLETED' || status === 'DONE';
        });
        
        // Calculate completion rate
        const completionRate = userTasks.length > 0 
          ? completedTasks.length / userTasks.length 
          : 0;
        
        return {
          userId: user.id,
          userName: user.name || `User #${user.id}`,
          completed: completedTasks.length,
          total: userTasks.length,
          completionRate
        };
      })
      .sort((a, b) => b.completionRate - a.completionRate); // Sort by completion rate descending
  },
  
  /**
   * Calculate the distribution of tasks by status
   */
  getTaskStatusDistribution(tasks: Task[]) {
    const statusCounts: Record<string, number> = {};
    
    // Count tasks by status
    tasks.forEach(task => {
      if (!statusCounts[task.status]) {
        statusCounts[task.status] = 0;
      }
      statusCounts[task.status]++;
    });
    
    // Convert to array format
    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
  },
  
  /**
   * Calculate task trends over the specified time period
   */
  async getTaskTrends(startDate: string, endDate: string, allTasks: Task[]) {
    // Generate a date range array
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateRangeArray = [];
    
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      dateRangeArray.push(new Date(dt));
    }
    
    // Calculate metrics for each date
    return dateRangeArray.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      // Tasks created on this date
      const createdTasks = allTasks.filter(task => {
        const createdDate = new Date(task.createdAt || 0);
        return createdDate >= date && createdDate < nextDay;
      });
      
      // Tasks completed on this date - use createdAt as a proxy since we don't have updatedAt
      const completedTasksCount = allTasks.filter(task => {
        // Check if task is completed
        const statusUpper = String(task.status).toUpperCase();
        const isCompleted = statusUpper === 'COMPLETED' || statusUpper === 'DONE';
        
        if (!isCompleted) return false;
        
        // Use createdAt as our best proxy for when the task was completed
        const completionDate = new Date(task.createdAt || 0);
        return completionDate >= date && completionDate < nextDay;
      }).length;
      
      // Tasks in progress (approximation based on what we know)
      const inProgressTasksCount = allTasks.filter(task => {
        const statusUpper = String(task.status).toUpperCase();
        return statusUpper === 'IN_PROGRESS' || statusUpper === 'IN PROGRESS';
      }).length;
      
      return {
        date: dateStr,
        created: createdTasks.length,
        completed: completedTasksCount,
        inProgress: inProgressTasksCount
      };
    });
  },
  
  /**
   * Calculate overdue tasks by priority
   */
  getOverdueByPriority(tasks: Task[]) {
    const now = new Date();
    
    // Find tasks that are overdue
    const overdueTasks = tasks.filter(task => {
      if (!task.dueDate) return false;
      
      // Check if task is not completed
      const statusUpper = String(task.status).toUpperCase();
      const isCompleted = statusUpper === 'COMPLETED' || statusUpper === 'DONE';
      
      return !isCompleted && new Date(task.dueDate) < now;
    });
    
    const priorityCounts: Record<string, number> = {};
    
    // Count overdue tasks by priority
    overdueTasks.forEach(task => {
      const priority = task.priority || 'medium';
      if (!priorityCounts[priority]) {
        priorityCounts[priority] = 0;
      }
      priorityCounts[priority]++;
    });
    
    // Convert to array format
    return Object.entries(priorityCounts).map(([priority, count]) => ({
      priority,
      count
    }));
  },
  
  /**
   * Calculate average time to complete tasks by priority
   */
  getTimeToCompleteAvg(tasks: Task[]) {
    // Find completed tasks
    const completedTasks = tasks.filter(task => {
      const statusUpper = String(task.status).toUpperCase();
      return (statusUpper === 'COMPLETED' || statusUpper === 'DONE') && task.dueDate && task.createdAt;
    });
    
    // Group tasks by priority
    const tasksByPriority: Record<string, Task[]> = {};
    
    completedTasks.forEach(task => {
      const priority = task.priority || 'medium';
      if (!tasksByPriority[priority]) {
        tasksByPriority[priority] = [];
      }
      tasksByPriority[priority].push(task);
    });
    
    // Calculate average days to complete for each priority
    return Object.entries(tasksByPriority).map(([priority, priorityTasks]) => {
      const totalDays = priorityTasks.reduce((sum, task) => {
        // Calculate days between creation and due date as our best approximation
        const dueDate = new Date(task.dueDate!);
        const creationDate = new Date(task.createdAt!);
        
        // Positive values mean the task was due after creation (expected)
        // Negative values mean the task was due before creation (unusual)
        const daysToComplete = Math.max(0, differenceInDays(dueDate, creationDate));
        
        return sum + daysToComplete;
      }, 0);

      return {
        priority,
        avgDays: priorityTasks.length > 0 ? totalDays / priorityTasks.length : 0
      };
    });
  }
};
