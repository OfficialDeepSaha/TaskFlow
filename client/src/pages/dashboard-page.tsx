import { useState, useEffect, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NotificationCenter } from "@/components/notification-center";
import { RecentActivities } from "@/components/recent-activities";
import { RecurringTasksPanel } from "@/components/recurring-tasks-panel";
import { TaskCompletionChart } from "@/components/task-completion-chart";
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
  Trash2,
  Gauge,
  PieChart,
  LineChart,
  BarChart3,
  LayoutDashboard,
  UserCheck,
  Activity,
  FileBarChart,
  Bell,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { apiRequest, normalizeApiUrl } from "@/lib/queryClient";
import { Task, TaskStatus, RecurringPattern } from "../../../shared/schema";
import { UserRole } from "../../../shared/schema";
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
import { StatsCard } from "@/components/stats-card";
import { ActivityTimeline } from "@/components/activity-timeline";
import { TaskPriorityBadge } from "@/components/task-badge";

// Add a utility function at the top of the file
function isValidImage(image: any): boolean {
  return image && typeof image === 'object' && image.type !== undefined;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const { user, refetchUser, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  
  // If user is not loaded yet, show loading
  if (!user) return (
    <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
        <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        </div>
      </div>
    </div>
  );
  
  // Initialize state variables for both admin and user dashboards
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const handleOpenNewTaskDialog = () => {
    // Make sure users are loaded before opening dialog
    if (users.length === 0) {
      loadUsers().then(() => {
        console.log('Users loaded for task dialog:', users);
        setIsNewTaskDialogOpen(true);
      });
    } else {
      console.log('Using existing users for task dialog:', users);
      setIsNewTaskDialogOpen(true);
    }
  };
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
    assignedToId: null as number | null,
    isRecurring: false,
    recurringPattern: 'none' as RecurringPattern,
    recurringEndDate: null as Date | null
  });
  
  // Role-based UI: regular users see assigned tasks page without duplicate layout
  if (user.role === UserRole.USER) {
    // Create a wrapper that includes the needed layout components but just changes the content
    // This avoids duplicating the navbar and sidebar while still showing the user dashboard
    return (
      <div className="space-y-8">
        {/* User Dashboard Header */}
        <div className="flex flex-col space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Tasks Assigned to Me
              </h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, {user.name}! Here are your assigned tasks.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Only show New Task button for admin users */}
              {user && user.role && user.role.toString() === "admin" && (
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 border-dashed"
                  onClick={handleOpenNewTaskDialog}
                >
                  <Plus className="h-4 w-4" />
                  <span>New Task</span>
                </Button>
              )}
            </div>
          </motion.div>
        </div>

        {/* User Dashboard Content */}
        <div>
          <AssignedTasksPage inDashboard={true} />
        </div>

        {/* New Task Dialog */}
        <Dialog open={isNewTaskDialogOpen} onOpenChange={setIsNewTaskDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to your list.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createTask}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Task Title</Label>
                  <Input 
                    id="title" 
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    placeholder="Enter task title"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    placeholder="Enter task description (optional)"
                    className="h-20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={newTask.priority}
                      onValueChange={(value) => setNewTask({...newTask, priority: value})}
                    >
                      <SelectTrigger id="priority">
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
                      onValueChange={(value) => setNewTask({...newTask, status: value as TaskStatus})}
                    >
                      <SelectTrigger id="status">
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
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        id="dueDate"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTask.dueDate ? format(newTask.dueDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newTask.dueDate || undefined}
                        onSelect={(date) => setNewTask({...newTask, dueDate: date || null})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewTaskDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Task</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  
  // Task stats (admin dashboard only)
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
  
  const statusIcons: Record<TaskStatus, React.ReactNode> = {
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
    
    console.log('Creating task with users:', users);
    
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
        assignedToId: null, // Will be converted to "current-user" in the UI
        isRecurring: false,
        recurringPattern: 'none' as RecurringPattern,
        recurringEndDate: null
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
    <div className="space-y-8">
      {/* Admin Dashboard Header */}
      <div className="flex flex-col space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user.name}! Here's what's happening with your team today.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
           
            
            <Link href="/admin/reports">
              <Button variant="outline" className="flex items-center gap-2">
                <FileBarChart className="h-4 w-4" />
                <span className="hidden sm:inline-block">Reports</span>
              </Button>
            </Link>
            
            <Button 
              variant={isLoadingTasks ? "secondary" : "default"} 
              className="flex items-center gap-2"
              onClick={() => {
                loadTasks();
                loadUsers();
              }}
              disabled={isLoadingTasks}
            >
              {isLoadingTasks ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4" />
                  <span className="hidden sm:inline-block">Refresh</span>
                </>
              )}
            </Button>
          </div>
        </motion.div>

       
      </div>

      {/* Dashboard Overview Stats */}
      <AnimatePresence>
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {/* Total Tasks */}
            <Card className="hover:shadow-md transition-all duration-300 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent border-blue-100 dark:border-blue-900/30 overflow-hidden group">
              <CardHeader className="pb-2">
                <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-blue-100/80 dark:bg-blue-900/20 blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-3xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center">
                      <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center mr-2">
                        <Activity className="h-3 w-3 mr-1" /> +{stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}%
                      </span>
                      since last week
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks Completed */}
            <Card className="hover:shadow-md transition-all duration-300 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20 dark:to-transparent border-green-100 dark:border-green-900/30 overflow-hidden group">
              <CardHeader className="pb-2">
                <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-green-100/80 dark:bg-green-900/20 blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-3xl font-bold">{stats.completed}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center">
                      <span className="text-green-600 dark:text-green-400 font-medium flex items-center mr-2">
                        <Activity className="h-3 w-3 mr-1" /> +{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                      </span>
                      completion rate
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* In Progress Tasks */}
            <Card className="hover:shadow-md transition-all duration-300 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20 dark:to-transparent border-amber-100 dark:border-amber-900/30 overflow-hidden group">
              <CardHeader className="pb-2">
                <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-amber-100/80 dark:bg-amber-900/20 blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-3xl font-bold">{stats.inProgress}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center">
                      <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center mr-2">
                        <Clock className="h-3 w-3 mr-1" /> {stats.inProgress} tasks
                      </span>
                      awaiting completion
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <ListTodo className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card className="hover:shadow-md transition-all duration-300 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20 dark:to-transparent border-purple-100 dark:border-purple-900/30 overflow-hidden group">
              <CardHeader className="pb-2">
                <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-purple-100/80 dark:bg-purple-900/20 blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-3xl font-bold">{users.length}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center">
                      <span className="text-purple-600 dark:text-purple-400 font-medium flex items-center mr-2">
                        <UserCheck className="h-3 w-3 mr-1" /> {users.length} active
                      </span>
                      team members
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Completion Rate Chart - Dynamic with Real-time Data */}
      <AnimatePresence>
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="mt-6"
          >
            <TaskCompletionChart />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Dashboard Overview Content */}
      <AnimatePresence>
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid gap-6 grid-cols-1 lg:grid-cols-3"
          >
            {/* Tasks Overview - Left Column (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Search and Filter */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">Tasks Overview</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 px-3 flex items-center gap-1"
                        onClick={() => setShowFilters(!showFilters)}
                      >
                        <Filter className="h-4 w-4" />
                        <span>Filter</span>
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="h-9"
                        onClick={handleOpenNewTaskDialog}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        <span>Add Task</span>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tasks..."
                      className="pl-10 bg-background/50"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t animate-in slide-in-from-top duration-300">
                      <div className="space-y-2">
                        <Label htmlFor="priority-filter">Priority</Label>
                        <Select 
                          value={filters.priority} 
                          onValueChange={(value) => setFilters({...filters, priority: value})}
                        >
                          <SelectTrigger id="priority-filter">
                            <SelectValue placeholder="All Priorities" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Priorities</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="assigned-filter">Assigned To</Label>
                        <Select 
                          value={filters.assignedTo} 
                          onValueChange={(value) => setFilters({...filters, assignedTo: value})}
                        >
                          <SelectTrigger id="assigned-filter">
                            <SelectValue placeholder="All Members" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Members</SelectItem>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="due-date-filter">Due Date</Label>
                        <Select 
                          value={filters.dueDate} 
                          onValueChange={(value) => setFilters({...filters, dueDate: value})}
                        >
                          <SelectTrigger id="due-date-filter">
                            <SelectValue placeholder="Any Time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Any Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="this-week">This Week</SelectItem>
                            <SelectItem value="next-week">Next Week</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </CardHeader>
                
                <CardContent className="p-0">
                  {isLoadingTasks ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
                        <div className="text-sm text-muted-foreground">Loading tasks...</div>
                      </div>
                    </div>
                  ) : tasks.length > 0 ? (
                    <div className="divide-y divide-border/40">
                      {tasks.slice(0, 5).map(task => (
                        <div 
                          key={task.id} 
                          className="p-4 flex items-center justify-between hover:bg-accent/5 transition-colors duration-200 group cursor-pointer"
                          onClick={() => {
                            setSelectedTask(task);
                            setIsTaskDetailOpen(true);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center
                              ${task.status === 'completed' ? 'bg-green-100 dark:bg-green-900/50' : 
                                task.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/50' : 
                                'bg-slate-100 dark:bg-slate-800'}`}
                            >
                              {statusIcons[task.status as TaskStatus]}
                            </div>
                            <div>
                              <div className="font-medium text-sm group-hover:text-primary transition-colors">
                                {task.title}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                                <TaskPriorityBadge priority={task.priority} />
                                {task.dueDate && (
                                  <span className="flex items-center text-xs text-muted-foreground">
                                    <CalendarIcon className="h-3 w-3 mr-1" />
                                    Due {format(new Date(task.dueDate), "MMM dd")}
                                  </span>
                                )}
                                {task.assignedToId && (
                                  <span className="flex items-center text-xs text-muted-foreground">
                                    <User className="h-3 w-3 mr-1" />
                                    {getUserName(task.assignedToId)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(task);
                                setIsAlertOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newStatus = 
                                  task.status === 'not_started' ? ('in_progress' as TaskStatus) :
                                  task.status === 'in_progress' ? ('completed' as TaskStatus) : ('not_started' as TaskStatus);
                                updateTaskStatus(task.id, newStatus);
                              }}
                            >
                              {task.status === 'completed' ? 'Reopen' :
                               task.status === 'in_progress' ? 'Complete' : 'Start'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 flex-col">
                      <ClipboardList className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No tasks found</p>
                      <Button 
                        variant="link" 
                        className="mt-2"
                        onClick={handleOpenNewTaskDialog}
                      >
                        Create your first task
                      </Button>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="border-t flex items-center justify-between py-3 px-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min(5, tasks.length)} of {tasks.length} tasks
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/tasks">View All Tasks</Link>
                  </Button>
                </CardFooter>
              </Card>
              
              
              {/* <Card className="border-border/40">
                
                <CardContent className="pl-2">
                  <div className="h-[200px] w-full">
                    <AnalyticsDashboard />
                  </div>
                </CardContent>
              </Card> */}
            </div>
            
            {/* Activity Timeline - Right Column (1/3 width) */}
            <div className="space-y-6">
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
                  <CardDescription>Latest updates from your team</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentActivities />
                </CardContent>
              </Card>
              
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">Team Members</CardTitle>
                  <CardDescription>Active members in your workspace</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users.slice(0, 5).map(user => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center bg-primary/10 text-primary font-medium text-sm`}>
                            {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{user.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {tasks.filter(t => t.assignedToId === user.id).length} assigned tasks
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                        >
                          Active
                        </Badge>
                      </div>
                    ))}
                    
                    {users.length === 0 && (
                      <div className="text-center py-6">
                        <Users className="h-10 w-10 mx-auto mb-4" />
                        <p className="text-muted-foreground">No team members found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t py-3">
                  <Button variant="outline" size="sm" className="mx-auto" asChild>
                    <Link href="/team-members">Manage Team</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Analytics Section */}
      <AnimatePresence>
        {activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <AnalyticsDashboard />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Team Section */}
      <AnimatePresence>
        {activeTab === 'team' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Team Management</CardTitle>
                <CardDescription>Manage your team members and their permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground text-center py-10">
                  <Users className="h-10 w-10 mx-auto mb-4" />
                  <p>Team management interface will be implemented here.</p>
                  <p className="text-sm">This section would typically contain team member management, permissions, etc.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Settings Section */}
      <AnimatePresence>
        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">System Settings</CardTitle>
                <CardDescription>Configure system-wide settings and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="w-full grid grid-cols-3 mb-6">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                  </TabsList>
                  <TabsContent value="general">
                    <NotificationPreferences />
                  </TabsContent>
                  <TabsContent value="notifications">
                    <div className="text-muted-foreground text-center py-10">
                      <Bell className="h-10 w-10 mx-auto mb-4" />
                      <p>Notification settings will be implemented here.</p>
                    </div>
                  </TabsContent>
                  <TabsContent value="security">
                    <div className="text-muted-foreground text-center py-10">
                      <Shield className="h-10 w-10 mx-auto mb-4" />
                      <p>Security settings will be implemented here.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Dialogs and Forms */}
      {/* New Task Dialog */}
      <Dialog open={isNewTaskDialogOpen} onOpenChange={setIsNewTaskDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add details for the new task to be assigned to a team member.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createTask}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  placeholder="Enter task title"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  placeholder="Enter task description (optional)"
                  className="h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) => setNewTask({...newTask, priority: value})}
                  >
                    <SelectTrigger id="priority">
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
                    onValueChange={(value) => setNewTask({...newTask, status: value as TaskStatus})}
                  >
                    <SelectTrigger id="status">
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
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        id="dueDate"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTask.dueDate ? format(newTask.dueDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newTask.dueDate || undefined}
                        onSelect={(date) => setNewTask({...newTask, dueDate: date || null})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="assignee">Assign To</Label>
                  <Select
                    value={newTask.assignedToId?.toString() || "unassigned"}
                    onValueChange={(value) => setNewTask({...newTask, assignedToId: value === "unassigned" ? null : Number(value)})}
                  >
                    <SelectTrigger id="assignee">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Recurring Task Options */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isRecurring" 
                    checked={newTask.isRecurring}
                    onCheckedChange={(checked: boolean | 'indeterminate') => setNewTask({...newTask, isRecurring: checked === true})}
                  />
                  <Label htmlFor="isRecurring" className="font-medium">Recurring Task</Label>
                </div>
                
                {newTask.isRecurring && (
                  <div className="grid grid-cols-2 gap-4 pl-6 pt-2">
                    <div className="grid gap-2">
                      <Label htmlFor="recurringPattern">Repeat Pattern</Label>
                      <Select
                        value={newTask.recurringPattern}
                        onValueChange={(value) => setNewTask({...newTask, recurringPattern: value as RecurringPattern})}
                      >
                        <SelectTrigger id="recurringPattern">
                          <SelectValue placeholder="Select pattern" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="recurringEndDate">End Date (Optional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            id="recurringEndDate"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newTask.recurringEndDate ? format(newTask.recurringEndDate, "PPP") : <span>No end date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newTask.recurringEndDate || undefined}
                            onSelect={(date) => setNewTask({...newTask, recurringEndDate: date || null})}
                            initialFocus
                            disabled={(date) => (newTask.dueDate ? date < newTask.dueDate : false)}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewTaskDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={isTaskDetailOpen} onOpenChange={setIsTaskDetailOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>{selectedTask.title}</DialogTitle>
                  <Badge 
                    variant="outline" 
                    className={`
                      ${selectedTask.status === 'completed' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 
                        selectedTask.status === 'in_progress' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 
                        'bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400'}
                    `}
                  >
                    {selectedTask.status === 'not_started' ? 'Not Started' : 
                     selectedTask.status === 'in_progress' ? 'In Progress' : 'Completed'}
                  </Badge>
                </div>
                <DialogDescription>
                  Task created on {format(new Date(selectedTask.createdAt), "PPP")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {selectedTask.description && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Priority</h4>
                    <Badge 
                      variant="outline" 
                      className={`
                        ${selectedTask.priority === 'high' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 
                          selectedTask.priority === 'medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 
                          'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}
                      `}
                    >
                      {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Due Date</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedTask.dueDate ? format(new Date(selectedTask.dueDate), "PPP") : 'No due date'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Assigned To</h4>
                  {selectedTask.assignedToId ? (
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm">{getUserName(selectedTask.assignedToId)}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Unassigned</p>
                  )}
                </div>
              </div>
              <DialogFooter className="flex items-center justify-between sm:justify-between">
                <Button
                  variant="destructive"
                  onClick={() => {
                    deleteTask(selectedTask.id);
                    setIsTaskDetailOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsTaskDetailOpen(false)}
                  >
                    Close
                  </Button>
                  <Button 
                    onClick={() => {
                      const newStatus = 
                        selectedTask.status === 'not_started' ? ('in_progress' as TaskStatus) :
                        selectedTask.status === 'in_progress' ? ('completed' as TaskStatus) : ('not_started' as TaskStatus);
                      updateTaskStatus(selectedTask.id, newStatus);
                      setIsTaskDetailOpen(false);
                    }}
                  >
                    {selectedTask.status === 'completed' ? 'Reopen Task' :
                     selectedTask.status === 'in_progress' ? 'Mark Completed' : 'Start Task'}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task
              and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedTask) {
                  deleteTask(selectedTask.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
