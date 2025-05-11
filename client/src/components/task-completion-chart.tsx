import React, { useState, useEffect } from "react";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart, 
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { Task } from "@shared/schema";

interface User {
  id: number;
  name: string;
}
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  LineChart as LineChartIcon, 
  RefreshCcw,
  Gauge,
  ArrowRight,
  Clock,
  Activity
} from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { TaskStatus } from "@shared/schema";

// Types for our analytics data
interface WeeklyCompletionData {
  week: string;
  completed: number;
  inProgress: number;
  notStarted: number;
  total: number;
  completionRate: number;
}

interface AnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  completionRate: number;
  overdueTasks: number;
  activeUsers: number;
  dailyTaskCounts: Array<{
    day: string;
    count: number;
  }>;
}

interface UserPerformance {
  userId: number;
  userName: string;
  completed: number;
  total: number;
  completionRate: number;
}

export function TaskCompletionChart() {
  const [timeRange, setTimeRange] = useState("7days");
  const [chartType, setChartType] = useState("line");
  const [weeklyData, setWeeklyData] = useState<WeeklyCompletionData[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<UserPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("completion");

  // Chart colors
  const COLORS = {
    completed: "#16a34a", // green
    inProgress: "#eab308", // yellow
    notStarted: "#ef4444", // red
    total: "#3b82f6", // blue
    overdue: "#f43f5e", // rose
  };

  // Load data on component mount and when timeRange changes
  useEffect(() => {
    loadData();
  }, [timeRange]);

  // Function to load all analytics data
  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('Loading real-time analytics data from database...');
      
      // Fetch real weekly completion data from backend
      // First, try with /api prefixed endpoint
      try {
        // Load weekly completion data
        const weeklyResponse = await apiRequest('GET', `/api/analytics/weekly-completion?timeRange=${timeRange}`);
        const weeklyDataArray = await weeklyResponse.json();
        console.log('Weekly completion data:', weeklyDataArray);
        setWeeklyData(weeklyDataArray);
      } catch (error) {
        console.error('Error fetching weekly completion data:', error);
        // If we couldn't get data, fetch tasks directly and calculate stats
        const tasksResponse = await apiRequest('GET', '/api/tasks');
        const tasks = await tasksResponse.json();
        
        // Process tasks into weekly data format
        const now = new Date();
        const weeklyData = [];
        
        // Get tasks from the last 5 weeks
        for (let i = 4; i >= 0; i--) {
          const weekStart = startOfWeek(subDays(now, i * 7));
          const weekEnd = endOfWeek(subDays(now, i * 7));
          const weekName = i === 0 ? 'This Week' : `Week ${5-i}`;
          
          // Filter tasks for this week
          const weekTasks = tasks.filter((task: Task) => {
            const createdAt = task.createdAt ? new Date(task.createdAt) : null;
            return createdAt && createdAt >= weekStart && createdAt <= weekEnd;
          });
          
          const totalTasks = weekTasks.length;
          const completedTasks = weekTasks.filter((task: Task) => task.status === 'completed').length;
          const inProgressTasks = weekTasks.filter((task: Task) => task.status === 'in_progress').length;
          const notStartedTasks = weekTasks.filter((task: Task) => task.status === 'not_started').length;
          
          const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          
          weeklyData.push({
            week: weekName,
            completed: completedTasks,
            inProgress: inProgressTasks,
            notStarted: notStartedTasks,
            total: totalTasks,
            completionRate
          });
        }
        
        console.log('Calculated weekly data from tasks:', weeklyData);
        setWeeklyData(weeklyData);
      }
      
      // Calculate summary data from tasks
      try {
        const summaryResponse = await apiRequest('GET', '/api/analytics/summary');
        const summaryData = await summaryResponse.json();
        console.log('Summary data:', summaryData);
        setSummary(summaryData);
      } catch (error) {
        console.error('Error fetching summary data:', error);
        
        // Fetch tasks and calculate summary data
        const tasksResponse = await apiRequest('GET', '/api/tasks');
        const tasks = await tasksResponse.json();
        
        // Calculate summary data
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((task: Task) => task.status === 'completed').length;
        const inProgressTasks = tasks.filter((task: Task) => task.status === 'in_progress').length;
        const notStartedTasks = tasks.filter((task: Task) => task.status === 'not_started').length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        // Calculate overdue tasks
        const overdueTasks = tasks.filter((task: Task) => {
          if (task.status === 'completed') return false;
          if (!task.dueDate) return false;
          return new Date(task.dueDate) < new Date();
        }).length;
        
        // Fetch users
        const usersResponse = await apiRequest('GET', '/api/users');
        const users = await usersResponse.json();
        
        // Calculate daily task counts
        const now = new Date();
        const dailyTaskCounts = [];
        
        for (let i = 6; i >= 0; i--) {
          const date = subDays(now, i);
          const day = format(date, 'EEE');
          
          const dayTasks = tasks.filter((task: Task) => {
            const createdAt = task.createdAt ? new Date(task.createdAt) : null;
            return createdAt && format(createdAt, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
          }).length;
          
          dailyTaskCounts.push({
            day,
            count: dayTasks
          });
        }
        
        const calculatedSummary = {
          totalTasks,
          completedTasks, 
          inProgressTasks,
          notStartedTasks,
          completionRate,
          overdueTasks,
          activeUsers: users.length,
          dailyTaskCounts
        };
        
        console.log('Calculated summary data from tasks:', calculatedSummary);
        setSummary(calculatedSummary);
      }
      
      // Fetch team performance data
      try {
        const teamResponse = await apiRequest('GET', '/api/analytics/team-performance');
        const performanceData = await teamResponse.json();
        console.log('Team performance data:', performanceData);
        setTeamPerformance(performanceData);
      } catch (error) {
        console.error('Error fetching team performance data:', error);
        
        // Calculate team performance from tasks
        const tasksResponse = await apiRequest('GET', '/api/tasks');
        const tasks = await tasksResponse.json();
        
        const usersResponse = await apiRequest('GET', '/api/users');
        const users = await usersResponse.json();
        
        // Calculate performance for each user
        const teamPerformance = users.map((user: User) => {
          const userTasks = tasks.filter((task: Task) => task.assignedToId === user.id);
          const completedTasks = userTasks.filter((task: Task) => task.status === 'completed').length;
          const totalTasks = userTasks.length;
          const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
          
          return {
            userId: user.id,
            userName: user.name,
            completed: completedTasks,
            total: totalTasks,
            completionRate
          };
        });
        
        console.log('Calculated team performance from tasks:', teamPerformance);
        setTeamPerformance(teamPerformance);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      setIsLoading(false);
    }
  };

  // Fallback data for empty states
  const getEmptyWeeklyData = () => {
    const emptyData = [];
    for (let i = 0; i < 7; i++) {
      emptyData.push({
        week: `Week ${i+1}`,
        completed: 0,
        inProgress: 0,
        notStarted: 0,
        total: 0,
        completionRate: 0
      });
    }
    return emptyData;
  };

  // Handle loading and empty states
  const dataToDisplay = weeklyData.length > 0 ? weeklyData : getEmptyWeeklyData();

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm">{label}</p>
          <div className="space-y-1 mt-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-xs">{entry.name}:</span>
                </div>
                <span className="text-xs font-medium">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Animation variants for motion
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Task Completion Rate</CardTitle>
            <CardDescription>Weekly progress of task completion</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadData} title="Refresh data">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-6">
          <TabsList className="mx-auto mb-4">
            <TabsTrigger value="completion" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>Completion Rate</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Task Progress</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              <span>Team Performance</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <CardContent className="p-0">
          <TabsContent value="completion" className="mt-0">
            <div className="p-6">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-[300px] w-full" />
                </div>
              ) : (
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={fadeIn}
                  className="space-y-6"
                >
                  {/* Completion Rate Metrics */}
                  {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-emerald-50 to-transparent dark:from-emerald-900/20 dark:to-transparent border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Completion Rate</div>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.completionRate}%</div>
                        <Progress className="h-2 mt-2" value={summary.completionRate} />
                      </div>
                      
                      <div className="bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/20 dark:to-transparent border border-blue-100 dark:border-blue-900/30 rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Completed Tasks</div>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.completedTasks}</div>
                        <div className="text-xs text-muted-foreground mt-2">{summary.totalTasks > 0 ? Math.round((summary.completedTasks / summary.totalTasks) * 100) : 0}% of total</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-yellow-50 to-transparent dark:from-yellow-900/20 dark:to-transparent border border-yellow-100 dark:border-yellow-900/30 rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">In Progress</div>
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.inProgressTasks}</div>
                        <div className="text-xs text-muted-foreground mt-2">{summary.totalTasks > 0 ? Math.round((summary.inProgressTasks / summary.totalTasks) * 100) : 0}% of total</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-red-50 to-transparent dark:from-red-900/20 dark:to-transparent border border-red-100 dark:border-red-900/30 rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Overdue Tasks</div>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.overdueTasks}</div>
                        <div className="text-xs text-muted-foreground mt-2">
                          {summary.totalTasks > 0 ? Math.round((summary.overdueTasks / summary.totalTasks) * 100) : 0}% of total
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Line Chart for Completion Rate */}
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dataToDisplay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                        <XAxis dataKey="week" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="completionRate"
                          name="Completion Rate (%)"
                          stroke="#16a34a"
                          activeDot={{ r: 8 }}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="progress" className="mt-0">
            <div className="p-6">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-[300px] w-full" />
                </div>
              ) : (
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={fadeIn}
                >
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dataToDisplay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                        <XAxis dataKey="week" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="completed" name="Completed" fill={COLORS.completed} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="inProgress" name="In Progress" fill={COLORS.inProgress} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="notStarted" name="Not Started" fill={COLORS.notStarted} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="performance" className="mt-0">
            <div className="p-6">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-[300px] w-full" />
                </div>
              ) : (
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={fadeIn}
                  className="space-y-6"
                >
                  {/* Team Performance */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Team Performance</h3>
                      <div className="space-y-4">
                        {teamPerformance.length > 0 ? (
                          teamPerformance.map((user) => (
                            <div key={user.userId} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                                  <span className="font-medium">{user.userName}</span>
                                </div>
                                <div className="text-sm">
                                  <Badge variant={user.completionRate >= 70 ? "default" : user.completionRate >= 40 ? "secondary" : "destructive"}>
                                    {Math.round(user.completionRate * 100)}%
                                  </Badge>
                                </div>
                              </div>
                              <Progress value={user.completionRate * 100} className="h-2" />
                              <div className="text-xs text-muted-foreground">
                                {user.completed} of {user.total} tasks completed
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            No team performance data available
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      {teamPerformance.length > 0 && (
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={teamPerformance.map(user => ({
                              subject: user.userName,
                              A: user.completionRate * 100,
                              fullMark: 100
                            }))}>
                              <PolarGrid stroke="#374151" />
                              <PolarAngleAxis dataKey="subject" stroke="#9ca3af" />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} />
                              <Radar
                                name="Performance"
                                dataKey="A"
                                stroke="#3b82f6"
                                fill="#3b82f6"
                                fillOpacity={0.6}
                              />
                              <Tooltip />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>

      <CardFooter className="pt-0 pb-4 px-6">
        <div className="w-full flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date().toLocaleString()}
          </div>
          
        </div>
      </CardFooter>
    </Card>
  );
}
