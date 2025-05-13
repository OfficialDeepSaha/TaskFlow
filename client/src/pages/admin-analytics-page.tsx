import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
  Activity,
  ChevronRight,
  TrendingUp,
  Star,
  Calendar,
  Award,
  LucideIcon
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

// Colors for charts - more refined palette
const CHART_COLORS = {
  completed: '#10b981',
  inProgress: '#3b82f6',
  notStarted: '#6b7280',
  overdue: '#f43f5e',
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

// Card component for statistics with refined design
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}> = ({ title, value, subValue, icon, trend, color = "primary" }) => {
  return (
    <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card/50 to-background backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl sm:text-3xl font-bold">{value}</div>
            {subValue && (
              <div className="flex items-center mt-1">
                {trend === 'up' && (
                  <ArrowUp className="mr-1 h-3 w-3 text-emerald-500" />
                )}
                {trend === 'down' && (
                  <ArrowDown className="mr-1 h-3 w-3 text-rose-500" />
                )}
                {trend === 'neutral' && (
                  <ArrowRight className="mr-1 h-3 w-3 text-amber-500" />
                )}
                <p className={`text-xs ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-amber-500'}`}>
                  {subValue}
                </p>
              </div>
            )}
          </div>
          <div className={`rounded-full p-2 text-white bg-${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Loading spinner component - more refined
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-[200px]">
    <div className="relative">
      <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
      <div className="w-8 h-8 rounded-full border-4 border-primary/40 border-b-primary animate-spin absolute inset-0 m-auto" style={{ animationDirection: 'reverse' }}></div>
      <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
      </div>
    </div>
  </div>
);

// Chart placeholder component - more refined
const ChartPlaceholder: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}> = ({ icon, title, subtitle }) => (
  <div className="flex flex-col items-center justify-center h-full w-full py-16">
    <div className="text-muted-foreground/50 mb-6 p-6 rounded-full bg-muted/30 backdrop-blur-sm">
      {icon}
    </div>
    <h3 className="text-lg font-medium mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-xs text-center">{subtitle}</p>
  </div>
);

// Adjust TaskDistributionChart for responsiveness
const TaskDistributionChart: React.FC<{
  data: TaskStatusDistribution[];
  loading: boolean;
}> = ({ data, loading }) => {
  // Add colors to data
  const dataWithColors = data.map(item => ({
    ...item,
    color: getStatusColor(item.status)
  }));

  if (loading) {
    return <ChartPlaceholder 
      icon={<PieChartIcon className="h-10 w-10 opacity-20" />} 
      title="Task Distribution" 
      subtitle="Loading distribution data..." 
    />;
  }

  if (!data || data.length === 0) {
    return <ChartPlaceholder 
      icon={<PieChartIcon className="h-10 w-10 opacity-20" />} 
      title="No Task Data" 
      subtitle="No task distribution data available" 
    />;
  }

  // Convert status to display format (e.g., 'in_progress' -> 'In Progress')
  const formattedData = dataWithColors.map(item => {
    let displayStatus = item.status;
    
    // Handle different status formats
    if (STATUS_DISPLAY[item.status.toUpperCase()]) {
      displayStatus = STATUS_DISPLAY[item.status.toUpperCase()];
    } else if (item.status.toLowerCase() === 'in_progress') {
      displayStatus = 'In Progress';
    } else if (item.status.toLowerCase() === 'completed') {
      displayStatus = 'Completed';
    } else {
      // Convert snake_case or other formats to Title Case
      displayStatus = item.status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    return {
      ...item,
      status: displayStatus
    };
  });

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
            nameKey="status"
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <RechartsTooltip 
            formatter={(value, name) => [`${value} tasks`, name]} 
          />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
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

  if (!data || !data.length) {
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
          tickFormatter={(date) => {
            if (!date) return '';
            try {
              return format(parseISO(date), 'MMM dd');
            } catch (e) {
              return date;
            }
          }} 
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
          labelFormatter={(date: string) => {
            if (!date) return '';
            try {
              return format(parseISO(date), 'MMM dd, yyyy');
            } catch (e) {
              return date;
            }
          }}
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
          formatter={(value: number) => [`${(value || 0).toFixed(1)} days`, 'Avg. Completion Time']}
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
          formatter={(value: number) => [`${((value || 0) * 100).toFixed(1)}%`, 'Completion Rate']}
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

// Main component - enhance for full responsiveness
const AdminAnalyticsPage: React.FC = () => {
  const { toast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<ApiAnalyticsData>({
    userCompletionRates: [],
    taskStatusDistribution: [],
    taskTrends: [],
    overdueByPriority: [],
    timeToCompleteAvg: [],
    weeklyCompletionRate: [],
    summary: {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      notStartedTasks: 0,
      overdueTasks: 0,
      activeUsers: 0,
      avgCompletionTimeInDays: 0,
      completionRate: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch analytics data on mount
  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Make API call to get analytics data
      const response = await fetch(`/api/analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Ensure we're not getting cached data
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Calculate summary values from the response data
      const totalTasks = data.taskStatusDistribution?.reduce((acc: number, item: any) => acc + item.count, 0) || 0;
      const completedTasks = data.taskStatusDistribution?.find((item: any) => 
        item.status.toLowerCase() === 'completed' || item.status.toLowerCase() === 'done')?.count || 0;
      const inProgressTasks = data.taskStatusDistribution?.find((item: any) => 
        item.status.toLowerCase() === 'in_progress' || item.status.toLowerCase() === 'in progress')?.count || 0;
      const activeUsers = data.userCompletionRates?.length || 0;
      
      // Calculate completion rate
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      // Create the summary object that's expected by the UI
      const processedData = {
        ...data,
        summary: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          notStartedTasks: totalTasks - completedTasks - inProgressTasks,
          overdueTasks: data.overdueByPriority?.reduce((acc: number, item: any) => acc + item.count, 0) || 0,
          activeUsers,
          avgCompletionTimeInDays: data.timeToCompleteAvg?.[0]?.avgDays || 0,
          completionRate: Math.round(completionRate)
        },
        // Ensure weeklyCompletionRate exists with at least one item for the UI
        weeklyCompletionRate: data.weeklyCompletionRate || [{ week: 'This Week', completionRate: completionRate / 100 }]
      };
      
      // Process the data
      setAnalyticsData(processedData);
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      
      toast({
        title: "Failed to load analytics data",
        description: "There was an error processing the analytics data.",
        variant: "destructive",
      });
      
      setError((error as Error).message || "Failed to load analytics data");
      
    } finally {
      setLoading(false);
    }
  };

  // Error state component
  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center p-12 bg-destructive/5 rounded-lg border border-destructive/20">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-xl font-semibold mb-2">Unable to Load Analytics</h3>
      <p className="text-center text-muted-foreground mb-6 max-w-md">
        {error || "There was a problem loading the analytics data. This could be due to a network issue or the server may be unavailable."}
      </p>
      <Button onClick={fetchAnalyticsData} className="gap-2">
        <Activity className="h-4 w-4" /> Retry Loading Data
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Track your team's performance and task metrics
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" onClick={() => fetchAnalyticsData()} className="flex items-center gap-1">
            <Activity className="h-4 w-4" /> Refresh Data
          </Button>
        </div>
      </div>

      {error && !loading ? (
        <ErrorState />
      ) : (
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList className="w-full sm:w-auto overflow-x-auto scrollbar-none">
              <TabsTrigger value="overview" className="min-w-[100px]">Overview</TabsTrigger>
              <TabsTrigger value="tasks" className="min-w-[100px]">Tasks</TabsTrigger>
              <TabsTrigger value="team" className="min-w-[100px]">Team</TabsTrigger>
              <TabsTrigger value="time" className="min-w-[100px]">Time Analysis</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="overview" className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="overflow-hidden shadow">
                      <CardHeader className="pb-2">
                        <Skeleton className="h-4 w-20" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : (
                <>
                  <StatCard
                    title="Total Tasks"
                    value={analyticsData?.summary?.totalTasks || 0}
                    subValue={`${analyticsData?.weeklyCompletionRate?.[0]?.completionRate?.toFixed(0) || 0}% weekly completion`}
                    trend="neutral"
                    icon={<Activity className="h-5 w-5" />}
                    color="primary"
                  />
                  <StatCard
                    title="Completed Tasks"
                    value={analyticsData?.summary?.completedTasks || 0}
                    subValue={`${analyticsData?.summary?.completionRate?.toFixed(0) || 0}% completion rate`}
                    trend="up"
                    icon={<TrendingUp className="h-5 w-5" />}
                    color="success"
                  />
                  <StatCard
                    title="In Progress"
                    value={analyticsData?.summary?.inProgressTasks || 0}
                    subValue={`${((analyticsData?.summary?.inProgressTasks || 0) / (analyticsData?.summary?.totalTasks || 1) * 100).toFixed(0)}% of total`}
                    trend="neutral"
                    icon={<Activity className="h-5 w-5" />}
                    color="info"
                  />
                  <StatCard
                    title="Team Members"
                    value={analyticsData?.summary?.activeUsers || 0}
                    subValue="Active this week"
                    trend="up"
                    icon={<Users className="h-5 w-5" />}
                    color="warning"
                  />
                </>
              )}
            </div>

            {/* Main overview charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-md hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle>Task Status Distribution</CardTitle>
                  <CardDescription>Breakdown of tasks by their current status</CardDescription>
                </CardHeader>
                <CardContent>
                  <TaskDistributionChart data={analyticsData?.taskStatusDistribution || []} loading={loading} />
                </CardContent>
              </Card>

              <Card className="shadow-md hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle>Task Trends</CardTitle>
                  <CardDescription>How tasks have been created & completed over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <TaskTrendsChart data={analyticsData?.taskTrends || []} loading={loading} />
                </CardContent>
              </Card>
            </div>
            
            {/* Secondary charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-md hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle>Overdue Tasks by Priority</CardTitle>
                  <CardDescription>Distribution of overdue tasks by their priority level</CardDescription>
                </CardHeader>
                <CardContent>
                  <OverdueTasksChart data={analyticsData?.overdueByPriority || []} loading={loading} />
                </CardContent>
              </Card>

              <Card className="shadow-md hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle>Weekly Completion Rate</CardTitle>
                  <CardDescription>Task completion rate over recent weeks</CardDescription>
                </CardHeader>
                <CardContent>
                  <WeeklyCompletionChart data={analyticsData?.weeklyCompletionRate || []} loading={loading} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="tasks" className="space-y-4">
            {/* Task-specific analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-md hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle>Avg. Time to Complete</CardTitle>
                  <CardDescription>Average days to complete tasks by priority</CardDescription>
                </CardHeader>
                <CardContent>
                  <TimeToCompleteChart data={analyticsData?.timeToCompleteAvg || []} loading={loading} />
                </CardContent>
              </Card>

              <Card className="shadow-md hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle>Task Status Distribution</CardTitle>
                  <CardDescription>Breakdown of tasks by their current status</CardDescription>
                </CardHeader>
                <CardContent>
                  <TaskDistributionChart data={analyticsData?.taskStatusDistribution || []} loading={loading} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="team" className="space-y-4">
            {/* Team-specific analytics */}
            <Card className="shadow-md hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Team Member Performance</CardTitle>
                <CardDescription>Task completion rates by team member</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] sm:h-[400px]">
                  {loading ? (
                    <ChartPlaceholder 
                      icon={<Users className="h-10 w-10 opacity-20" />} 
                      title="Team Performance" 
                      subtitle="Loading team performance data..." 
                    />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={analyticsData?.userCompletionRates || []}
                        margin={{ top: 20, right: 10, left: 10, bottom: 70 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="userName" 
                          angle={-45} 
                          textAnchor="end" 
                          height={70} 
                          tick={{ fontSize: 12 }} 
                        />
                        <YAxis />
                        <RechartsTooltip
                          formatter={(value, name) => [
                            `${value}%`, 
                            name === "completionRate" ? "Completion Rate" : name
                          ]}
                        />
                        <Bar 
                          dataKey="completionRate" 
                          name="Completion Rate" 
                          fill={CHART_COLORS.inProgress} 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="time" className="space-y-4">
            {/* Time-based analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-md hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle>Avg. Time to Complete</CardTitle>
                  <CardDescription>Average days to complete tasks by priority</CardDescription>
                </CardHeader>
                <CardContent>
                  <TimeToCompleteChart data={analyticsData?.timeToCompleteAvg || []} loading={loading} />
                </CardContent>
              </Card>

              <Card className="shadow-md hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle>Weekly Completion Rate</CardTitle>
                  <CardDescription>Task completion rate over recent weeks</CardDescription>
                </CardHeader>
                <CardContent>
                  <WeeklyCompletionChart data={analyticsData?.weeklyCompletionRate || []} loading={loading} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AdminAnalyticsPage;
