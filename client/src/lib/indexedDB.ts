// IndexedDB utility for offline data support

const DB_NAME = 'team-task-tracker-db';
const DB_VERSION = 1;
const TASKS_STORE = 'tasks';
const SYNC_QUEUE_STORE = 'sync-queue';

interface SyncQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  synced: boolean;
}

/**
 * Initialize the IndexedDB database
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event);
      reject('Error opening IndexedDB');
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create a store for tasks
      if (!db.objectStoreNames.contains(TASKS_STORE)) {
        const taskStore = db.createObjectStore(TASKS_STORE, { keyPath: 'id' });
        taskStore.createIndex('userId', 'assignedToId', { unique: false });
        taskStore.createIndex('status', 'status', { unique: false });
        taskStore.createIndex('dueDate', 'dueDate', { unique: false });
      }

      // Create a store for the sync queue
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        syncStore.createIndex('synced', 'synced', { unique: false });
        syncStore.createIndex('operation', 'operation', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Store tasks in IndexedDB for offline access
 */
export async function storeTasks(tasks: any[]): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(TASKS_STORE, 'readwrite');
  const store = transaction.objectStore(TASKS_STORE);

  // Store all tasks
  tasks.forEach(task => {
    store.put(task);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => {
      console.error('Error storing tasks:', event);
      reject('Error storing tasks');
    };
  });
}

/**
 * Get all tasks from IndexedDB
 */
export async function getAllTasks(): Promise<any[]> {
  const db = await initDB();
  const transaction = db.transaction(TASKS_STORE, 'readonly');
  const store = transaction.objectStore(TASKS_STORE);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => {
      console.error('Error getting tasks:', event);
      reject('Error getting tasks');
    };
  });
}

/**
 * Get task by ID from IndexedDB
 */
export async function getTaskById(id: number): Promise<any> {
  const db = await initDB();
  const transaction = db.transaction(TASKS_STORE, 'readonly');
  const store = transaction.objectStore(TASKS_STORE);
  const request = store.get(id);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => {
      console.error('Error getting task:', event);
      reject('Error getting task');
    };
  });
}

/**
 * Get tasks assigned to a specific user
 */
export async function getTasksByUserId(userId: number): Promise<any[]> {
  const db = await initDB();
  const transaction = db.transaction(TASKS_STORE, 'readonly');
  const store = transaction.objectStore(TASKS_STORE);
  const index = store.index('userId');
  const request = index.getAll(userId);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => {
      console.error('Error getting tasks by user:', event);
      reject('Error getting tasks by user');
    };
  });
}

/**
 * Queue an operation for syncing when back online
 */
export async function queueForSync(operation: 'create' | 'update' | 'delete', data: any): Promise<number> {
  const db = await initDB();
  const transaction = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
  const store = transaction.objectStore(SYNC_QUEUE_STORE);

  const syncItem: SyncQueueItem = {
    operation,
    data,
    timestamp: Date.now(),
    synced: false
  };

  const request = store.add(syncItem);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = (event) => {
      console.error('Error queuing for sync:', event);
      reject('Error queuing for sync');
    };
  });
}

/**
 * Get all pending sync operations
 */
export async function getPendingSyncOperations(): Promise<SyncQueueItem[]> {
  const db = await initDB();
  const transaction = db.transaction(SYNC_QUEUE_STORE, 'readonly');
  const store = transaction.objectStore(SYNC_QUEUE_STORE);
  const index = store.index('synced');
  const request = index.getAll(IDBKeyRange.only(0)); // Use 0 for false

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => {
      console.error('Error getting pending sync operations:', event);
      reject('Error getting pending sync operations');
    };
  });
}

/**
 * Mark a sync operation as complete
 */
export async function markSyncComplete(id: number): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
  const store = transaction.objectStore(SYNC_QUEUE_STORE);
  
  // First get the item
  const getRequest = store.get(id);
  
  return new Promise((resolve, reject) => {
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.synced = true;
        const updateRequest = store.put(item);
        
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = (event) => {
          console.error('Error marking sync complete:', event);
          reject('Error marking sync complete');
        };
      } else {
        reject('Sync item not found');
      }
    };
    
    getRequest.onerror = (event) => {
      console.error('Error getting sync item:', event);
      reject('Error getting sync item');
    };
  });
}

/**
 * Clear all completed sync operations
 */
export async function clearCompletedSyncOperations(): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
  const store = transaction.objectStore(SYNC_QUEUE_STORE);
  const index = store.index('synced');
  const request = index.getAll(IDBKeyRange.only(1)); // Use 1 for true

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const syncedItems = request.result;
      
      if (syncedItems.length > 0) {
        // Delete each synced item
        syncedItems.forEach(item => {
          store.delete(item.id as number);
        });
        
        transaction.oncomplete = () => resolve();
      } else {
        resolve();
      }
    };
    
    request.onerror = (event) => {
      console.error('Error clearing completed sync operations:', event);
      reject('Error clearing completed sync operations');
    };
    
    transaction.onerror = (event) => {
      console.error('Transaction error during clearing:', event);
      reject('Transaction error during clearing');
    };
  });
}
