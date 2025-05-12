import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart as BarChartIcon, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  Users, 
  Clock, 
  ArrowUp, 
  ArrowDown, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  Activity 
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  LineChart as RechartsLineChart, 
  Line, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar 
} from "recharts";
import { format, parseISO, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

// Real-time data interfaces
interface TaskTrend {
  date: string;
  created: number;
  completed: number;
  inProgress: number;
}

interface TaskStatusDistribution {
  status: string;
  count: number;
  color?: string;
}

interface UserCompletionRate {
  userId: string;
  userName: string;
  completed: number;
  total: number;
  completionRate: number;
}

interface OverdueTasksByPriority {
  priority: string;
  count: number;
  color?: string;
}

interface TimeToCompleteAvg {
  priority: string;
  avgDays: number;
}

interface WeeklyCompletionRate {
  week: string;
  completionRate: number;
}

interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
  status: string;
  assignedTo?: string;
  department?: string;
}

interface AnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  overdueTasks: number;
  activeUsers: number;
  avgCompletionTimeInDays: number;
  completionRate: number;
}

interface ApiAnalyticsData {
  userCompletionRates: UserCompletionRate[];
  taskStatusDistribution: TaskStatusDistribution[];
  taskTrends: TaskTrend[];
  overdueByPriority: OverdueTasksByPriority[];
  timeToCompleteAvg: TimeToCompleteAvg[];
  weeklyCompletionRate: WeeklyCompletionRate[];
  summary: AnalyticsSummary;
}

// Colors for charts
const CHART_COLORS = {
  completed: '#10b981',
  inProgress: '#3b82f6',
  notStarted: '#6b7280',
  overdue: '#ef4444',
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
  engineering: '#3b82f6',
  marketing: '#8b5cf6',
  design: '#ec4899',
  finance: '#f59e0b',
  operations: '#14b8a6',
  hr: '#6366f1',
  it: '#0ea5e9',
};

// Status mapping for display
const STATUS_DISPLAY: Record<string, string> = {
  'TODO': 'Not Started',
  'IN_PROGRESS': 'In Progress',
  'DONE': 'Completed',
  'CANCELLED': 'Cancelled',
  'ON_HOLD': 'On Hold'
};

// Map status to colors
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'DONE':
      return CHART_COLORS.completed;
    case 'IN_PROGRESS':
      return CHART_COLORS.inProgress;
    case 'TODO':
      return CHART_COLORS.notStarted;
    case 'ON_HOLD':
      return '#f59e0b';
    case 'CANCELLED':
      return '#9ca3af';
    default:
      return '#6b7280';
  }
};

// Map priority to colors
const getPriorityColor = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case 'high':
      return CHART_COLORS.high;
    case 'medium':
      return CHART_COLORS.medium;
    case 'low':
      return CHART_COLORS.low;
    default:
      return '#6b7280';
  }
};

// Function to format date for display
const formatDateForDisplay = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM dd, yyyy');
  } catch (error) {
    return dateString;
  }
};

