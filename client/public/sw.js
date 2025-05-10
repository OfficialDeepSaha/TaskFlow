// Service Worker for Team Task Tracker PWA
const CACHE_NAME = 'team-task-tracker-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/index-XvnJhrJe.css', // Update this with your actual CSS filename
  '/assets/index-BujqPzn6.js',  // Update this with your actual JS filename
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache if available, otherwise fetch from network
self.addEventListener('fetch', (event) => {
  // Skip non-HTTP/HTTPS requests (including chrome-extension URLs)
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Skip WebSocket requests
  if (event.request.url.includes('/ws') || 
      event.request.url.includes('websocket') || 
      event.request.headers.get('Upgrade') === 'websocket') {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // For API requests, use a network-first strategy with offline fallback
  if (event.request.url.includes('/api/')) {
    return event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If network request successful, clone and cache response
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              try {
                cache.put(event.request, responseClone);
              } catch (error) {
                console.error('Failed to cache response:', error);
              }
            });
          }
          return response;
        })
        .catch(() => {
          // If network request fails, try to serve from cache with offline fallback
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline JSON for API requests
            return new Response(
              JSON.stringify({
                error: true,
                message: 'You are currently offline. Please reconnect to the internet.',
                isOffline: true
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503,
                statusText: 'Service Unavailable'
              }
            );
          });
        })
    );
  }

  // For static assets, use a cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200) {
          return response;
        }

        // Cache successful responses for static assets
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          try {
            cache.put(event.request, responseClone);
          } catch (error) {
            console.error('Failed to cache response:', error);
          }
        });

        return response;
      });
    })
  );
});

// Handle messages from client (e.g., skip waiting)
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Sync event for deferred operations when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

// Function to sync pending tasks when back online
async function syncTasks() {
  try {
    // Get pending tasks from IndexedDB
    const pendingTasks = await getPendingTasks();
    
    // Process each pending task
    for (const task of pendingTasks) {
      switch (task.operation) {
        case 'create':
          await sendToServer('/api/tasks', 'POST', task.data);
          break;
        case 'update':
          await sendToServer(`/api/tasks/${task.data.id}`, 'PATCH', task.data);
          break;
        case 'delete':
          await sendToServer(`/api/tasks/${task.data.id}`, 'DELETE');
          break;
      }
      
      // Mark task as synced
      await markTaskAsSynced(task.id);
    }
    
    // Notify clients that sync is complete
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'sync-complete',
          count: pendingTasks.length
        });
      });
    });
    
  } catch (error) {
    console.error('Error syncing tasks:', error);
  }
}

// Placeholder functions for IndexedDB operations
// These would be implemented in the actual IndexedDB utility file
async function getPendingTasks() {
  // This is a placeholder - would fetch from IndexedDB in the actual implementation
  return [];
}

async function markTaskAsSynced(id) {
  // This is a placeholder - would update in IndexedDB in the actual implementation
}

async function sendToServer(url, method, data) {
  // This is a placeholder - would actually make network request in the implementation
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined
  });
  return response.json();
}
