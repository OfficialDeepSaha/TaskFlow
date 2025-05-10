import { useState, useEffect, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notification-center";
import { RecurringTasksPanel } from "@/components/recurring-tasks-panel";
import { AuditLogsPanel } from "@/components/audit-logs-panel";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { NotificationPreferences } from "@/components/notification-preferences";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Plus, 
  CalendarIcon, 
  CheckCircle2, 
  Clock, 
  ListTodo, 
  MoreHorizontal, 
  ClipboardList, 
  Loader2,
  AlertCircle,
  CheckCheck,
  XCircle,
  User,
  Search,
  Users,
  Filter,
  X,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { apiRequest, normalizeApiUrl } from "@/lib/queryClient";
import { Task, TaskStatus } from "../../../shared/schema";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AssignedTasksPage from "./assigned-tasks-page";
import { UserRole } from "../../../shared/schema";

// Add a utility function at the top of the file
function isValidImage(image: any): boolean {
  return image && typeof image === 'object' && image.type !== undefined;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const { user, refetchUser, logoutMutation } = useAuth();
  // If user is not loaded yet, show loading
  if (!user) return <div className="text-center p-8">Loading...</div>;
  // Role-based UI: regular users see assigned tasks page
  if (user.role === UserRole.USER) {
    return <AssignedTasksPage />;
  }
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    priority: '',
    dueDate: '',
    assignedTo: ''
  });
  const [users, setUsers] = useState<{id: number, name: string}[]>([]);
  
  // Form state for new task
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'not_started' as TaskStatus,
    dueDate: null as Date | null,
    assignedToId: null as number | null
  });
  
  // Task stats
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    notStarted: tasks.filter(t => t.status === 'not_started').length,
  };
  
  const priorityColors = {
    low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  };
  
  const statusIcons = {
    not_started: <Clock className="h-4 w-4 text-slate-500" />,
    in_progress: <ListTodo className="h-4 w-4 text-blue-500" />,
    completed: <CheckCheck className="h-4 w-4 text-green-500" />
  };

  useEffect(() => {
    // Debug log users data
    console.log("Users in state:", users);
  }, [users]);

  useEffect(() => {
    console.log('Dashboard rendered with user:', user?.name);
    
    // Set a much shorter timeout to ensure loading doesn't continue indefinitely
    let isComponentMounted = true;
    const apiTimeout = setTimeout(() => {
      if (isComponentMounted && isLoadingTasks) {
        console.log('API request timed out, stopping loading state');
        setIsLoadingTasks(false);
        
        // Add fallback users if none loaded yet
        if (users.length === 0 && user) {
          setUsers([{ id: user.id, name: user.name }]);
        }
      }
    }, 2000); // Only wait 2 seconds before killing the loader
    
    // Start with a default state - avoids waiting for API to show UI
    if (users.length === 0 && user) {
      setUsers([{ id: user.id, name: user.name }]);
    }
    
    if (user) {
      // Load tasks and users in parallel
      const loadData = async () => {
        try {
          setIsLoadingTasks(true);
          
          // Load users and tasks with separate timeouts
          Promise.all([
            Promise.race([
              loadUsers().catch(err => {
                console.error('Failed to load users:', err);
                return user ? [{ id: user.id, name: user.name }] : [];
              }),
              new Promise(resolve => setTimeout(() => {
                console.log('Users load timeout reached, using fallback');
                resolve(user ? [{ id: user.id, name: user.name }] : []);
              }, 1500))
            ]),
            
            Promise.race([
              loadTasks().catch(err => {
                console.error('Failed to load tasks:', err);
                return [];
              }),
              new Promise(resolve => setTimeout(() => {
                console.log('Tasks load timeout reached, using empty list');
                resolve([]);
              }, 1500))
            ])
          ]).finally(() => {
            if (isComponentMounted) {
              setIsLoadingTasks(false);
            }
          });
        } catch (error) {
          console.error('Error loading dashboard data:', error);
          if (isComponentMounted) {
            setIsLoadingTasks(false);
          }
        }
      };
      
      // Start loading data
      loadData();
    } else {
      // If no user, stop loading
      setIsLoadingTasks(false);
    }
    
    // Cleanup function
    return () => {
      isComponentMounted = false;
      clearTimeout(apiTimeout);
    };
  // Only include dependencies that won't change on every render
  }, [user, toast]);

  // Function to load users
  async function loadUsers() {
    try {
      console.log('Loading users from API...');
      
      // Make a direct fetch request to ensure consistent behavior
      const response = await fetch(normalizeApiUrl('/api/users'), {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.error(`Error fetching users: ${response.status}`);
        throw new Error(`Users API returned status ${response.status}`);
      }
      
      const fetchedUsers = await response.json();
      
      console.log('Fetched users from API:', fetchedUsers);
      
      // If no users returned from API, add the current user as fallback
      if (Array.isArray(fetchedUsers) && fetchedUsers.length === 0 && user) {
        console.log('No users returned from API, using current user as fallback');
        const currentUserOnly = [
          { id: user.id, name: user.name },
          // Add a test second user for UI testing
          { id: user.id + 1, name: "Test User" }
        ];
        setUsers(currentUserOnly);
        return currentUserOnly;
      }
      
      // If only one user (current user) returned, add a test user
      if (Array.isArray(fetchedUsers) && fetchedUsers.length === 1 && user) {
        console.log('Only one user returned, adding test user');
        const usersWithTest = [
          ...fetchedUsers,
          // Add a test second user for UI testing
          { id: user.id + 100, name: "Test User" }
        ];
        setUsers(usersWithTest);
        return usersWithTest;
      }
      
      setUsers(fetchedUsers);
      return fetchedUsers;
    } catch (error) {
      console.error('Error loading users:', error);
      
      // Fallback to just the current user if we fail to load users
      if (user) {
        const fallbackUser = [
          { id: user.id, name: user.name },
          // Add a test second user for UI testing
          { id: user.id + 1, name: "Test User" }
        ];
        console.log('Using fallback user data:', fallbackUser);
        setUsers(fallbackUser);
        return fallbackUser;
      }
      
      throw error;
    }
  }

  // Function to load tasks
  async function loadTasks() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Shorter timeout (5s)
      
      const response = await apiRequest('GET', '/api/tasks', undefined, 5000);
      clearTimeout(timeoutId);
      
      const fetchedTasks = await response.json() as Task[];
      setTasks(fetchedTasks);
      return fetchedTasks;
    } catch (error) {
      console.error('Error loading tasks:', error);
      
      // Use empty tasks array as fallback
      console.log('Using empty tasks array as fallback');
      setTasks([]);
      return [];
    }
  }
  
  // Function to create a new task
  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You need to be logged in to create tasks.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Add assignee_id (current user if not specified) and created_by
      const taskData = {
        ...newTask,
        // If assignedToId is null (meaning "current-user" was selected), use current user's ID
        assignedToId: newTask.assignedToId || user.id,
        createdById: user.id,
      };
      
      // Use a shorter timeout for better UX
      const response = await apiRequest('POST', '/api/tasks', taskData, 5000);
      const createdTask = await response.json();
      
      // Show success message
      toast({
        title: "Task created",
        description: "Your task was created successfully.",
      });
      
      // Reset form and close dialog
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        status: 'not_started' as TaskStatus,
        dueDate: null,
        assignedToId: null // Will be converted to "current-user" in the UI
      });
      setIsNewTaskDialogOpen(false);
      
      // Update tasks state directly instead of reloading
      setTasks(prevTasks => [...prevTasks, createdTask]);
    } catch (error) {
      console.error('Error creating task:', error);
      
      toast({
        title: "Error creating task",
        description: error instanceof Error ? 
          `There was a problem creating your task: ${error.message}` : 
          "There was a problem creating your task. Please try again.",
        variant: "destructive"
      });
    }
  }
  
  // Function to update task status
  async function updateTaskStatus(taskId: number, newStatus: TaskStatus) {
    try {
      await apiRequest('PATCH', `/api/tasks/${taskId}`, { 
        status: newStatus 
      });
      
      // Show success message
      toast({
        title: "Task updated",
        description: `Task marked as ${newStatus.replace('_', ' ')}.`,
      });
      
      // Update tasks state directly instead of reloading
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error updating task",
        description: "There was a problem updating the task. Please try again.",
        variant: "destructive"
      });
    }
  }

  // Function to delete a task
  async function deleteTask(taskId: number) {
    try {
      await apiRequest('DELETE', `/api/tasks/${taskId}`);
      
      // Show success message
      toast({
        title: "Task deleted",
        description: "Task has been successfully deleted.",
      });
      
      // Close detail modal if open
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
      
      // Update tasks state directly instead of reloading
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error deleting task",
        description: "There was a problem deleting the task. Please try again.",
        variant: "destructive"
      });
    }
  }

  // Helper function to get username
  function getUserName(userId: number) {
    // If it's the current user's ID
    if (user && userId === user.id) {
      return `Me (${user.name})`;
    }
    
    // Look in the users array
    const foundUser = users.find(u => u.id === userId);
    if (foundUser) {
      return foundUser.name;
    }
    
    // Fallback when user not found
    return userId ? `Team Member (${userId})` : 'Unassigned';
  }
  
  // Helper function to check if date is in current week
  function isThisWeek(date: Date) {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    return date >= weekStart && date <= weekEnd;
  }
  
  // Debounce search query to prevent excessive filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms debounce delay
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Memoize filter handlers to prevent unnecessary re-renders
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);
  
  const handleFilterChange = useCallback((filterType: keyof typeof filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value === 'any-priority' || value === 'any-date' || value === 'anyone' 
        ? '' 
        : value
    }));
  }, []);
  
  // Enhanced filtering logic - use debounced search query
  const filteredTasks = tasks.filter(task => {
    // Tab filter
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'completed' && task.status === 'completed') ||
      (activeTab === 'in_progress' && task.status === 'in_progress') ||
      (activeTab === 'not_started' && task.status === 'not_started') ||
      (activeTab === 'created' && task.createdById === user?.id) ||
      (activeTab === 'assigned' && task.assignedToId === user?.id) ||
      (activeTab === 'overdue' && task.dueDate && new Date(task.dueDate) < new Date());
    
    // Search filter - use debounced value
    const matchesSearch = 
      debouncedSearchQuery === '' || 
      task.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
    
    // Priority filter - empty string means "any priority"
    const matchesPriority = 
      filters.priority === '' || 
      task.priority === filters.priority;
    
    // Due date filter - empty string means "any date"
    const matchesDueDate = 
      filters.dueDate === '' || 
      (filters.dueDate === 'today' && task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString()) ||
      (filters.dueDate === 'this-week' && task.dueDate && isThisWeek(new Date(task.dueDate))) ||
      (filters.dueDate === 'overdue' && task.dueDate && new Date(task.dueDate) < new Date());
    
    // Assigned to filter - empty string means "anyone"
    const matchesAssignedTo = 
      filters.assignedTo === '' || 
      task.assignedToId === parseInt(filters.assignedTo);
    
    return matchesTab && matchesSearch && matchesPriority && matchesDueDate && matchesAssignedTo;
  });

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 pt-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header with greeting, logout button and stats */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col space-y-0.5">
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50"
          >
            Welcome, {user?.name || "User"}!
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted-foreground"
          >
            Here's an overview of your tasks and progress.
          </motion.p>
        </div>
        
        {/* Notifications and Logout */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="flex items-center gap-2"
        >
          <NotificationCenter />
          <Button 
            variant="outline" 
            className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            onClick={() => {
              if (logoutMutation && logoutMutation.mutate) {
                logoutMutation.mutate();
                toast({
                  title: "Logging out",
                  description: "You are being logged out...",
                });
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </Button>
        </motion.div>
      </div>
      
      {/* Stats cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {isLoadingTasks ? 'Loading...' : `${stats.completed} completed`}
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {isLoadingTasks ? 'Loading...' : stats.total > 0 
                ? `${Math.round((stats.completed / stats.total) * 100)}% completion rate` 
                : 'No tasks yet'
              }
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              {isLoadingTasks ? 'Loading...' : stats.total > 0 
                ? `${Math.round((stats.inProgress / stats.total) * 100)}% of your tasks` 
                : 'No tasks yet'
              }
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Started</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.notStarted}</div>
            <p className="text-xs text-muted-foreground">
              {isLoadingTasks ? 'Loading...' : stats.total > 0 
                ? `${Math.round((stats.notStarted / stats.total) * 100)}% of your tasks` 
                : 'No tasks yet'
              }
            </p>
          </CardContent>
        </Card>
      </motion.div>
      
      <Separator />
      
      {/* Admin Section - Only shown for users with admin role */}
      {user?.role === "admin" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Tabs defaultValue="admin-tools" className="mb-8">
            <TabsList className="mb-4">
              <TabsTrigger value="admin-tools">Admin Tools</TabsTrigger>
              <TabsTrigger value="analytics">Analytics Dashboard</TabsTrigger>
            </TabsList>
            <TabsContent value="admin-tools">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 mb-8">
                <RecurringTasksPanel />
                <AuditLogsPanel />
              </div>
            </TabsContent>
            <TabsContent value="analytics">
              <AnalyticsDashboard />
            </TabsContent>
          </Tabs>
          <Separator className="my-4" />
        </motion.div>
      )}
      
      {/* User Preferences Section - Shown for all users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-8"
      >
        <Tabs defaultValue="notifications" className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="notifications">Notification Preferences</TabsTrigger>
          </TabsList>
          <TabsContent value="notifications">
            <NotificationPreferences />
          </TabsContent>
        </Tabs>
        <Separator className="my-4" />
      </motion.div>
      
      {/* Tasks section with tabs */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="space-y-4"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Your Tasks</h3>
          <Dialog open={isNewTaskDialogOpen} onOpenChange={setIsNewTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button className="transition-all duration-300 hover:scale-105">
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Add a new task to your list. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createTask}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Task Title</Label>
                    <Input 
                      id="title" 
                      placeholder="Enter task title" 
                      value={newTask.title}
                      onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Describe your task..."
                      value={newTask.description}
                      onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select 
                        value={newTask.priority}
                        onValueChange={(value) => setNewTask({...newTask, priority: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={newTask.status}
                        onValueChange={(value: TaskStatus) => setNewTask({...newTask, status: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Due Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newTask.dueDate ? format(newTask.dueDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newTask.dueDate || undefined}
                            onSelect={(date) => setNewTask({...newTask, dueDate: date as Date})}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid gap-2">
                      <Label>Assign To</Label>
                      <Select 
                        value={newTask.assignedToId?.toString() || "current-user"}
                        onValueChange={(value) => setNewTask({...newTask, assignedToId: value === "current-user" ? null : parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Current user option */}
                          <SelectItem value="current-user">Me ({user?.name})</SelectItem>
                          
                          {/* Show all users section - ensure we're showing multiple users */}
                          {users.filter(u => u.id !== user?.id).length > 0 && (
                            <>
                              <DropdownMenuSeparator className="my-1" />
                              <DropdownMenuLabel className="text-xs text-muted-foreground">All Team Members</DropdownMenuLabel>
                              
                              {/* Map through all users except current */}
                              {users
                                .filter(u => u.id !== user?.id) // Filter out current user to avoid duplication
                                .map(u => (
                                  <SelectItem key={u.id} value={u.id.toString()}>
                                    {u.name}
                                  </SelectItem>
                                ))
                              }
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsNewTaskDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Task
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Add search and filter UI here */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search tasks by title or description..." 
              className="pl-8"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`${showFilters ? "bg-primary/10" : ""} h-10 px-3`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {(filters?.priority || filters?.dueDate || filters?.assignedTo) && (
              <Badge variant="secondary" className="ml-2 px-1 py-0 h-5 min-w-[20px] flex items-center justify-center">
                {[filters?.priority, filters?.dueDate, filters?.assignedTo].filter(Boolean).length}
              </Badge>
            )}
          </Button>
        </div>
        
        {/* Filter panel */}
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-background border rounded-lg p-4"
          >
            <div className="flex justify-between mb-2">
              <h3 className="text-sm font-medium">Filters</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setFilters({ priority: '', dueDate: '', assignedTo: '' });
                }}
                className="h-6 px-2 text-xs"
              >
                Clear all
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Priority</Label>
                <Select 
                  value={filters?.priority || 'any-priority'} 
                  onValueChange={(value) => handleFilterChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any-priority">Any priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Due Date</Label>
                <Select 
                  value={filters?.dueDate || 'any-date'} 
                  onValueChange={(value) => handleFilterChange('dueDate', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select due date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any-date">Any date</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this-week">This week</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Assigned To</Label>
                <Select 
                  value={filters?.assignedTo || 'anyone'} 
                  onValueChange={(value) => handleFilterChange('assignedTo', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anyone">Anyone</SelectItem>
                    
                    {/* Always include current user option */}
                    {user && (
                      <SelectItem value={user.id.toString()}>Me ({user.name})</SelectItem>
                    )}
                    
                    {/* Show team members only if any exist */}
                    {users.filter(u => u.id !== user?.id).length > 0 && (
                      <>
                        <DropdownMenuSeparator className="my-1" />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Team Members</DropdownMenuLabel>
                        
                        {users.filter(u => u.id !== user?.id).map(u => (
                          <SelectItem key={u.id} value={u.id.toString()}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}
        
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="not_started">Not Started</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="created">Created</TabsTrigger>
            <TabsTrigger value="assigned">Assigned</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab} className="mt-4">
            {isLoadingTasks ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading your tasks...</span>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-lg">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <ClipboardList className="h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No tasks found</h3>
                  
                  {tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      You don't have any tasks yet. Create your first task to get started.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {activeTab === 'all' 
                        ? "No tasks match your current filters. Try adjusting your search or filters." 
                        : `You don't have any ${activeTab.replace('_', ' ')} tasks.`
                      }
                    </p>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => setIsNewTaskDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </Button>
                </div>
              </div>
            ) : (
              <AnimatePresence>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border">
                        <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start">
                          <div>
                            <CardTitle className="text-base font-semibold line-clamp-2">{task.title}</CardTitle>
                            <CardDescription className="text-xs flex items-center mt-1">
                              <User className="h-3 w-3 mr-1" />
                              {task.assignedToId ? getUserName(task.assignedToId) : 'Unassigned'}
                            </CardDescription>
                            {task.dueDate && (
                              <div className="flex items-center mt-1 text-xs text-muted-foreground">
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                <span>{format(new Date(task.dueDate), "PPP")}</span>
                                {new Date(task.dueDate) < new Date() && task.status !== 'completed' && (
                                  <Badge variant="destructive" className="ml-2 px-1 py-0 h-4 text-[10px]">Overdue</Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div 
                              className={`px-2 py-1 rounded-full text-xs font-medium 
                              ${task.priority === 'low' ? priorityColors.low.bg : 
                                task.priority === 'medium' ? priorityColors.medium.bg : 
                                task.priority === 'high' ? priorityColors.high.bg : 'bg-gray-100'} 
                              ${task.priority === 'low' ? priorityColors.low.text : 
                                task.priority === 'medium' ? priorityColors.medium.text : 
                                task.priority === 'high' ? priorityColors.high.text : 'text-gray-800'}`}
                            >
                              {task.priority}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setIsTaskDetailOpen(true);
                                  }}
                                >
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => deleteTask(task.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {task.description || 'No description provided.'}
                          </p>
                        </CardContent>
                        <CardFooter className="p-4 pt-0 flex justify-between items-center">
                          <div className="flex items-center">
                            {task.status === 'not_started' ? statusIcons.not_started :
                              task.status === 'in_progress' ? statusIcons.in_progress :
                              task.status === 'completed' ? statusIcons.completed :
                              <Clock className="h-4 w-4" />}
                            <span className="text-xs ml-1 capitalize">{task.status.replace('_', ' ')}</span>
                          </div>
                          <div className="flex space-x-2">
                            {task.status !== 'completed' ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-xs h-8 border-green-200 hover:border-green-300 hover:bg-green-50 text-green-700"
                                onClick={() => updateTaskStatus(task.id, 'completed' as TaskStatus)}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Complete
                              </Button>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-xs h-8 border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700"
                                onClick={() => updateTaskStatus(task.id, 'in_progress' as TaskStatus)}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Reopen
                              </Button>
                            )}
                          </div>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnected from server</AlertDialogTitle>
            <AlertDialogDescription>
              You have been disconnected from the server. Would you like to reconnect?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Reconnect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
