import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Task, User, TaskStatus } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, Edit, Trash2, Clock, CalendarClock, CheckCircle, XCircle } from "lucide-react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  formatDate, 
  formatStatus, 
  getPriorityColor, 
  getStatusColor,
  getInitials,
  getAvatarColor 
} from "@/lib/utils";
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
import { TaskForm } from "@/components/task-form";
import { Separator } from "@/components/ui/separator";

interface TaskDetailPageProps {
  params?: {
    id?: string;
  };
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const taskId = params?.id ? parseInt(params.id) : null;
  const [task, setTask] = useState<Task | null>(null);
  const [assignedUser, setAssignedUser] = useState<User | null>(null);
  const [createdByUser, setCreatedByUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

  // Fetch task details
  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) {
        console.log('Task ID is missing or invalid:', params);
        setError("Invalid task ID");
        setLoading(false);
        return;
      }

      console.log(`Fetching task with ID: ${taskId}`);
      
      try {
        setLoading(true);
        
        // Try to get the task data
        const response = await apiRequest("GET", `/api/tasks/${taskId}`, undefined, 5000);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error response from task API: ${response.status}`, errorText);
          throw new Error(`Server returned ${response.status}: ${errorText}`);
        }
        
        const taskData = await response.json() as Task;
        console.log('Task data loaded successfully:', taskData);
        setTask(taskData);
        
        // Fetch assigned user if any
        if (taskData.assignedToId) {
          console.log(`Fetching assigned user with ID: ${taskData.assignedToId}`);
          try {
            const userResponse = await apiRequest("GET", `/api/users/${taskData.assignedToId}`);
            const userData = await userResponse.json() as User;
            setAssignedUser(userData);
          } catch (userErr) {
            console.warn('Could not load assigned user data:', userErr);
            // Don't fail the whole page if just user data fails to load
          }
        }
        
        // Fetch creator user
        if (taskData.createdById) {
          console.log(`Fetching creator user with ID: ${taskData.createdById}`);
          try {
            const creatorResponse = await apiRequest("GET", `/api/users/${taskData.createdById}`);
            const creatorData = await creatorResponse.json() as User;
            setCreatedByUser(creatorData);
          } catch (creatorErr) {
            console.warn('Could not load creator user data:', creatorErr);
            // Don't fail the whole page if just user data fails to load
          }
        }
      } catch (err) {
        console.error("Error fetching task:", err);
        setError(err instanceof Error ? err.message : "Failed to load task details");
        toast({
          title: "Error loading task",
          description: "There was a problem loading the task details",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, toast, params]);

  // Handle task status change
  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    
    try {
      await apiRequest("PATCH", `/api/tasks/${task.id}`, { status: newStatus });
      
      // Update local state
      setTask({
        ...task,
        status: newStatus
      });
      
      // Show success message
      toast({
        title: "Status updated",
        description: `Task status changed to ${formatStatus(newStatus)}`
      });
    } catch (error) {
      console.error("Error updating task status:", error);
      toast({
        title: "Status update failed",
        description: "There was a problem updating the task status",
        variant: "destructive"
      });
    }
  };

  // Handle task deletion
  const deleteTask = async () => {
    if (!task) return;
    
    try {
      await apiRequest("DELETE", `/api/tasks/${task.id}`);
      
      // Show success message
      toast({
        title: "Task deleted",
        description: "Task has been successfully deleted"
      });
      
      // Navigate back to tasks page
      navigate("/tasks");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Deletion failed",
        description: "There was a problem deleting the task",
        variant: "destructive"
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading task details...</p>
      </div>
    );
  }

  // Error state
  if (error || !task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <div className="bg-destructive/10 text-destructive p-6 rounded-lg max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="mb-4">{error || "Task not found"}</p>
          <Button onClick={() => navigate("/tasks")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  const isPastDue = task.dueDate && new Date(task.dueDate) < new Date();
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={() => navigate("/tasks")}
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Back to Tasks
      </Button>
      
      <Card className="shadow-md border-t-4" style={{ borderTopColor: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#3b82f6' }}>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold">{task.title}</CardTitle>
              <div className="flex mt-2 space-x-2">
                <Badge variant="secondary" className={getStatusColor(task.status)}>
                  {formatStatus(task.status)}
                </Badge>
                <Badge variant="secondary" className={getPriorityColor(task.priority)}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                </Badge>
                {task.dueDate && (
                  <Badge variant={isPastDue ? "destructive" : "outline"} className="flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    {formatDate(task.dueDate)}
                    {isPastDue && ' (Overdue)'}
                  </Badge>
                )}
              </div>
            </div>
            
            {isAdminOrManager && (
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditModalOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Description */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {task.description || "No description provided."}
            </p>
          </div>
          
          <Separator className="my-6" />
          
          {/* Assignment & Creation Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium mb-3">Assigned To</h3>
              {assignedUser ? (
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback className={getAvatarColor(assignedUser.name)}>
                      {getInitials(assignedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{assignedUser.name}</p>
                    <p className="text-xs text-muted-foreground">{assignedUser.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Not assigned</p>
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-3">Created By</h3>
              {createdByUser ? (
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback className={getAvatarColor(createdByUser.name)}>
                      {getInitials(createdByUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{createdByUser.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(task.createdAt)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Unknown</p>
              )}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            ID: {task.id}
          </div>
          
          {/* Status Change Buttons */}
          {user && (
            <div className="flex space-x-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(TaskStatus.NOT_STARTED)}
                disabled={task.status === TaskStatus.NOT_STARTED}
              >
                <XCircle className="h-4 w-4 mr-1 text-gray-500" />
                Not Started
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(TaskStatus.IN_PROGRESS)}
                disabled={task.status === TaskStatus.IN_PROGRESS}
                className="border-blue-200 hover:border-blue-300 text-blue-600"
              >
                <Clock className="h-4 w-4 mr-1 text-blue-500" />
                In Progress
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(TaskStatus.COMPLETED)}
                disabled={task.status === TaskStatus.COMPLETED}
                className="border-green-200 hover:border-green-300 text-green-600"
              >
                <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                Completed
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
      
      {/* Edit Task Modal */}
      <TaskForm
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editTask={task}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTask} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
