import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Task } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { formatDate, getStatusColor, getPriorityColor } from '@/lib/utils';

interface SimpleTaskDetailProps {
  id?: string;
}

export default function SimpleTaskDetail({ id }: SimpleTaskDetailProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, navigate] = useLocation();
  
  // Extract ID from URL if not provided as prop
  const taskId = id || location.split('/').pop();
  
  console.log('SimpleTaskDetail rendered with ID:', taskId);
  console.log('Current location:', location);

  useEffect(() => {
    async function fetchTask() {
      if (!taskId) {
        setError('No task ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log(`Fetching task with ID: ${taskId}`);
        setLoading(true);
        
        const response = await apiRequest('GET', `/api/tasks/${taskId}`);
        
        // Log the raw response for debugging
        const responseText = await response.clone().text();
        console.log('Raw API response:', responseText);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch task: ${response.status}`);
        }
        
        const taskData = await response.json() as Task;
        console.log('Task data loaded successfully:', taskData);
        setTask(taskData);
      } catch (err) {
        console.error('Error fetching task:', err);
        setError('Could not load task details');
      } finally {
        setLoading(false);
      }
    }

    fetchTask();
  }, [taskId]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Loading task {taskId}...</p>
      </div>
    );
  }

  // Error state
  if (error || !task) {
    return (
      <div className="p-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/tasks')}
          className="mb-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Tasks
        </Button>
        
        <Card className="bg-destructive/10 mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Task</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || 'Task not found'}</p>
            <p className="text-sm text-muted-foreground mt-2">Task ID: {taskId}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - render task
  return (
    <div className="p-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/tasks')}
        className="mb-4"
      >
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Tasks
      </Button>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{task.title}</CardTitle>
              <div className="flex mt-2 space-x-2">
                <Badge variant="secondary" className={getStatusColor(task.status)}>
                  {task.status.replace('_', ' ')}
                </Badge>
                <Badge variant="secondary" className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="font-medium mb-2">Description</h3>
          <p className="text-muted-foreground mb-6">
            {task.description || 'No description provided'}
          </p>
          
          <div className="flex justify-between mt-4 pt-4 border-t text-sm text-muted-foreground">
            <div>Created: {formatDate(task.createdAt)}</div>
            {task.dueDate && <div>Due: {formatDate(task.dueDate)}</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
