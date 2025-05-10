import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

// Type definitions for notifications
export interface TaskNotification {
  type: 'task_assigned' | 'task_updated' | 'task_completed';
  taskId: number;
  taskTitle: string;
  message: string;
  timestamp: number;
}

export type WebSocketNotification = TaskNotification;

// WebSocket connection state
let socket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds
let heartbeatInterval: NodeJS.Timeout | null = null;

// Notification listeners
const listeners: ((notification: WebSocketNotification) => void)[] = [];

// Connect to WebSocket server
export function connectWebSocket(userId: number) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected');
    return socket;
  }

  const url = new URL('/ws', window.location.origin.replace('http', 'ws'));
  url.searchParams.append('token', userId.toString());

  console.log(`Connecting to WebSocket at ${url.toString()} with user ID ${userId}`);
  
  socket = new WebSocket(url.toString());

  socket.onopen = () => {
    console.log('WebSocket connection established');
    reconnectAttempts = 0;
    
    // Start heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    
    // Send heartbeat every 25 seconds (server expects every 30)
    heartbeatInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ 
          type: 'ping', 
          timestamp: Date.now() 
        }));
      }
    }, 25000);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Handle different message types
      if (data.type === 'pong') {
        console.log('Received pong from server');
      } else if (data.type === 'notification') {
        handleNotification(data.data);
      } else if (data.type === 'welcome' || data.type === 'auth_success') {
        console.log(`Received ${data.type} message:`, data.message || 'Authentication successful');
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  socket.onclose = (event) => {
    console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
    
    // Clear heartbeat interval
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    
    // Attempt to reconnect
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`Reconnecting (attempt ${reconnectAttempts})...`);
      setTimeout(() => connectWebSocket(userId), RECONNECT_DELAY);
    } else {
      console.error('Max reconnect attempts reached, giving up');
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return socket;
}

// Disconnect WebSocket
export function disconnectWebSocket() {
  if (socket) {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    
    if (socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    
    socket = null;
    console.log('WebSocket disconnected');
  }
}

// Handle incoming notifications
function handleNotification(notification: WebSocketNotification) {
  console.log('Received notification:', notification);
  
  // Notify all listeners
  listeners.forEach(listener => listener(notification));
  
  // We don't show toasts directly here - the component using this will handle displaying notifications
}

// Get notification title based on type
function getNotificationTitle(notification: WebSocketNotification): string {
  switch (notification.type) {
    case 'task_assigned':
      return 'New Task Assigned';
    case 'task_updated':
      return 'Task Updated';
    case 'task_completed':
      return 'Task Completed';
    default:
      return 'Notification';
  }
}

// Add notification listener
export function addNotificationListener(listener: (notification: WebSocketNotification) => void) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
}

// React hook for WebSocket
export function useWebSocket(userId: number | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);
  
  useEffect(() => {
    if (!userId) return;
    
    // Connect to WebSocket
    const ws = connectWebSocket(userId);
    
    // Update connection state
    const updateConnectionState = () => {
      setIsConnected(ws.readyState === WebSocket.OPEN);
    };
    
    ws.addEventListener('open', updateConnectionState);
    ws.addEventListener('close', updateConnectionState);
    
    // Listen for notifications
    const removeListener = addNotificationListener((notification) => {
      setNotifications(prev => [notification, ...prev]);
    });
    
    // Clean up
    return () => {
      ws.removeEventListener('open', updateConnectionState);
      ws.removeEventListener('close', updateConnectionState);
      removeListener();
    };
  }, [userId]);
  
  return { isConnected, notifications };
}
