import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, BarChart, PieChart, Line, Bar, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  LineChart as LineChartIcon, 
  Activity, 
  CreditCard, 
  DollarSign, 
  Users, 
  ArrowUp, 
  ArrowDown, 
  ArrowRight,
  Calendar,
  Clock,
  Filter,
  Zap,
  BarChart4,
  Layers,
  Download,
  RefreshCcw,
  Gauge
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data - replace with real API data in production
const taskCompletionData = [
  { name: 'Jan', completed: 65, inProgress: 28, notStarted: 12 },
  { name: 'Feb', completed: 75, inProgress: 20, notStarted: 10 },
  { name: 'Mar', completed: 80, inProgress: 15, notStarted: 8 },
  { name: 'Apr', completed: 85, inProgress: 12, notStarted: 6 },
  { name: 'May', completed: 90, inProgress: 10, notStarted: 5 },
  { name: 'Jun', completed: 93, inProgress: 7, notStarted: 4 },
  { name: 'Jul', completed: 80, inProgress: 12, notStarted: 8 },
];

const taskDistributionData = [
  { name: 'Backend', value: 35, color: '#2563eb' },
  { name: 'Frontend', value: 25, color: '#db2777' },
  { name: 'Design', value: 20, color: '#16a34a' },
  { name: 'QA', value: 15, color: '#eab308' },
  { name: 'DevOps', value: 5, color: '#9333ea' },
];

