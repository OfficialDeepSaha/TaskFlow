// Service Worker for TaskFlow - Simple but Reliable PWA Implementation
const CACHE_VERSION = 'v5';
const CACHE_NAME = `taskflow-${CACHE_VERSION}`;

// All assets we want to cache for offline use
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/favicon.ico',
];

// Simple event logging for debugging
function logEvent(eventName, details = '') {
  console.log(`[SW ${CACHE_VERSION}] ${eventName}${details ? ': ' + details : ''}`);
}

// ====== INSTALLATION - Cache all needed assets ======
self.addEventListener('install', event => {
  logEvent('install', 'Starting service worker installation');
  
  // Skip waiting immediately to take control
  self.skipWaiting();
  
  // Cache all critical assets
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      logEvent('install', `Caching ${ASSETS_TO_CACHE.length} critical assets`);
      return cache.addAll(ASSETS_TO_CACHE);
    })
    .then(() => {
      logEvent('install', 'Service worker installation complete');
    })
    .catch(error => {
      console.error('[SW ERROR] Installation failed:', error);
    })
  );
});

// ====== ACTIVATION - Clean up old caches and take control ======
self.addEventListener('activate', event => {
  logEvent('activate', 'Service worker activating');
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('taskflow-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          logEvent('activate', `Deleting old cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    })
    .then(() => {
      // Take control of all clients/pages immediately
      logEvent('activate', 'Taking control of all pages');
      return self.clients.claim();
    })
    .catch(error => {
      console.error('[SW ERROR] Activation failed:', error);
    })
  );
});

