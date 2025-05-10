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
    
    // Filter tasks within the date range (created or updated in the period)
    const startDateTime = new Date(startDate).getTime();
    const endDateTime = new Date(endDate).getTime();
    
    const tasksInPeriod = allTasks.filter(task => {
      const createdAt = new Date(task.createdAt || 0).getTime();
      const updatedAt = new Date(task.updatedAt || 0).getTime();
      return (createdAt >= startDateTime && createdAt <= endDateTime) || 
             (updatedAt >= startDateTime && updatedAt <= endDateTime);
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
   */
  async getUserCompletionRates(users: any[], tasks: Task[]) {
    return users
      .filter(user => user.role !== UserRole.ADMIN) // Exclude admin users
      .map(user => {
        const userTasks = tasks.filter(task => task.assignedToId === user.id);
        const completedTasks = userTasks.filter(task => task.status === TaskStatus.DONE);
        const completionRate = userTasks.length > 0 ? completedTasks.length / userTasks.length : 0;
        
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
      
      // Tasks completed on this date
      const completedTasks = allTasks.filter(task => {
        if (task.status !== TaskStatus.DONE) return false;
        const completedDate = new Date(task.updatedAt || 0);
        return completedDate >= date && completedDate < nextDay;
      });
      
      // Tasks that became overdue on this date
      const overdueTasks = allTasks.filter(task => {
        if (!task.dueDate || task.status === TaskStatus.DONE) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate.toISOString().split('T')[0] === dateStr;
      });
      
      return {
        date: dateStr,
        created: createdTasks.length,
        completed: completedTasks.length,
        overdue: overdueTasks.length
      };
    });
  },
  
  /**
   * Calculate overdue tasks by priority
   */
  getOverdueByPriority(tasks: Task[]) {
    const overdueTasks = tasks.filter(task => {
      if (!task.dueDate || task.status === TaskStatus.DONE) return false;
      return new Date(task.dueDate) < new Date();
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
    const completedTasks = tasks.filter(task => 
      task.status === TaskStatus.DONE && task.createdAt && task.updatedAt
    );
    
    const priorityTotals: Record<string, { total: number, count: number }> = {};
    
    // Calculate total days and count for each priority
    completedTasks.forEach(task => {
      const priority = task.priority || 'medium';
      const createdDate = new Date(task.createdAt!);
      const completedDate = new Date(task.updatedAt!);
      const days = differenceInDays(completedDate, createdDate);
      
      if (!priorityTotals[priority]) {
        priorityTotals[priority] = { total: 0, count: 0 };
      }
      
      priorityTotals[priority].total += days;
      priorityTotals[priority].count++;
    });
    
    // Calculate averages
    return Object.entries(priorityTotals).map(([priority, { total, count }]) => ({
      priority,
      avgDays: count > 0 ? Math.round((total / count) * 10) / 10 : 0 // Round to 1 decimal place
    }));
  }
};
