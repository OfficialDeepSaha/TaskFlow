import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, User } from "@shared/schema";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { TaskForm } from "@/components/task-form";
import { TaskTable } from "@/components/task-table";
import { TaskFilter } from "@/components/task-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AssignedTasksPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | undefined>(undefined);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterParams, setFilterParams] = useState<{
    status?: string[];
    priority?: string[];
    dueDate?: string;
  }>({});
  const { toast } = useToast();
  const { isAuthenticated, user, setConnectSidCookie } = useAuth();

  // Fix potential authentication issues by ensuring cookies are set
  useEffect(() => {
    // Check for existing connect.sid cookie
    const cookies = document.cookie.split(';');
    const sidCookie = cookies.find(cookie => cookie.trim().startsWith('connect.sid='));
    
    // If user is authenticated but cookie missing, try to manually set it
    if (isAuthenticated && user && !sidCookie) {
      console.log("User authenticated but session cookie missing, attempting to set it manually");
      // Check URL for session ID
      tryGetSessionFromUrl();
    }
  }, [isAuthenticated, user, setConnectSidCookie]);

  // Function to handle getting session ID from URL
  const tryGetSessionFromUrl = () => {
    // For testing: Try to get connect.sid from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const sid = urlParams.get('sid');
    if (sid) {
      console.log("Found session ID in URL, setting cookie");
      setConnectSidCookie(sid);
      // Remove the sid parameter from URL for security
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('sid');
      window.history.replaceState({}, document.title, newUrl.toString());
      // Reload page to apply cookie
      window.location.reload();
    }
  };

  // Fetch tasks assigned to current user; coerce null to empty array
  const { data: tasksData, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/assigned/me"],
  });
  const tasks = tasksData || []; // Ensure we always have an array even if data is null or undefined

  // Fetch users for assignment
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Delete task mutation (not used for regular users but keep it for code compatibility)
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/assigned/me"] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete task: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update task status mutation for regular users
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      await apiRequest("PATCH", `/api/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/assigned/me"] });
      toast({
        title: "Success",
        description: "Task status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update task status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle editing a task
  const handleEditTask = (task: Task) => {
    setEditTask(task);
    setIsTaskFormOpen(true);
  };

  // Handle deleting a task
  const handleDeleteTask = (taskId: number) => {
    setTaskToDelete(taskId);
  };
  
  // Handle changing a task status
  const handleStatusChange = (taskId: number, newStatus: string) => {
    updateTaskStatusMutation.mutate({ taskId, status: newStatus });
  };

  // Confirm delete task
  const confirmDeleteTask = () => {
    if (taskToDelete !== null) {
      deleteTaskMutation.mutate(taskToDelete);
      setTaskToDelete(null);
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // You would typically call an API with the search term
    // For now just use client-side filtering
  };

  // Filter tasks based on search term and filters
  const filteredTasks = tasks.filter(task => {
    // Search term filter
    if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (!task.description || !task.description.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false;
    }

    // Status filter
    if (filterParams.status && filterParams.status.length > 0 && !filterParams.status.includes(task.status)) {
      return false;
    }

    // Priority filter
    if (filterParams.priority && filterParams.priority.length > 0 && !filterParams.priority.includes(task.priority)) {
      return false;
    }

    // Due date filter
    if (filterParams.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const taskDate = task.dueDate ? new Date(task.dueDate) : null;
      
      if (!taskDate) return false;
      
      const isOverdue = taskDate < today;
      
      if (filterParams.dueDate === 'today') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return taskDate >= today && taskDate < tomorrow;
      }
      else if (filterParams.dueDate === 'week') {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return taskDate >= today && taskDate < nextWeek;
      }
      else if (filterParams.dueDate === 'month') {
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return taskDate >= today && taskDate < nextMonth;
      }
      else if (filterParams.dueDate === 'overdue') {
        return isOverdue;
      }
    }

    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar 
          title="Tasks Assigned to Me" 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          onSearch={(term) => setSearchTerm(term)}
        />

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Tasks Assigned to Me</CardTitle>
                  <CardDescription>
                    View and manage tasks that have been assigned to you
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <div className="hidden md:block">
                    <form onSubmit={handleSearch} className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <Input
                        type="search"
                        placeholder="Search tasks..."
                        className="pl-8 w-[200px] lg:w-[300px]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </form>
                  </div>
                  <TaskFilter onFilterChange={setFilterParams} />
                  <Button onClick={() => {
                    setEditTask(undefined);
                    setIsTaskFormOpen(true);
                  }}>
                    <Plus size={16} className="mr-2" /> New Task
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">Loading tasks...</p>
                </div>
              ) : (
                <TaskTable
                  tasks={filteredTasks}
                  users={users}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  isUserRole={true}  /* Show edit button for regular users */
                  onStatusChange={handleStatusChange}
                />
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Task Form Dialog */}
      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
        editTask={editTask}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={taskToDelete !== null} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