// ====== FETCH - Handle all network requests ======
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip requests to other domains
  if (url.origin !== location.origin) {
    return;
  }
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Log the request for debugging
  logEvent('fetch', `${event.request.method} ${url.pathname}`);
  
  // Special handling for navigation requests (loading a page)
  if (event.request.mode === 'navigate') {
    logEvent('fetch', `Navigation request: ${url.pathname}`);
    event.respondWith(
      // First try the network
      fetch(event.request)
        .then(response => {
          // If we got a valid response, clone it and cache it
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                logEvent('fetch', `Caching navigation response: ${url.pathname}`);
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(error => {
          logEvent('fetch', `Navigation request failed: ${error.message}`);
          
          // If network request fails, try to get from cache
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                logEvent('fetch', `Serving navigation from cache: ${url.pathname}`);
                return cachedResponse;
              }
              
              // If not in cache, try the home page
              return caches.match('/')
                .then(homeResponse => {
                  if (homeResponse) {
                    logEvent('fetch', 'Serving homepage from cache as fallback');
                    return homeResponse;
                  }
                  
                  // Last resort - offline page
                  logEvent('fetch', 'Serving offline page as last resort');
                  return caches.match('/offline.html');
                });
            });
        })
    );
    return;
  }
  
  // For API requests, use a network-first strategy with JSON fallback
  if (url.pathname.startsWith('/api/')) {
    logEvent('fetch', `API request: ${url.pathname}`);
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache all successful API responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              logEvent('fetch', `Caching API response: ${url.pathname}`);
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(error => {
          logEvent('fetch', `API request failed: ${error.message}`);
          
          // Try to get from cache first
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                logEvent('fetch', `Serving API from cache: ${url.pathname}`);
                return cachedResponse;
              }
              
              // If no cached response, return empty data that won't break the UI
              let emptyData = [];
              
              // Different empty data structures for different endpoints
              if (url.pathname.includes('/tasks')) {
                emptyData = [];
              } else if (url.pathname.includes('/users')) {
                emptyData = [];
              } else if (url.pathname.includes('/analytics')) {
                if (url.pathname.includes('/summary')) {
                  emptyData = {
                    totalTasks: 0,
                    completedTasks: 0,
                    inProgressTasks: 0,
                    pendingTasks: 0,
                    overdueTasks: 0
                  };
                } else {
                  emptyData = [];
                }
              } else {
                emptyData = [];
              }
              
              logEvent('fetch', `Returning empty fallback data for API: ${url.pathname}`);
              return new Response(JSON.stringify(emptyData), {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'X-Offline-Fallback': 'true'
                }
              });
            });
        })
    );
    return;
  }
  
  // For JavaScript files (app code), use cache-first strategy
  if (url.pathname.endsWith('.js') || url.pathname.includes('/assets/')) {
    logEvent('fetch', `Asset request: ${url.pathname}`);
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // If found in cache, return it
          if (cachedResponse) {
            logEvent('fetch', `Serving asset from cache: ${url.pathname}`);
            return cachedResponse;
          }
          
          // If not found in cache, fetch from network and cache
          return fetch(event.request)
            .then(response => {
              // Don't cache bad responses
              if (!response || response.status !== 200) {
                return response;
              }
              
              // Clone the response and cache it
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                logEvent('fetch', `Caching asset: ${url.pathname}`);
                cache.put(event.request, responseToCache);
              });
              
              return response;
            })
            .catch(error => {
              logEvent('fetch', `Asset request failed: ${error.message}`);
              console.error('Failed to fetch asset:', error);
              
              // For CSS, return empty CSS to prevent rendering errors
              if (url.pathname.endsWith('.css')) {
                return new Response('/* Offline fallback CSS */', {
                  headers: { 'Content-Type': 'text/css' }
                });
              }
              
              // For JS, return an empty function to prevent errors
              if (url.pathname.endsWith('.js')) {
                return new Response(
                  '/* Offline fallback JS */ console.log("[Offline] Failed to load script");',
                  { headers: { 'Content-Type': 'application/javascript' } }
                );
              }
              
              // For fonts/images, return empty response
              if (url.pathname.match(/\.(woff|woff2|ttf|png|jpg|jpeg|gif|svg)$/i)) {
                return new Response('', { status: 200 });
              }
              
              throw error;
            });
        })
    );
    return;
  }
  
  // Default fetch handler for everything else - cache first, network fallback
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          logEvent('fetch', `Serving from cache: ${url.pathname}`);
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            // Only cache successful responses
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                logEvent('fetch', `Caching: ${url.pathname}`);
                cache.put(event.request, responseToCache);
              });
            }
            return response;
          })
          .catch(error => {
            logEvent('fetch', `Request failed: ${error.message}`);
            console.error('Network request failed:', error);
            
            // Return a fallback for specific file types
            const ext = url.pathname.split('.').pop();
            if (['css', 'js', 'jpg', 'png', 'gif', 'svg', 'woff', 'woff2'].includes(ext)) {
              return new Response('/* Offline fallback content */', {
                status: 200,
                headers: { 'Content-Type': ext === 'css' ? 'text/css' : 'application/javascript' }
              });
            }
            
            throw error;
          });
      })
  );
});

// Listen for messages from the client (e.g., to skip waiting)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    logEvent('message', 'Received skip waiting command - activating immediately');
    self.skipWaiting();
  }
});

// Send a message to all controlled clients
function sendMessageToClients(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage(message);
    });
  });
}

// ====== PUSH NOTIFICATION HANDLING ======
self.addEventListener('push', event => {
  logEvent('push', 'Received push notification');
  
  const notificationData = event.data ? event.data.json() : { title: 'New Notification', body: 'Something happened in TaskFlow!' };
  
  const showNotification = self.registration.showNotification(notificationData.title, {
    body: notificationData.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: notificationData
  });
  
  event.waitUntil(showNotification);
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  logEvent('notificationclick', 'Notification clicked');
  
  event.notification.close();
  
  // Navigate to the app when the notification is clicked
  event.waitUntil(
    self.clients.matchAll({ type: 'window' })
      .then(clientList => {
        // If a window client is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
  );
});

// Log successful installation
logEvent('loaded', `Service Worker (${CACHE_VERSION}) loaded successfully`);
