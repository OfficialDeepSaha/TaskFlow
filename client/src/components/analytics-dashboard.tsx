import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
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
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Type definitions for analytics data
interface TaskCompletionData {
  userId: number;
  userName: string;
  completed: number;
  total: number;
  completionRate: number;
}

interface TaskStatusDistribution {
  status: string;
  count: number;
}

interface TaskTrendData {
  date: string;
  completed: number;
  created: number;
  overdue: number;
}

interface AnalyticsData {
  userCompletionRates: TaskCompletionData[];
  taskStatusDistribution: TaskStatusDistribution[];
  taskTrends: TaskTrendData[];
  overdueByPriority: {
    priority: string;
    count: number;
  }[];
  timeToCompleteAvg: {
    priority: string;
    avgDays: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const TIME_PERIODS = ['7days', '30days', 'week', 'month'];

export function AnalyticsDashboard() {
  const [timePeriod, setTimePeriod] = useState<string>('7days');
  
  // Get the date range based on selected time period
  const getDateRange = () => {
    const today = new Date();
    
    switch (timePeriod) {
      case '7days':
        return {
          start: format(subDays(today, 7), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
      case '30days':
        return {
          start: format(subDays(today, 30), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
      case 'week':
        return {
          start: format(startOfWeek(today), 'yyyy-MM-dd'),
          end: format(endOfWeek(today), 'yyyy-MM-dd')
        };
      case 'month':
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd')
        };
      default:
        return {
          start: format(subDays(today, 7), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
    }
  };
  
  // Fetch analytics data
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics', timePeriod],
    queryFn: async () => {
      const { start, end } = getDateRange();
      const response = await axios.get(`/api/analytics?startDate=${start}&endDate=${end}`);
      return response.data as AnalyticsData;
    }
  });
  
  // Format percentage for display
  const formatPercentage = (value: number) => `${Math.round(value * 100)}%`;
  
  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-[250px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-destructive/20 rounded-lg">
        <h2 className="text-2xl font-bold text-destructive mb-2">Error Loading Analytics</h2>
        <p>There was a problem loading the analytics data. Please try again later.</p>
        <Button onClick={handleRefresh} className="mt-4" variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <div className="flex items-center gap-2">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Performance</TabsTrigger>
          <TabsTrigger value="tasks">Task Metrics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Task Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Task Status Distribution</CardTitle>
                <CardDescription>Distribution of tasks by current status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.taskStatusDistribution}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name}: ${formatPercentage(percent)}`}
                      >
                        {data?.taskStatusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value, 'Count']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Overdue Tasks by Priority */}
            <Card>
              <CardHeader>
                <CardTitle>Overdue Tasks by Priority</CardTitle>
                <CardDescription>Number of overdue tasks by priority level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.overdueByPriority}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="priority" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Overdue Tasks" fill="#FF8042" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Task Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Task Activity Trends</CardTitle>
                <CardDescription>Created, completed, and overdue tasks over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data?.taskTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="created" name="Created Tasks" stroke="#0088FE" />
                      <Line type="monotone" dataKey="completed" name="Completed Tasks" stroke="#00C49F" />
                      <Line type="monotone" dataKey="overdue" name="Overdue Tasks" stroke="#FF8042" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {/* User Completion Rates */}
          <Card>
            <CardHeader>
              <CardTitle>User Task Completion Rates</CardTitle>
              <CardDescription>Task completion percentage by user</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={data?.userCompletionRates}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 1]} tickFormatter={formatPercentage} />
                    <YAxis type="category" dataKey="userName" width={80} />
                    <Tooltip formatter={(value) => [formatPercentage(value as number), 'Completion Rate']} />
                    <Legend />
                    <Bar dataKey="completionRate" name="Completion Rate" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Task Counts by User */}
          <Card>
            <CardHeader>
              <CardTitle>Task Counts by User</CardTitle>
              <CardDescription>Total vs. completed tasks by user</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={data?.userCompletionRates}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="userName" width={80} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Total Tasks" fill="#0088FE" />
                    <Bar dataKey="completed" name="Completed Tasks" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Average Time to Complete by Priority */}
            <Card>
              <CardHeader>
                <CardTitle>Average Time to Complete</CardTitle>
                <CardDescription>Average days to complete tasks by priority</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.timeToCompleteAvg}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="priority" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} days`, 'Average Time']} />
                      <Legend />
                      <Bar dataKey="avgDays" name="Average Days" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Task Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Task Status Distribution</CardTitle>
                <CardDescription>Distribution of tasks by current status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.taskStatusDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Tasks" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* Task Trends Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Task Activity Over Time</CardTitle>
              <CardDescription>Created, completed, and overdue tasks by date</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.taskTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="created" name="Created Tasks" stroke="#0088FE" />
                    <Line type="monotone" dataKey="completed" name="Completed Tasks" stroke="#00C49F" />
                    <Line type="monotone" dataKey="overdue" name="Overdue Tasks" stroke="#FF8042" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
