// Service Worker for Team Task Tracker PWA
const CACHE_NAME = 'team-task-tracker-v2';
const STATIC_CACHE_NAME = 'team-task-tracker-static-v2';
const API_CACHE_NAME = 'team-task-tracker-api-v2';

// Assets that should be available offline
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/index.css',
  '/assets/index-sz8t-6m0.js',
  '/assets/vendor.D9FakB_Q.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html'
];

// API routes to cache for offline use
const API_ROUTES_TO_CACHE = [
  '/api/tasks',
  '/api/user'
];

// Create empty offline.html if it doesn't exist
self.addEventListener('install', event => {
  event.waitUntil(
    fetch('/offline.html')
      .catch(() => new Response(
        '<html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection and try again.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      ))
  );
})

// Install event - cache assets
self.addEventListener('install', (event) => {
  // Cache static assets
  const cacheStaticAssets = caches.open(STATIC_CACHE_NAME)
    .then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(ASSETS_TO_CACHE);
    });
  
  // Pre-cache API responses if needed
  const cacheAPIAssets = caches.open(API_CACHE_NAME)
    .then((cache) => {
      console.log('Setting up API cache');
      // We're not pre-caching API responses, just setting up the cache
      return Promise.resolve();
    });
  
  event.waitUntil(Promise.all([cacheStaticAssets, cacheAPIAssets]));
  
  // Force activation without waiting for all tabs to close
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE_NAME, API_CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('Deleting outdated cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      // Claim control of all clients under this service worker's scope
      // This ensures the SW controls clients immediately without reload
      console.log('Service Worker activated and taking control');
      return self.clients.claim();
    })
  );
});

// Fetch event - advanced caching strategies based on request type
self.addEventListener('fetch', (event) => {
  // Skip non-HTTP/HTTPS requests
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

  // Skip non-GET requests except for task operations that should be queued while offline
  if (event.request.method !== 'GET') {
    // For task operations, let them fail normally to be handled by the application code
    // which will queue them in IndexedDB for later sync
    if (event.request.url.includes('/api/tasks')) {
      // Let the request continue and be handled by the application
      return;
    }
    // For other non-GET requests, proceed without special handling
    return;
  }

  // For navigation requests (HTML documents), use a network-first strategy
  // with a fallback to the offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // For API requests, use a network-first strategy with cached fallback
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful API responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              try {
                // Don't cache tasks that should be queued while offline
                if (!event.request.url.includes('/api/tasks')) {
                  cache.put(event.request, responseClone);
                }
              } catch (error) {
                console.error('Failed to cache API response:', error);
              }
            });
          }
          return response;
        })
        .catch(() => {
          // If network request fails, try to serve from cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // For failed API requests while offline, return structured error
            return new Response(
              JSON.stringify({
                error: true,
                message: 'You are currently offline. Your changes will sync when you reconnect.',
                isOffline: true,
                timestamp: Date.now()
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
    return;
  }

  // For static assets (CSS, JS, images), use a cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // If not found in cache, fetch from network
      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200) {
          return response;
        }

        // Cache successful responses for static assets
        const responseClone = response.clone();
        caches.open(STATIC_CACHE_NAME).then((cache) => {
          try {
            cache.put(event.request, responseClone);
          } catch (error) {
            console.error('Failed to cache static asset:', error);
          }
        });

        return response;
      })
      .catch(error => {
        console.error('Failed to fetch asset:', error);
        
        // For font requests or certain assets, we can show a fallback
        if (event.request.url.includes('.woff') || 
            event.request.url.includes('.ttf') ||
            event.request.url.includes('.svg')) {
          // Return a minimal response - browsers will use system fonts
          return new Response('', {
            status: 404,
            statusText: 'Not Found'
          });
        }
        
        // For image requests, we could return a placeholder image
        if (event.request.url.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          return caches.match('/icons/placeholder.png')
            .catch(() => new Response('Image not available offline', {
              status: 404,
              statusText: 'Not Found'
            }));
        }
        
        // Otherwise, just propagate the error
        throw error;
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
