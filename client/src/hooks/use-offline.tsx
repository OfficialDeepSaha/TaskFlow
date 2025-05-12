import { useState, useEffect, useCallback } from 'react';
import * as idb from '../lib/indexedDB';
import { queryClient } from '../lib/queryClient';

// TypeScript interfaces for service worker sync
interface SyncManager {
  register(tag: string): Promise<void>;
}

interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  sync?: SyncManager;
}

/**
 * Custom hook for managing offline operations and synchronization
 */
export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState(0);

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Automatically attempt to sync pending operations when coming back online
      syncPendingOperations();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for pending operations
    checkPendingOperations();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for service worker messages
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'sync-complete') {
        setIsSyncing(false);
        // Refresh data from server after sync
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        checkPendingOperations();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  // Check for pending operations
  const checkPendingOperations = useCallback(async () => {
    try {
      const pendingOps = await idb.getPendingSyncOperations();
      setPendingActions(pendingOps.length);
    } catch (error) {
      console.error('Error checking pending operations:', error);
    }
  }, []);

  // Manually trigger sync of pending operations
  const syncPendingOperations = useCallback(async () => {
    if (!navigator.onLine) {
      return;
    }

    try {
      setIsSyncing(true);
      
      // If Background Sync API is supported, use it
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const registration = await navigator.serviceWorker.ready as ExtendedServiceWorkerRegistration;
        if (registration.sync) {
          await registration.sync.register('sync-tasks');
        } else {
          // Fallback to manual sync if sync isn't available
          await manualSync();
        }
      } else {
        // Otherwise, manually sync
        await manualSync();
      }
    } catch (error) {
      console.error('Error starting sync:', error);
      setIsSyncing(false);
    }
  }, []);

  // Manual sync implementation for browsers that don't support Background Sync API
  const manualSync = async () => {
    try {
      const pendingOps = await idb.getPendingSyncOperations();
      
      if (pendingOps.length === 0) {
        setIsSyncing(false);
        return;
      }
      
      for (const op of pendingOps) {
        let success = false;
        
        try {
          switch (op.operation) {
            case 'create':
              await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(op.data)
              });
              success = true;
              break;
              
            case 'update':
              await fetch(`/api/tasks/${op.data.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(op.data)
              });
              success = true;
              break;
              
            case 'delete':
              await fetch(`/api/tasks/${op.data.id}`, {
                method: 'DELETE'
              });
              success = true;
              break;
          }
          
          if (success && op.id) {
            await idb.markSyncComplete(op.id);
          }
        } catch (error) {
          console.error(`Error syncing operation ${op.operation}:`, error);
        }
      }
      
      // Clear completed operations
      await idb.clearCompletedSyncOperations();
      
      // Refresh UI data
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // Update pending count
      checkPendingOperations();
      
      setIsSyncing(false);
    } catch (error) {
      console.error('Error during manual sync:', error);
      setIsSyncing(false);
    }
  };

  // Helper for offline task operations
  const performOfflineTaskOperation = async (
    operation: 'create' | 'update' | 'delete',
    taskData: any
  ) => {
    // Store in IndexedDB directly
    switch (operation) {
      case 'create':
        // For creation, generate a temporary negative ID
        taskData.id = -Math.floor(Math.random() * 1000000);
        await idb.storeTasks([taskData]);
        break;
        
      case 'update':
        // For updates, update the local copy
        await idb.storeTasks([taskData]);
        break;
        
      case 'delete':
        // For deletions, we can't actually delete from IndexedDB yet
        // because we need the record for syncing
        break;
    }
    
    // Queue for sync when online
    await idb.queueForSync(operation, taskData);
    
    // Update pending operations count
    checkPendingOperations();
    
    // Return the modified data
    return taskData;
  };

  return {
    isOnline,
    isSyncing,
    pendingActions,
    syncPendingOperations,
    performOfflineTaskOperation
  };
}
