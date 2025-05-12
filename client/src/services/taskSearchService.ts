import { Task } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

/**
 * Searches for tasks using the search API
 * @param query The search term
 * @param filters Optional filters to apply
 * @returns Promise with the search results
 */
export async function searchTasks(query: string, filters?: {
  status?: string[];
  priority?: string[];
  dueDate?: string;
  assignedToId?: number;
  createdById?: number;
}): Promise<Task[]> {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Add search query
    if (query) {
      queryParams.append('q', query);
    }
    
    // Add filters if provided
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        queryParams.append('status', filters.status.join(','));
      }
      
      if (filters.priority && filters.priority.length > 0) {
        queryParams.append('priority', filters.priority.join(','));
      }
      
      if (filters.dueDate) {
        queryParams.append('dueDate', filters.dueDate);
      }
      
      if (filters.assignedToId !== undefined) {
        queryParams.append('assignedToId', filters.assignedToId.toString());
      }
      
      if (filters.createdById !== undefined) {
        queryParams.append('createdById', filters.createdById.toString());
      }
    }
    
    // Make the search request
    const response = await apiRequest(
      'GET', 
      `/api/tasks/search?${queryParams.toString()}`,
      undefined,
      5000 // 5 second timeout
    );
    
    // Parse the response
    const tasks = await response.json() as Task[];
    return tasks;
  } catch (error) {
    console.error('Error searching tasks:', error);
    return []; // Return empty array on error
  }
}
