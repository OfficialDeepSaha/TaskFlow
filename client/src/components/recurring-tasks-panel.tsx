import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Loader2, RefreshCw, CalendarRange } from "lucide-react";
import { useToast } from "../hooks/use-toast";

// Define types locally to avoid import issues
enum RecurringPattern {
  NONE = "none",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly"
}

enum TaskStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed"
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string | Date;
  createdById: number;
  assignedToId?: number;
  isRecurring: boolean;
  recurringPattern?: string;
  recurringEndDate?: string | Date;
  colorCode?: string;
  parentTaskId?: number;
}

// Simple date formatter
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Recurring Tasks Panel Component
 * Displays and manages recurring tasks (admin only)
 */
export function RecurringTasksPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);

  // Fetch recurring tasks
  const { data: recurringTasks, isLoading, isError } = useQuery({
    queryKey: ["recurring-tasks"],
    queryFn: async () => {
      const response = await axios.get("/api/recurring-tasks");
      return response.data;
    },
  });

  // Process recurring tasks mutation
  const processRecurringTasksMutation = useMutation({
    mutationFn: async () => {
      setProcessing(true);
      const response = await axios.post("/api/recurring-tasks/process");
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Recurring tasks processed successfully",
        variant: "default",
      });
      // Refresh recurring tasks data
      queryClient.invalidateQueries({ queryKey: ["recurring-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setProcessing(false);
    },
    onError: (error) => {
      console.error("Error processing recurring tasks:", error);
      toast({
        title: "Error",
        description: "Failed to process recurring tasks",
        variant: "destructive",
      });
      setProcessing(false);
    },
  });

  // Handle process recurring tasks button click
  const handleProcessRecurringTasks = () => {
    processRecurringTasksMutation.mutate();
  };

  // Render recurring pattern as human-readable text
  const getPatternLabel = (pattern: RecurringPattern) => {
    switch (pattern) {
      case RecurringPattern.DAILY:
        return "Daily";
      case RecurringPattern.WEEKLY:
        return "Weekly";
      case RecurringPattern.MONTHLY:
        return "Monthly";
      default:
        return "None";
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            Recurring Tasks
          </CardTitle>
          <CardDescription>Manage tasks that repeat on a schedule</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (isError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            Recurring Tasks
          </CardTitle>
          <CardDescription>Manage tasks that repeat on a schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-destructive">
            Error loading recurring tasks. Please try again.
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["recurring-tasks"] })}>
            Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5" />
          Recurring Tasks
        </CardTitle>
        <CardDescription>Manage tasks that repeat on a schedule</CardDescription>
      </CardHeader>
      <CardContent>
        {recurringTasks && recurringTasks.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Pattern</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recurringTasks.map((task: Task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getPatternLabel(task.recurringPattern as RecurringPattern)}</Badge>
                  </TableCell>
                  <TableCell>{task.dueDate ? formatDate(new Date(task.dueDate)) : "Not set"}</TableCell>
                  <TableCell>
                    {task.recurringEndDate
                      ? formatDate(new Date(task.recurringEndDate))
                      : "No end date"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={task.status === TaskStatus.COMPLETED ? "default" : 
                              task.status === TaskStatus.IN_PROGRESS ? "secondary" : "outline"}
                      className={task.status === TaskStatus.COMPLETED ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                    >
                      {task.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No recurring tasks found. Create a task with a recurring pattern to see it here.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["recurring-tasks"] })}
        >
          Refresh
        </Button>
        <Button onClick={handleProcessRecurringTasks} disabled={processing}>
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Process Recurring Tasks
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