// Card component for statistics
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ title, value, subValue, icon, trend }) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          {icon}
          <span className="ml-2">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subValue && (
          <div className={`text-xs flex items-center ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
            {trend === 'up' && <ArrowUp className="h-3 w-3 mr-1" />}
            {trend === 'down' && <ArrowDown className="h-3 w-3 mr-1" />}
            {subValue}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Loading spinner component
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-[200px]">
    <div className="relative">
      <div className="w-10 h-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
      <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
      </div>
    </div>
  </div>
);

// Chart placeholder component
const ChartPlaceholder: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}> = ({ icon, title, subtitle }) => (
  <div className="flex flex-col items-center justify-center h-full w-full">
    <div className="text-muted-foreground/50 mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-medium mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
  </div>
);

// Task distribution pie chart component
const TaskDistributionChart: React.FC<{
  data: TaskStatusDistribution[];
  loading: boolean;
}> = ({ data, loading }) => {
  const formattedData = data.map((item: TaskStatusDistribution) => ({
    ...item,
    name: STATUS_DISPLAY[item.status] || item.status,
    color: getStatusColor(item.status)
  }));

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!data.length) {
    return (
      <ChartPlaceholder
        icon={<PieChartIcon className="h-12 w-12" />}
        title="No Task Data Available"
        subtitle="Task status distribution will appear here"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPieChart>
        <Pie
          data={formattedData}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {formattedData.map((entry: TaskStatusDistribution, index: number) => (
            <Cell key={`cell-${index}`} fill={entry.color || '#6b7280'} />
          ))}
        </Pie>
        <RechartsTooltip />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

// Task trends line chart component
const TaskTrendsChart: React.FC<{
  data: TaskTrend[];
  loading: boolean;
}> = ({ data, loading }) => {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (!data.length) {
    return (
      <ChartPlaceholder
        icon={<LineChartIcon className="h-12 w-12" />}
        title="No Trend Data Available"
        subtitle="Task trends over time will appear here"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tickFormatter={(date) => format(parseISO(date), 'MMM dd')} 
        />
        <YAxis />
        <RechartsTooltip 
          formatter={(value: number, name: string) => [
            value, 
            name === 'completed' 
              ? 'Completed' 
              : name === 'inProgress' 
                ? 'In Progress' 
                : 'Created'
          ]}
          labelFormatter={(date: string) => format(parseISO(date), 'MMM dd, yyyy')}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="completed" 
          stroke={CHART_COLORS.completed} 
          activeDot={{ r: 8 }} 
          name="Completed" 
        />
        <Line 
          type="monotone" 
          dataKey="inProgress" 
          stroke={CHART_COLORS.inProgress} 
          name="In Progress" 
        />
        <Line 
          type="monotone" 
          dataKey="created" 
          stroke="#9333ea" 
          name="Created" 
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

// Overdue tasks by priority chart component
const OverdueTasksChart: React.FC<{
  data: OverdueTasksByPriority[];
  loading: boolean;
}> = ({ data, loading }) => {
  const formattedData = data.map((item: OverdueTasksByPriority) => ({
    ...item,
    color: getPriorityColor(item.priority)
  }));

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!data.length) {
    return (
      <ChartPlaceholder
        icon={<BarChartIcon className="h-12 w-12" />}
        title="No Overdue Tasks"
        subtitle="Overdue tasks by priority will appear here"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="priority" />
        <YAxis />
        <RechartsTooltip 
          formatter={(value: number) => [`${value} tasks`, 'Overdue']}
        />
        <Legend />
        <Bar 
          dataKey="count" 
          name="Overdue Tasks" 
          fill={CHART_COLORS.overdue}
          radius={[4, 4, 0, 0]}
        >
          {formattedData.map((entry: OverdueTasksByPriority, index: number) => (
            <Cell key={`cell-${index}`} fill={entry.color || '#6b7280'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// Time to complete chart component
const TimeToCompleteChart: React.FC<{
  data: TimeToCompleteAvg[];
  loading: boolean;
}> = ({ data, loading }) => {
  const formattedData = data.map((item: TimeToCompleteAvg) => ({
    ...item,
    color: getPriorityColor(item.priority)
  }));

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!data.length) {
    return (
      <ChartPlaceholder
        icon={<Clock className="h-12 w-12" />}
        title="No Completion Time Data"
        subtitle="Average time to complete tasks will appear here"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="priority" />
        <YAxis />
        <RechartsTooltip 
          formatter={(value: number) => [`${value.toFixed(1)} days`, 'Avg. Completion Time']}
        />
        <Legend />
        <Bar 
          dataKey="avgDays" 
          name="Avg. Days to Complete" 
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        >
          {formattedData.map((entry: TimeToCompleteAvg & { color?: string }, index: number) => (
            <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// Weekly completion rate chart component
const WeeklyCompletionChart: React.FC<{
  data: WeeklyCompletionRate[];
  loading: boolean;
}> = ({ data, loading }) => {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (!data.length) {
    return (
      <ChartPlaceholder
        icon={<Activity className="h-12 w-12" />}
        title="No Weekly Completion Data"
        subtitle="Weekly completion rates will appear here"
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" />
        <YAxis 
          tickFormatter={(value) => `${value * 100}%`}
          domain={[0, 1]}
        />
        <RechartsTooltip 
          formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Completion Rate']}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="completionRate" 
          stroke="#10b981" 
          name="Completion Rate" 
          dot={{ strokeWidth: 2, r: 4 }}
          activeDot={{ r: 8, strokeWidth: 2 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

// Main analytics dashboard component
const AdminAnalyticsPage: React.FC = () => {
  // State for data
  const [analyticsData, setAnalyticsData] = useState<ApiAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("7days");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const { toast } = useToast();

  // Fetch data from API
  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/analytics/dashboard?timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics data: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data. Please try again.');
      toast({
        title: "Error",
        description: "Failed to load analytics data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when component mounts or timeRange changes
  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  // Loading state
  if (isLoading && !analyticsData) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">Loading analytics data...</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading analytics data...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">There was an error loading the analytics data.</p>
          </div>
        </div>
        
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Error Loading Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error}</p>
            <Button onClick={fetchAnalyticsData}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track team performance and task metrics
          </p>
        </div>
        <div className="flex items-center">
          <div className="flex space-x-2">
            <Button
              variant={timeRange === "7days" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange("7days")}
            >
              7 Days
            </Button>
            <Button
              variant={timeRange === "30days" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange("30days")}
            >
              30 Days
            </Button>
            <Button
              variant={timeRange === "90days" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange("90days")}
            >
              90 Days
            </Button>
          </div>
        </div>
      </div>

      {analyticsData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard 
              title="Total Tasks" 
              value={analyticsData.summary.totalTasks}
              subValue={`${(analyticsData.summary.completionRate * 100).toFixed(1)}% completion rate`}
              icon={<BarChartIcon className="h-4 w-4 text-muted-foreground" />}
              trend="neutral"
            />
            
            <StatCard 
              title="Completed Tasks" 
              value={analyticsData.summary.completedTasks}
              subValue="Tasks finished"
              icon={<PieChartIcon className="h-4 w-4 text-muted-foreground" />}
              trend="up"
            />
            
            <StatCard 
              title="Active Users" 
              value={analyticsData.summary.activeUsers}
              subValue="Contributing team members"
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              trend="neutral"
            />
            
            <StatCard 
              title="Avg. Completion Time" 
              value={`${analyticsData.summary.avgCompletionTimeInDays.toFixed(1)} days`}
              subValue="Time to complete tasks"
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
              trend={analyticsData.summary.avgCompletionTimeInDays < 7 ? "up" : "down"}
            />
          </div>

          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Task Trends</TabsTrigger>
              <TabsTrigger value="performance">User Performance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Task Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TaskDistributionChart 
                      data={analyticsData.taskStatusDistribution} 
                      loading={isLoading}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Overdue Tasks by Priority</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <OverdueTasksChart 
                      data={analyticsData.overdueByPriority} 
                      loading={isLoading}
                    />
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Users className="mr-2 h-5 w-5 text-muted-foreground" />
                    <span>Top Performers</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-3 rounded-md border">
                          <Skeleton className="h-5 w-32 mb-2" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <ul className="space-y-3">
                        {analyticsData.userCompletionRates.slice(0, 5).map((performer: UserCompletionRate) => (
                          <li key={performer.userId} className="p-3 rounded-md border bg-background hover:bg-muted/20 transition-colors">
                            <div className="font-medium flex items-center justify-between">
                              <span>{performer.userName}</span>
                              <span className="text-sm bg-primary/10 text-primary py-1 px-2 rounded-full">
                                {Math.round(performer.completionRate * 100)}%
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1 flex items-center justify-between">
                              <span>Team Member</span>
                              <span className="flex items-center">
                                <BarChartIcon className="h-3 w-3 mr-1" />
                                {performer.completed} / {performer.total} tasks
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="trends" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Task Trends Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <TaskTrendsChart 
                    data={analyticsData.taskTrends} 
                    loading={isLoading}
                  />
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Weekly Completion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <WeeklyCompletionChart 
                      data={analyticsData.weeklyCompletionRate} 
                      loading={isLoading}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Average Time to Complete</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimeToCompleteChart 
                      data={analyticsData.timeToCompleteAvg} 
                      loading={isLoading}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="performance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">User Completion Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {analyticsData.userCompletionRates.map((user: UserCompletionRate) => (
                        <div key={user.userId} className="border p-4 rounded-lg bg-background">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium">{user.userName}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              user.completionRate >= 0.7 
                                ? 'bg-green-100 text-green-800' 
                                : user.completionRate >= 0.4 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {(user.completionRate * 100).toFixed(1)}% Completion
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full">
                            <div 
                              className="h-2 rounded-full bg-primary" 
                              style={{ width: `${user.completionRate * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{user.completed} completed</span>
                            <span>{user.total} total</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </div>
  );
};

export default AdminAnalyticsPage;
