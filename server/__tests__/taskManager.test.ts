// @ts-nocheck - Disable type checking for tests
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { taskManager } from '../taskManager';
import { RecurringPattern, AuditEntity, AuditAction, TaskStatus, TaskColor, TaskPriority } from '../../shared/schema';

// Mock the dependencies
jest.mock('../storage', () => ({
  storage: {
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    getTask: jest.fn(),
    getAllTasks: jest.fn(),
    getUserNotificationPreferences: jest.fn(),
    saveUserNotificationPreferences: jest.fn(),
    updateUserNotificationPreferences: jest.fn()
  }
}));

jest.mock('../auditLogger', () => ({
  log: jest.fn(),
  logTaskCreated: jest.fn(),
  logTaskUpdated: jest.fn(),
  logTaskAssigned: jest.fn(),
  logTaskStatusChanged: jest.fn(),
  logTaskCompleted: jest.fn(),
  logTaskDeleted: jest.fn(),
}));

// Mock recurringTaskHelper
jest.mock('../recurringTaskHelper', () => ({
  scheduleNextInstance: jest.fn(),
}));

// Import mocked dependencies after mocking
import { storage } from '../storage';
import { auditLogger } from '../auditLogger';
import { recurringTaskHelper } from '../recurringTaskHelper';

describe('taskManager', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a task and log the action', async () => {
      // Arrange
      const taskData = {
        title: 'Test Task',
        description: 'This is a test task',
        dueDate: new Date('2025-06-01'),
        priority: TaskPriority.HIGH,
        status: TaskStatus.NOT_STARTED,
        assignedToId: 2,
        createdById: 1,
        isRecurring: false,
        recurringPattern: RecurringPattern.NONE,
        colorCode: TaskColor.BLUE,
      };
      const userId = 1;
      const mockCreatedTask = { id: 123, ...taskData };
      
      // Mock the storage.createTask to return our mock task
      (storage.createTask as jest.Mock).mockResolvedValue(mockCreatedTask);
      
      // Act
      const result = await taskManager.createTask(taskData as any, userId);
      
      // Assert
      expect(storage.createTask).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test Task',
        isRecurring: false,
      }));
      expect(auditLogger.logTaskCreated).toHaveBeenCalledWith(
        123,
        userId,
        expect.objectContaining({
          title: 'Test Task',
          isRecurring: false,
          assignedToId: 2
        })
      );
      expect(result).toEqual(mockCreatedTask);
    });
  });

  describe('updateTask', () => {
    it('should update a task and log the action', async () => {
      // Arrange
      const taskId = 123;
      const updateData = {
        title: 'Updated Task',
        status: TaskStatus.IN_PROGRESS,
      };
      const userId = 1;
      const originalTask = {
        id: taskId,
        title: 'Test Task',
        description: 'This is a test task',
        dueDate: new Date('2025-06-01'),
        priority: TaskPriority.HIGH,
        status: TaskStatus.NOT_STARTED,
        assignedToId: 2,
        createdById: userId,
        isRecurring: false,
        recurringPattern: RecurringPattern.NONE,
        colorCode: TaskColor.BLUE,
      };
      const updatedTask = {
        ...originalTask,
        ...updateData,
      };
      
      // Mock the getTask and updateTask methods
      (storage.getTask as jest.Mock).mockResolvedValue(originalTask);
      (storage.updateTask as jest.Mock).mockResolvedValue(updatedTask);
      
      // Act
      const result = await taskManager.updateTask(taskId, updateData as any, userId);
      
      // Assert
      expect(storage.getTask).toHaveBeenCalledWith(taskId);
      expect(storage.updateTask).toHaveBeenCalledWith(taskId, expect.objectContaining({
        title: 'Updated Task',
      }));
      expect(auditLogger.logTaskUpdated).toHaveBeenCalledWith(
        taskId,
        userId,
        expect.anything(),
        expect.anything()
      );
      expect(result).toEqual(updatedTask);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task and log the action', async () => {
      // Arrange
      const taskId = 123;
      const userId = 1;
      const task = {
        id: taskId,
        title: 'Test Task',
        description: 'This is a test task',
        status: TaskStatus.NOT_STARTED,
        dueDate: new Date('2025-06-01'),
        priority: TaskPriority.HIGH,
        assignedToId: 2,
        createdById: userId,
        isRecurring: false,
        recurringPattern: RecurringPattern.NONE,
        colorCode: TaskColor.BLUE,
      };
      
      // Mock the getTask and deleteTask methods
      (storage.getTask as jest.Mock).mockResolvedValue(task);
      (storage.deleteTask as jest.Mock).mockResolvedValue(true as any);
      
      // Act
      const result = await taskManager.deleteTask(taskId, userId);
      
      // Assert
      expect(storage.getTask).toHaveBeenCalledWith(taskId);
      expect(storage.deleteTask).toHaveBeenCalledWith(taskId);
      expect(auditLogger.logTaskDeleted).toHaveBeenCalledWith(
        taskId,
        userId,
        'Test Task'
      );
      expect(result).toBe(true);
    });

    it('should return false if task not found', async () => {
      // Arrange
      const taskId = 999;
      const userId = 1;
      
      // Mock the getTask method to return null (task not found)
      (storage.getTask as jest.Mock).mockResolvedValue(null as any);
      
      // Act
      const result = await taskManager.deleteTask(taskId, userId);
      
      // Assert
      expect(storage.getTask).toHaveBeenCalledWith(taskId);
      expect(storage.deleteTask).not.toHaveBeenCalled();
      expect(auditLogger.logTaskDeleted).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});
