import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, User } from "@shared/schema";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { TaskForm } from "@/components/task-form";
import { TaskTable } from "@/components/task-table";
import { TaskFilter } from "@/components/task-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RouteComponentProps } from "wouter";

interface OverdueTasksPageProps extends Partial<RouteComponentProps> {
  // When true, the component won't render its own navbar and sidebar
  inDashboard?: boolean;
}

export default function OverdueTasksPage({ inDashboard = false }: OverdueTasksPageProps) {
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
  const { user } = useAuth();

  // Fetch overdue tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/overdue"],
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/overdue"] });
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

  // Handle editing a task
  const handleEditTask = (task: Task) => {
    setEditTask(task);
    setIsTaskFormOpen(true);
  };

  // Handle deleting a task
  const handleDeleteTask = (taskId: number) => {
    setTaskToDelete(taskId);
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

    return true;
  });

  // Render content - conditionally wrap in layout elements based on inDashboard prop
  const content = (
    <div className="flex-1 overflow-hidden">
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
        {tasks.length > 0 && (
          <Alert className="mb-6 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have {tasks.length} overdue {tasks.length === 1 ? 'task' : 'tasks'} that require your attention.
            </AlertDescription>
          </Alert>
        )}
        
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Overdue Tasks</CardTitle>
                <CardDescription>
                  View and manage tasks that are past their due date
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
                {user?.role === "admin" && (
                  <Button onClick={() => {
                    setEditTask(undefined);
                    setIsTaskFormOpen(true);
                  }}>
                    <Plus size={16} className="mr-2" /> New Task
                  </Button>
                )}
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
              />
            )}
          </CardContent>
        </Card>
      </main>

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

  // If this component is rendered within the dashboard, return just the content
  if (inDashboard) {
    return content;
  }

  // Otherwise wrap it in the full layout with sidebar and navbar
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar 
          title="Overdue Tasks" 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          onSearch={(term) => setSearchTerm(term)}
        />
        {content}
      </div>
    </div>
  );
}
