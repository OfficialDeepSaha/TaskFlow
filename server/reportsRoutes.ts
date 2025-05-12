import { Request, Response } from "express";
import { reportsHelper } from "./reportsHelper";
import { UserRole } from "../shared/schema";

/**
 * Register reports routes with the Express app
 * These routes provide real-time user performance and activity data for admin reports
 */
export function registerReportsRoutes(router: any) {
  // Middleware to check if user is admin
  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = req.user as any;
    if (!user || user.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Forbidden - Admin access required" });
    }
    
    next();
  };
  
  // Get user performance data for reports
  router.get("/reports/user-performance", isAdmin, async (req: Request, res: Response) => {
    try {
      const timeRange = req.query.timeRange as string || "7days";
      const performanceData = await reportsHelper.getUserPerformanceReport(timeRange);
      res.json(performanceData);
    } catch (error) {
      console.error("Error fetching user performance report:", error);
      res.status(500).json({ message: "Error fetching user performance report" });
    }
  });
  
  // Get user activity data for reports
  router.get("/reports/user-activity", isAdmin, async (req: Request, res: Response) => {
    try {
      const timeRange = req.query.timeRange as string || "7days";
      const activityData = await reportsHelper.getUserActivityReport(timeRange);
      res.json(activityData);
    } catch (error) {
      console.error("Error fetching user activity report:", error);
      res.status(500).json({ message: "Error fetching user activity report" });
    }
  });
  
  // Download reports in CSV format
  router.get("/reports/download/csv", isAdmin, async (req: Request, res: Response) => {
    try {
      const reportType = req.query.reportType as string;
      const timeRange = req.query.timeRange as string || "7days";
      
      let data: any[] = [];
      let filename: string = '';
      let csvContent: string = '';
      
      if (reportType === "performance") {
        data = await reportsHelper.getUserPerformanceReport(timeRange);
        filename = `user_performance_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
        
        // Generate CSV header
        csvContent = "User,User ID,Tasks Completed,Tasks Assigned,On-Time Completion Rate,Average Time Per Task (hours),Tasks Created\n";
        
        // Generate CSV content
        data.forEach((item: any) => {
          csvContent += `"${item.name}",${item.userId},${item.tasksCompleted},${item.tasksAssigned},${item.onTimeRate}%,${item.avgTimePerTask},${item.tasksCreated}\n`;
        });
      } else if (reportType === "activity") {
        data = await reportsHelper.getUserActivityReport(timeRange);
        filename = `user_activity_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
        
        // Generate CSV header
        csvContent = "User,User ID,Date,Time,Action,Task,Task ID,Details\n";
        
        // Generate CSV content
        data.forEach((item: any) => {
          csvContent += `"${item.user}",${item.userId},"${item.date}","${item.time}","${item.action}","${item.task || ''}",${item.taskId || ''},"${item.details || ''}"\n`;
        });
      } else {
        return res.status(400).json({ message: "Invalid report type" });
      }
      
      // Set response headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      
      // Send CSV data
      res.send(csvContent);
    } catch (error) {
      console.error("Error generating CSV report:", error);
      res.status(500).json({ message: "Error generating CSV report" });
    }
  });
  
  // Download reports in JSON format
  router.get("/reports/download/json", isAdmin, async (req: Request, res: Response) => {
    try {
      const reportType = req.query.reportType as string;
      const timeRange = req.query.timeRange as string || "7days";
      
      let data: any[] = [];
      let filename: string = '';
      
      if (reportType === "performance") {
        data = await reportsHelper.getUserPerformanceReport(timeRange);
        filename = `user_performance_${timeRange}_${new Date().toISOString().split('T')[0]}.json`;
      } else if (reportType === "activity") {
        data = await reportsHelper.getUserActivityReport(timeRange);
        filename = `user_activity_${timeRange}_${new Date().toISOString().split('T')[0]}.json`;
      } else {
        return res.status(400).json({ message: "Invalid report type" });
      }
      
      // Set response headers for JSON download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      
      // Send JSON data
      res.json(data);
    } catch (error) {
      console.error("Error generating JSON report:", error);
      res.status(500).json({ message: "Error generating JSON report" });
    }
  });
}
