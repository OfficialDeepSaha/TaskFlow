import React from 'react';
import { render, screen, waitFor, fireEvent, createWrapper } from '../test-utils';
import axios from 'axios';
import { RecurringTasksPanel } from '../components/recurring-tasks-panel';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RecurringTasksPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    // Setup mock to never resolve
    mockedAxios.get.mockImplementation(() => new Promise(() => {}));
    
    // Render the component
    render(<RecurringTasksPanel />);
    
    // Verify loading state is displayed
    expect(screen.getByText(/Loading recurring tasks/i)).toBeInTheDocument();
  });

  it('should display recurring tasks when data is loaded', async () => {
    // Mock data
    const mockRecurringTasks = [
      { id: 1, title: 'Weekly report', frequency: 'weekly', dueDay: 'Friday', nextOccurrence: '2023-06-16' },
      { id: 2, title: 'Monthly team meeting', frequency: 'monthly', dueDay: '1st', nextOccurrence: '2023-07-01' }
    ];
    
    // Setup mock resolve
    mockedAxios.get.mockResolvedValueOnce({ data: mockRecurringTasks });
    
    // Render the component
    render(<RecurringTasksPanel />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Weekly report')).toBeInTheDocument();
      expect(screen.getByText('Monthly team meeting')).toBeInTheDocument();
      expect(screen.getAllByText(/Next occurrence/i)).toHaveLength(2);
      expect(screen.getByText('Friday')).toBeInTheDocument();
      expect(screen.getByText('1st')).toBeInTheDocument();
    });
  });

  it('should handle error state properly', async () => {
    // Mock error response
    mockedAxios.get.mockRejectedValueOnce(new Error('Failed to fetch tasks'));
    
    // Render the component
    render(<RecurringTasksPanel />);
    
    // Wait for error message to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Error loading recurring tasks/i)).toBeInTheDocument();
    });
  });

  it('should show error message when API fails', async () => {
    // Setup mock rejection
    mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));
    
    // Render the component
    render(<RecurringTasksPanel />);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Could not load recurring tasks/i)).toBeInTheDocument();
    });
  });

  it('should be able to create a new recurring task', async () => {
    // Mock initial tasks
    const mockRecurringTasks: Array<{id: number; title: string; frequency: string; dueDay?: string; nextOccurrence?: string}> = [];
    
    // Mock successful post
    mockedAxios.post.mockResolvedValueOnce({ 
      data: { id: 3, title: 'New Recurring Task', frequency: 'weekly', dueDay: 'Monday', nextOccurrence: '2023-06-19' } 
    });
    mockedAxios.get.mockResolvedValueOnce({ data: mockRecurringTasks });
    
    // Render the component
    render(<RecurringTasksPanel />);
    
    // Click the 'Add new' button
    fireEvent.click(screen.getByText(/Add new/i));
    
    // TODO: Complete the test for creating a new recurring task
    // This would involve filling out the form fields and submitting
  });

  it('should trigger process tasks when button is clicked', async () => {
    // Mock initial data and post response
    mockedAxios.get.mockResolvedValueOnce({ 
      data: [{ id: 1, title: 'Weekly Report', frequency: 'weekly' }] 
    });
    mockedAxios.post.mockResolvedValueOnce({ 
      data: { success: true, message: 'Tasks processed successfully' } 
    });
    
    // Render the component
    render(<RecurringTasksPanel />);
    
    // Wait for component to load data
    await waitFor(() => {
      expect(screen.getByText('Weekly Report')).toBeInTheDocument();
    });
    
    // Find and click the process button
    const processButton = screen.getByRole('button', { name: /Process Recurring Tasks/i });
    fireEvent.click(processButton);
    
    // Verify the API was called
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/recurring-tasks/process');
    });
  });
});
