import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DownloadCloud, 
  FileDown, 
  RefreshCw, 
  FileSpreadsheet, 
  UserCheck, 
  Clock, 
  Activity, 
  Calendar, 
  BarChart3,
  FileJson,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, normalizeApiUrl } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";

// Define types for our report data
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

export default function ReportsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("performance");
  const [timeRange, setTimeRange] = useState("7days");
  
  // Use React Query for data fetching with automatic loading states and caching
  const { 
    data: performanceData,
    isLoading: isLoadingPerformance,
    refetch: refetchPerformance
  } = useQuery<UserPerformance[]>({
    queryKey: ['reports', 'performance', timeRange],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/reports/user-performance?timeRange=${timeRange}`);
        const data = await response.json();
        return data as UserPerformance[];
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
        toast({
          title: "Error loading performance data",
          description: "Could not fetch the performance report data. Please try again.",
          variant: "destructive"
        });
        return [];
      }
    },
    initialData: []
  });
  
  const { 
    data: activityData,
    isLoading: isLoadingActivity,
    refetch: refetchActivity
  } = useQuery<UserActivity[]>({
    queryKey: ['reports', 'activity', timeRange],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/reports/user-activity?timeRange=${timeRange}`);
        const data = await response.json();
        return data as UserActivity[];
      } catch (error) {
        console.error('Failed to fetch activity data:', error);
        toast({
          title: "Error loading activity data",
          description: "Could not fetch the activity report data. Please try again.",
          variant: "destructive"
        });
        return [];
      }
    },
    initialData: []
  });
  
  // Determine if any data is being loaded
  const isLoading = isLoadingPerformance || isLoadingActivity;
  
  // Function to refetch data when timeRange changes
  useEffect(() => {
    refetchPerformance();
    refetchActivity();
  }, [timeRange, refetchPerformance, refetchActivity]);
  
  // Function to manually refetch data
  const refreshData = () => {
    refetchPerformance();
    refetchActivity();
    toast({
      title: "Refreshing data",
      description: "Fetching the latest report data."
    });
  };
  
  // Function to download data as CSV
  const downloadCSV = async (reportType: string) => {
    try {
      // Call the API endpoint to get the CSV file
      const response = await apiRequest('GET', `/api/reports/download/csv?reportType=${reportType}&timeRange=${timeRange}`);
      
      // Convert the response to a blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Create a link element and simulate a click to download the file
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_${timeRange}_report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Report downloaded",
        description: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report has been downloaded as CSV.`,
      });
    } catch (error) {
      console.error('Failed to download report data:', error);
      toast({
        title: "Download failed",
        description: "There was an error downloading the report. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Function to download data as JSON
  const downloadJSON = async (reportType: string) => {
    try {
      // Call the API endpoint to get the JSON file
      const response = await apiRequest('GET', `/api/reports/download/json?reportType=${reportType}&timeRange=${timeRange}`);
      
      // Convert the response to a blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Create a link element and simulate a click to download the file
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_${timeRange}_report.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Report downloaded",
        description: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report has been downloaded as JSON.`,
      });
    } catch (error) {
      console.error('Failed to download report data:', error);
      toast({
        title: "Download failed",
        description: "There was an error downloading the report. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports Dashboard</h2>
          <p className="text-muted-foreground">View and download real-time user performance and activity reports</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button size="icon" variant="outline" className="h-9 w-9" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="performance" className="flex items-center gap-1.5">
            <UserCheck className="h-4 w-4" />
            <span>Performance Reports</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            <span>Activity Reports</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="performance" className="space-y-6">
          <Card className="border border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">User Performance</CardTitle>
                  <CardDescription>
                    Performance metrics across all team members
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1.5"
                    onClick={() => downloadCSV('performance')}
                    disabled={isLoading}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>CSV</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1.5"
                    onClick={() => downloadJSON('performance')}
                    disabled={isLoading}
                  >
                    <FileJson className="h-4 w-4" />
                    <span>JSON</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-64 w-full flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    <p className="mt-4 text-sm text-muted-foreground">Loading performance data...</p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[450px] w-full rounded-md border">
                  <div className="p-4">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left pb-3 px-4">User</th>
                          <th className="text-left pb-3 px-4">Tasks Completed</th>
                          <th className="text-left pb-3 px-4">On-Time Rate</th>
                          <th className="text-left pb-3 px-4">Avg Time Per Task</th>
                          <th className="text-left pb-3 px-4">Tasks Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceData && performanceData.length > 0 ? (
                          performanceData.map((user, index) => (
                            <tr key={user.userId || index} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="py-3 px-4">{user.name}</td>
                              <td className="py-3 px-4">{user.tasksCompleted}</td>
                              <td className="py-3 px-4">
                                <Badge 
                                  variant={user.onTimeRate >= 90 ? "default" : user.onTimeRate >= 75 ? "secondary" : "destructive"}
                                  className={`font-normal ${user.onTimeRate >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : user.onTimeRate >= 75 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : ''}`}
                                >
                                  {user.onTimeRate}%
                                </Badge>
                              </td>
                              <td className="py-3 px-4">{user.avgTimePerTask} hours</td>
                              <td className="py-3 px-4">{user.tasksCreated}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-muted-foreground">
                              No performance data available for the selected time range.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-6">
          <Card className="border border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">User Activity Log</CardTitle>
                  <CardDescription>
                    Detailed record of user actions and task interactions
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1.5"
                    onClick={() => downloadCSV('activity')}
                    disabled={isLoading}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>CSV</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1.5"
                    onClick={() => downloadJSON('activity')}
                    disabled={isLoading}
                  >
                    <FileJson className="h-4 w-4" />
                    <span>JSON</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-64 w-full flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    <p className="mt-4 text-sm text-muted-foreground">Loading activity data...</p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[450px] w-full rounded-md border">
                  <div className="p-4">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left pb-3 px-4">User</th>
                          <th className="text-left pb-3 px-4">Date</th>
                          <th className="text-left pb-3 px-4">Action</th>
                          <th className="text-left pb-3 px-4">Task</th>
                          <th className="text-left pb-3 px-4">Time</th>
                          <th className="text-left pb-3 px-4">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityData && activityData.length > 0 ? (
                          activityData.map((activity) => (
                            <tr key={activity.id} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="py-3 px-4">{activity.user}</td>
                              <td className="py-3 px-4">{activity.date}</td>
                              <td className="py-3 px-4">
                                <Badge 
                                  variant={
                                    activity.action === 'completed' ? "default" : 
                                    activity.action === 'created' ? "default" :
                                    activity.action === 'updated' ? "outline" :
                                    activity.action === 'deleted' ? "destructive" : "secondary"
                                  }
                                  className={`font-normal ${activity.action === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : ''}`}
                                >
                                  {activity.action}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">{activity.task}</td>
                              <td className="py-3 px-4">{activity.time}</td>
                              <td className="py-3 px-4">{activity.details}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-muted-foreground">
                              No activity data available for the selected time range.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