const userActivityData = [
  { name: 'Mon', tasks: 12, hours: 7 },
  { name: 'Tue', tasks: 19, hours: 8 },
  { name: 'Wed', tasks: 15, hours: 7.5 },
  { name: 'Thu', tasks: 18, hours: 8.2 },
  { name: 'Fri', tasks: 14, hours: 6.8 },
  { name: 'Sat', tasks: 8, hours: 4 },
  { name: 'Sun', tasks: 5, hours: 3 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A259FF'];

export function AnalyticsDashboard() {
  const [activeChart, setActiveChart] = useState("performance");
  const [timeRange, setTimeRange] = useState("7days");
  const [isLoading, setIsLoading] = useState(false);
  
  // Load data effect
  useEffect(() => {
    async function loadAnalyticsData() {
      setIsLoading(true);
      try {
        // In production, fetch actual data
        // const data = await apiRequest('/api/analytics', { timeRange });
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
        setIsLoading(false);
      }
    }
    
    loadAnalyticsData();
  }, [timeRange]);
  
  const fadeInAnimation = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
  };
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Monitor team performance and track task completion metrics.</p>
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
          <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setIsLoading(true)}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-9 flex gap-2 items-center">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>
      
      {/* Stats Overview Cards */}
      <motion.div 
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, staggerChildren: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20 hover:shadow-md transition-all duration-200 border-blue-200 dark:border-blue-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/70 flex items-center justify-center">
              <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247</div>
            <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
              <ArrowUp className="h-3 w-3 mr-1" />
              <span>12% increase</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/40 dark:to-green-900/20 hover:shadow-md transition-all duration-200 border-green-200 dark:border-green-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/70 flex items-center justify-center">
              <Gauge className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">84%</div>
            <div className="flex items-center text-xs text-green-600 dark:text-green-400">
              <ArrowUp className="h-3 w-3 mr-1" />
              <span>7% increase</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-purple-900/20 hover:shadow-md transition-all duration-200 border-purple-200 dark:border-purple-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/70 flex items-center justify-center">
              <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <div className="flex items-center text-xs text-purple-600 dark:text-purple-400">
              <ArrowRight className="h-3 w-3 mr-1" />
              <span>Stable</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 hover:shadow-md transition-all duration-200 border-amber-200 dark:border-amber-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
            <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/70 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4 days</div>
            <div className="flex items-center text-xs text-amber-600 dark:text-amber-400">
              <ArrowDown className="h-3 w-3 mr-1" />
              <span>0.5 days faster</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-4 lg:h-[500px]">
        {/* Performance Chart - Takes 3 columns on larger screens */}
        <Card className="lg:col-span-3 hover:shadow-md transition-all duration-200 border-muted">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Task Completion Trends</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100">Completed</Badge>
                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100">In Progress</Badge>
                <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100">Not Started</Badge>
              </div>
            </div>
            <CardDescription>Monthly task completion statistics</CardDescription>
          </CardHeader>
          <CardContent className="p-0 h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={taskCompletionData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="name" className="text-xs text-muted-foreground" />
                  <YAxis className="text-xs text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    }} 
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend />
                  <Bar dataKey="completed" stackId="a" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="inProgress" stackId="a" fill="#eab308" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="notStarted" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        {/* Task Distribution Pie Chart - Takes 1 column */}
        <Card className="hover:shadow-md transition-all duration-200 border-muted">
          <CardHeader>
            <CardTitle>Task Distribution</CardTitle>
            <CardDescription>By department</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {taskDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      }} 
                      itemStyle={{ fontSize: '12px' }}
                    />
                    <Legend 
                      layout="vertical" 
                      verticalAlign="middle" 
                      align="right"
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* User Activity Chart */}
      <Card className="hover:shadow-md transition-all duration-200 border-muted">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Activity</CardTitle>
              <CardDescription>Task completion and time spent</CardDescription>
            </div>
            <Select defaultValue="weekly">
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={userActivityData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="name" className="text-xs text-muted-foreground" />
                <YAxis yAxisId="left" className="text-xs text-muted-foreground" />
                <YAxis yAxisId="right" orientation="right" className="text-xs text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  }} 
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="tasks" stroke="#2563eb" activeDot={{ r: 8 }} strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      
      {/* Bottom Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Top Performers */}
        <Card className="hover:shadow-md transition-all duration-200 border-muted">
          <CardHeader className="pb-2">
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Team members with highest completion rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-[180px]">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center">
                    <div className="font-medium text-sm w-10">1.</div>
                    <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center mr-2">
                      <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">JD</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Jane Doe</div>
                      <div className="text-xs text-muted-foreground">Frontend Developer</div>
                    </div>
                    <div className="text-sm font-medium">98%</div>
                  </div>
                  <Separator />
                  <div className="flex items-center">
                    <div className="font-medium text-sm w-10">2.</div>
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mr-2">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">RB</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Robert Brown</div>
                      <div className="text-xs text-muted-foreground">Project Manager</div>
                    </div>
                    <div className="text-sm font-medium">96%</div>
                  </div>
                  <Separator />
                  <div className="flex items-center">
                    <div className="font-medium text-sm w-10">3.</div>
                    <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mr-2">
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">ST</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Sarah Thomas</div>
                      <div className="text-xs text-muted-foreground">UX Designer</div>
                    </div>
                    <div className="text-sm font-medium">92%</div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Upcoming Deadlines */}
        <Card className="hover:shadow-md transition-all duration-200 border-muted">
          <CardHeader className="pb-2">
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Tasks due in the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-[180px]">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
                </div>
              ) : (
                <>
                  <div className="flex">
                    <div className="p-2 rounded-md bg-red-50 dark:bg-red-900/20 mr-3">
                      <Calendar className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">API Integration (Backend)</div>
                      <div className="text-xs text-muted-foreground">Due: Tomorrow at 5:00 PM</div>
                      <Badge variant="outline" className="mt-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">High</Badge>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex">
                    <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 mr-3">
                      <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">User Dashboard Redesign</div>
                      <div className="text-xs text-muted-foreground">Due: In 3 days</div>
                      <Badge variant="outline" className="mt-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">Medium</Badge>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex">
                    <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/20 mr-3">
                      <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Weekly Team Meeting</div>
                      <div className="text-xs text-muted-foreground">Due: In 5 days</div>
                      <Badge variant="outline" className="mt-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">Low</Badge>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
       
      </div>
    </div>
  );
}
