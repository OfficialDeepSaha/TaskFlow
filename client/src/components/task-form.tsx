import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TaskPriority, TaskStatus, TaskColor, InsertTask, Task, UpdateTask, RecurringPattern } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn, normalizeApiUrl } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertTaskSchema } from "@shared/schema";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  editTask?: Task;
}

export function TaskForm({ isOpen, onClose, editTask }: TaskFormProps) {
  const { toast } = useToast();
  // Get current user from AuthContext
  const { user: currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>("");
  
  // Add fallback for auth context
  const effectiveUser = currentUser || { id: 0, name: "Unknown" };
  
  // Create a zod schema for the form
  const taskFormSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    status: z.nativeEnum(TaskStatus),
    priority: z.nativeEnum(TaskPriority),
    assignedToId: z.number().nullable().optional(),
    dueDate: z.string().optional(),
    colorCode: z.nativeEnum(TaskColor),
    // Recurring task fields
    isRecurring: z.boolean(),
    recurringPattern: z.nativeEnum(RecurringPattern),
    recurringEndDate: z.string().optional(),
  });

  // Define the form values type
  type TaskFormValues = z.infer<typeof taskFormSchema>;
  
  // Set up form with default values
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: editTask?.title || "",
      description: editTask?.description || "",
      status: (editTask?.status as TaskStatus) || TaskStatus.NOT_STARTED,
      priority: (editTask?.priority as TaskPriority) || TaskPriority.MEDIUM,
      colorCode: (editTask?.colorCode as TaskColor) || TaskColor.DEFAULT,
      assignedToId: editTask?.assignedToId,
      dueDate: editTask?.dueDate ? new Date(editTask.dueDate).toISOString().split('T')[0] : undefined,
      // Recurring task fields
      isRecurring: editTask?.isRecurring || false,
      recurringPattern: (editTask?.recurringPattern as RecurringPattern) || RecurringPattern.NONE,
      recurringEndDate: editTask?.recurringEndDate 
        ? new Date(editTask.recurringEndDate).toISOString().split('T')[0] 
        : undefined,
    },
  });

  // Update form when editTask changes
  useEffect(() => {
    if (editTask) {
      form.reset({
        title: editTask.title,
        description: editTask.description || "",
        status: editTask.status as TaskStatus,
        priority: editTask.priority as TaskPriority,
        assignedToId: editTask.assignedToId || undefined,
        colorCode: (editTask.colorCode as TaskColor) || TaskColor.DEFAULT,
        dueDate: editTask.dueDate ? new Date(editTask.dueDate).toISOString().split('T')[0] : undefined,
        // Recurring task fields
        isRecurring: Boolean(editTask.isRecurring),
        recurringPattern: (editTask.recurringPattern || RecurringPattern.NONE) as RecurringPattern,
        recurringEndDate: editTask.recurringEndDate 
          ? new Date(editTask.recurringEndDate).toISOString().split('T')[0] 
          : undefined,
      });
      
      if (editTask.dueDate) {
        setSelectedDate(new Date(editTask.dueDate).toISOString().split('T')[0]);
      } else {
        setSelectedDate("");
      }
    } else {
      form.reset({
        title: "",
        description: "",
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.MEDIUM,
        colorCode: TaskColor.DEFAULT,
        assignedToId: undefined,
        dueDate: undefined,
        // Recurring task fields
        isRecurring: false,
        recurringPattern: RecurringPattern.NONE,
        recurringEndDate: undefined,
      });
      setSelectedDate("");
    }
  }, [editTask, form]);

  // Fetch users for assignment dropdown with console logging
  const { data: users = [], isError: usersError, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/users"], 
    queryFn: async () => {
      try {
        console.log("Fetching users data from database...");
        
        // Make direct fetch with explicit API URL - use the absolute URL to avoid any path issues
        const apiUrl = window.location.origin + '/api/users';
        console.log(`Making fetch request to: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error fetching users: ${response.status}`, errorText);
          // Return empty array instead of throwing
          return [];
        }
        
        // Get response as text first for debugging
        const responseText = await response.text();
        console.log("Raw API response:", responseText);
        
        let data;
        try {
          // Parse the text as JSON
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Failed to parse response as JSON:", parseError);
          return [];
        }
        
        console.log("Users data fetched successfully:", data);
        
        // Ensure we return an array even if the response is not an array
        if (!Array.isArray(data)) {
          console.error("API did not return an array:", data);
          return [];
        }
        
        return data;
      } catch (error) {
        console.error("Error fetching users:", error);
        // Return empty array instead of throwing
        return [];
      }
    },
    staleTime: 0, // Don't cache users data
    refetchOnMount: true
  });
  
  // Log users whenever they change
  useEffect(() => {
    console.log("TaskForm: Users data received:", users);
    
    if (Array.isArray(users)) {
      console.log(`TaskForm: Found ${users.length} users in the list`);
      users.forEach(user => {
        console.log(`User: ${user.name}, ID: ${user.id}, Role: ${user.role || 'unknown'}`);
      });
    } else {
      console.error("Users is not an array:", users);
    }
    
    // If users is empty, log fallback behavior
    if (!Array.isArray(users) || users.length === 0) {
      console.log("TaskForm: No users found or error occurred");
      if (usersError) {
        console.error("Users fetch error detected:", usersError);
      }
    }
  }, [users, currentUser, usersError]);

  // Add a direct fetch fallback if the query fails
  useEffect(() => {
    if (usersError || (Array.isArray(users) && users.length === 0)) {
      console.log("Users query failed or returned empty, trying direct fetch...");
      
      // Try a direct fetch as fallback
      const fetchUsers = async () => {
        try {
          const apiUrl = window.location.origin + '/api/users';
          console.log(`Making direct fetch to: ${apiUrl}`);
          
          const response = await fetch(apiUrl, {
            credentials: 'include',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.error(`Direct fetch failed: ${response.status}`);
            return;
          }
          
          const data = await response.json();
          console.log("Direct fetch succeeded:", data);
          
          // Manually update the users query data
          if (Array.isArray(data) && data.length > 0) {
            queryClient.setQueryData(["/api/users"], data);
          }
        } catch (error) {
          console.error("Direct fetch error:", error);
        }
      };
      
      fetchUsers();
    }
  }, [usersError, users, queryClient]);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/assigned/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/created/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/overdue"] });
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTask }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/assigned/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/created/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/overdue"] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form submit handler with explicit type
  const onSubmit = (data: TaskFormValues) => {
    const formData = {
      ...data,
      // Convert string dates to Date objects for API or keep undefined
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      recurringEndDate: data.recurringEndDate ? new Date(data.recurringEndDate) : undefined
    };
    
    // Ensure assignedToId is properly set
    // If it's not explicitly set, don't set it to undefined or null which would clear it
    if (formData.assignedToId === undefined && effectiveUser) {
      console.log("Setting default assignedToId to current user:", effectiveUser.id);
      formData.assignedToId = effectiveUser.id;
    }
    
    console.log("Submitting task with data:", JSON.stringify(formData, null, 2));
    
    if (editTask) {
      updateTaskMutation.mutate({
        id: editTask.id,
        data: formData,
      });
    } else {
      createTaskMutation.mutate({
        ...formData,
        createdById: 0, // This will be set properly on the server based on the authenticated user
      } as InsertTask);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editTask ? "Edit Task" : "Create New Task"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 py-4">
            <FormField
              control={form.control as any}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control as any}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Task description" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TaskStatus.NOT_STARTED}>Not Started</SelectItem>
                        <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                        <SelectItem value={TaskStatus.COMPLETED}>Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control as any}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TaskPriority.LOW}>Low</SelectItem>
                        <SelectItem value={TaskPriority.MEDIUM}>Medium</SelectItem>
                        <SelectItem value={TaskPriority.HIGH}>High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value || ""}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          field.onChange(e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control as any}
                name="assignedToId"
                render={({ field }) => {
                  // Always log complete users data to debug
                  console.log("USERS DATA IN RENDER:", JSON.stringify(users));
                  
                  return (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          // Handle "current-user" special value
                          if (value === "current-user") {
                            field.onChange(effectiveUser?.id);
                          } else {
                            field.onChange(value ? parseInt(value) : undefined);
                          }
                        }}
                        defaultValue={field.value ? field.value.toString() : undefined}
                        value={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Current user option */}
                          {effectiveUser && (
                            <SelectItem value="current-user">Me ({effectiveUser.name})</SelectItem>
                          )}
                          
                          {/* Show all team members section */}
                          {users.length > 0 ? (
                            <>
                              <DropdownMenuSeparator className="my-1" />
                              <DropdownMenuLabel className="text-xs text-muted-foreground">
                                All Team Members ({users.length})
                              </DropdownMenuLabel>
                              
                              {/* Display ALL users without any filtering */}
                              {users.map(user => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.name} (ID: {user.id})
                                </SelectItem>
                              ))}
                            </>
                          ) : (
                            <div className="p-2 text-center">
                              <p className="text-xs text-red-600 mb-2">
                                No users found in database
                              </p>
                              {usersError && (
                                <p className="text-xs text-red-600">
                                  Error: {usersError.toString()}
                                </p>
                              )}
                            </div>
                          )}
                          
                          {/* Show loading state if users are being loaded */}
                          {usersLoading && (
                            <div className="p-2 text-center text-xs text-muted-foreground">
                              Loading users...
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            
            {/* Recurring Task Options */}
            <FormField
              control={form.control as any}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 mt-1"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Recurring Task</FormLabel>
                    <FormDescription>
                      Set this task to repeat on a schedule
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            {/* Only show pattern and end date if recurring is checked */}
            {form.watch("isRecurring") && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="recurringPattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repeat Pattern</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pattern" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={RecurringPattern.DAILY}>Daily</SelectItem>
                          <SelectItem value={RecurringPattern.WEEKLY}>Weekly</SelectItem>
                          <SelectItem value={RecurringPattern.MONTHLY}>Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control as any}
                  name="recurringEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormDescription>
                        If not set, task will recur indefinitely
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTaskMutation.isPending || updateTaskMutation.isPending}>
                {editTask ? "Save Changes" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
