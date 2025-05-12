import { Request, Response } from "express";
import { format, subDays, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { analyticsHelper } from "./analyticsHelper";
import { TaskStatus, Task } from "../shared/schema";
import { storage } from "./storage";

/**
 * Register analytics routes with the Express app
 */
export function registerAnalyticsRoutes(router: any) {
  // Get analytics dashboard data
  router.get("/analytics/dashboard", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const timeRange = req.query.timeRange as string || "7days";
      
      // Calculate date range based on the requested time period
      const now = new Date();
      let startDate: Date;
      let endDate = now;
      
      switch (timeRange) {
        case "7days":
          startDate = subDays(now, 7);
          break;
        case "30days":
          startDate = subDays(now, 30);
          break;
        case "thisWeek":
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case "thisMonth":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        default:
          startDate = subDays(now, 7); // Default to last 7 days
      }
      
      // Format dates for the analytics helper
      const formattedStartDate = format(startDate, "yyyy-MM-dd");
      const formattedEndDate = format(endDate, "yyyy-MM-dd");
      
      // Get analytics data for the specified period
      const analyticsData = await analyticsHelper.getAnalyticsData(
        formattedStartDate, 
        formattedEndDate
      );
      
      // Get weekly task completion rate data
      const weeklyCompletionRate = await getWeeklyTaskCompletionRate();
      
      // Combine all analytics data
      const dashboardData = {
        ...analyticsData,
        weeklyCompletionRate,
        summary: await getAnalyticsSummary()
      };
      
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      res.status(500).json({ message: "Error fetching analytics data" });
    }
  });
  
  // Get weekly task completion rates - ensure the route is registered correctly
  router.get("/analytics/weekly-completion", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const weeklyData = await getWeeklyTaskCompletionRate();
      res.json(weeklyData);
    } catch (error) {
      console.error("Error fetching weekly completion data:", error);
      res.status(500).json({ message: "Error fetching weekly completion data" });
    }
  });
  
  // Get team performance metrics
  router.get("/analytics/team-performance", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      // Cast storage to any to avoid TypeScript errors
      const users = await (storage as any).getAllUsers();
      const tasks = await (storage as any).getAllTasks();
      
      const userPerformance = await analyticsHelper.getUserCompletionRates(users, tasks);
      
      res.json(userPerformance);
    } catch (error) {
      console.error("Error fetching team performance:", error);
      res.status(500).json({ message: "Error fetching team performance data" });
    }
  });
  
  // Get analytics summary (totals and rates)
  router.get("/analytics/summary", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const summary = await getAnalyticsSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching analytics summary:", error);
      res.status(500).json({ message: "Error fetching analytics summary" });
    }
  });
}

/**
 * Get weekly task completion rate data
 */
async function getWeeklyTaskCompletionRate(): Promise<any[]> {
  const tasks = await (storage as any).getAllTasks();
  const now = new Date();
  
  // Get data for the last 10 weeks
  const weeklyData = [];
  
  for (let i = 9; i >= 0; i--) {
    const weekStart = startOfWeek(subDays(now, i * 7));
    const weekEnd = endOfWeek(subDays(now, i * 7));
    
    const weekTasks = tasks.filter((task: Task) => {
      // Use createdAt since updatedAt is not available
      const taskDate = task.createdAt ? new Date(task.createdAt) : null;
      return taskDate && taskDate >= weekStart && taskDate <= weekEnd;
    });
    
    const totalTasks = weekTasks.length;
    const completedTasks = weekTasks.filter((task: Task) => task.status === TaskStatus.COMPLETED).length;
    const inProgressTasks = weekTasks.filter((task: Task) => task.status === TaskStatus.IN_PROGRESS).length;
    const notStartedTasks = weekTasks.filter((task: Task) => task.status === TaskStatus.NOT_STARTED).length;
    
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    weeklyData.push({
      week: format(weekStart, "MMM d"),
      completed: completedTasks,
      inProgress: inProgressTasks,
      notStarted: notStartedTasks,
      total: totalTasks,
      completionRate: Math.round(completionRate)
    });
  }
  
  return weeklyData;
}

/**
 * Get overall analytics summary
 */
async function getAnalyticsSummary(): Promise<any> {
  const tasks = await (storage as any).getAllTasks();
  const users = await (storage as any).getAllUsers();
  
  // Calculate totals
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task: Task) => task.status === TaskStatus.COMPLETED).length;
  const inProgressTasks = tasks.filter((task: Task) => task.status === TaskStatus.IN_PROGRESS).length;
  const notStartedTasks = tasks.filter((task: Task) => task.status === TaskStatus.NOT_STARTED).length;
  
  // Calculate completion rate
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  // Calculate overdue tasks
  const overdueTasks = tasks.filter((task: Task) => {
    if (task.status === TaskStatus.COMPLETED) return false;
    if (!task.dueDate) return false;
    
    const dueDate = new Date(task.dueDate);
    return dueDate < new Date();
  }).length;
  
  // Calculate active users
  const activeUsers = users.length;
  
  // Get daily task count for the last week
  const now = new Date();
  const dailyTaskCounts = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = subDays(now, i);
    const formattedDate = format(date, "EEE");
    
    const tasksInPeriod = tasks.filter((task: Task) => {
      const createdAt = task.createdAt ? new Date(task.createdAt) : null;
      return createdAt && format(createdAt, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
    });
    
    const dayTasks = tasksInPeriod.length;
    
    dailyTaskCounts.push({
      day: formattedDate,
      count: dayTasks
    });
  }
  
  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    notStartedTasks,
    completionRate: Math.round(completionRate),
    overdueTasks,
    activeUsers,
    dailyTaskCounts
  };
}
