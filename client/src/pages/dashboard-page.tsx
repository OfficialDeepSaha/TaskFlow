import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, User, TaskStatus } from "@shared/schema";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { StatsCard } from "@/components/stats-card";
import { ActivityTimeline } from "@/components/activity-timeline";
import { TaskCard } from "@/components/task-card";
import { TaskForm } from "@/components/task-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | undefined>(undefined);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch tasks
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
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

  // Handle edit task
  const handleEditTask = (task: Task) => {
    setEditTask(task);
    setIsTaskFormOpen(true);
  };

  // Handle delete task
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

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === TaskStatus.COMPLETED).length;
  const inProgressTasks = tasks.filter(task => task.status === TaskStatus.IN_PROGRESS).length;
  const overdueTasks = tasks.filter(task => 
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== TaskStatus.COMPLETED
  ).length;

  // Get user by ID helper
  const getUserById = (userId: number | null | undefined) => {
    if (!userId) return undefined;
    return users.find(user => user.id === userId);
  };

  // Generate some mock activities for the timeline based on tasks
  const activities = tasks.slice(0, 4).map((task, index) => {
    const creator = getUserById(task.createdById) || { id: 0, name: "Unknown", username: "", password: "" };
    const assignee = task.assignedToId ? getUserById(task.assignedToId) : undefined;
    
    const activityTypes = ['created', 'completed', 'assigned', 'updated'] as const;
    const type = activityTypes[index % activityTypes.length];
    
    return {
      id: index,
      type,
      task,
      user: creator,
      assignedTo: assignee,
      timestamp: task.createdAt || new Date(),
    };
  });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Dashboard" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
          {/* Stats Cards */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Total Tasks" value={totalTasks} icon="total" />
              <StatsCard title="Completed" value={completedTasks} icon="completed" />
              <StatsCard title="In Progress" value={inProgressTasks} icon="in-progress" />
              <StatsCard title="Overdue" value={overdueTasks} icon="overdue" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Tasks */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="px-4 py-5 border-b dark:border-gray-700 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Tasks</h3>
                <Button onClick={() => {
                  setEditTask(undefined);
                  setIsTaskFormOpen(true);
                }}>
                  <Plus size={16} className="mr-1" /> New Task
                </Button>
              </div>
              <div className="px-4 py-3 sm:px-6 overflow-hidden">
                <div className="space-y-3">
                  {tasks.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      No tasks found. Create a new task to get started.
                    </p>
                  ) : (
                    tasks.slice(0, 3).map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        assignedUser={task.assignedToId ? getUserById(task.assignedToId) : undefined}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                      />
                    ))
                  )}
                </div>
                
                {tasks.length > 0 && (
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="link"
                      className="text-sm text-primary dark:text-primary-foreground"
                      onClick={() => window.location.href = "/tasks"}
                    >
                      View all tasks
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Activity Timeline */}
            <ActivityTimeline activities={activities} />
          </div>
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
            <AlertDialogAction onClick={confirmDeleteTask}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
