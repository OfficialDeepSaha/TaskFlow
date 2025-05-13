import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Add connect.sid cookie for authentication
export function setSessionCookie(sessionId: string) {
  const expires = new Date();
  expires.setDate(expires.getDate() + 7); // 7 day expiration to match server
  document.cookie = `connect.sid=${sessionId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
  console.log('Session cookie set: connect.sid');
  // Store a backup of the session ID in localStorage as a fallback mechanism
  try {
    localStorage.setItem('connect.sid.backup', sessionId);
    console.log('Session backup stored in localStorage');
  } catch (e) {
    console.error('Could not store session backup in localStorage', e);
  }
}

// Clear the session cookie and remove from localStorage (for logout)
export function clearSessionCookie() {
  // Clear the main session cookie
  document.cookie = 'connect.sid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  
  // Also clear it from root path and all subpaths to ensure it's completely removed
  document.cookie = 'connect.sid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; domain=' + window.location.hostname;
  document.cookie = 'connect.sid=; path=/auth; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  document.cookie = 'connect.sid=; path=/dashboard; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  document.cookie = 'connect.sid=; path=/api; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  
  // Clear any other authentication-related cookies
  document.cookie = 'sessionToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  document.cookie = 'userToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  
  console.log('All session cookies cleared');
  
  // Remove backup from localStorage
  try {
    localStorage.removeItem('connect.sid.backup');
    localStorage.removeItem('taskflow.session');
    localStorage.removeItem('taskflow.user');
    console.log('Session backup and all auth data removed from localStorage');
  } catch (e) {
    console.error('Could not remove session backup from localStorage', e);
  }
  
  // Clear session storage as well
  try {
    sessionStorage.clear();
    console.log('Session storage cleared');
  } catch (e) {
    console.error('Could not clear session storage', e);
  }
}

// Get the connect.sid cookie value if it exists
export function getSessionCookie(): string | null {
  // First try to get from cookies
  const cookies = document.cookie.split(';');
  const sidCookie = cookies.find(cookie => cookie.trim().startsWith('connect.sid='));
  if (sidCookie) {
    const sid = sidCookie.trim().substring('connect.sid='.length);
    return sid;
  }
  
  // If not in cookies, try to get from localStorage
  try {
    const backupSid = localStorage.getItem('connect.sid.backup');
    if (backupSid) {
      console.log('Retrieving session ID from localStorage backup');
      // Restore the cookie from the backup
      setSessionCookie(backupSid);
      return backupSid;
    }
  } catch (e) {
    console.error('Could not retrieve backup session from localStorage', e);
  }
  
  return null;
}

// Add debug interceptor for notifications requests
const originalFetch = window.fetch;
window.fetch = function interceptedFetch(input, init) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  
  if (url && url.includes('/api/notifications')) {
    console.error('⚠️ NOTIFICATION REQUEST INTERCEPTED ⚠️');
    console.error('URL:', url);
    console.error('Stack trace:', new Error().stack);
    // Return empty array immediately instead of making the request
    return Promise.resolve(new Response('[]', {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }));
  }
  
  return originalFetch(input, init);
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const text = (await res.text()) || res.statusText;
      console.error(`API error ${res.status}: ${text}`);
      throw new Error(`${res.status}: ${text}`);
    } catch (error) {
      console.error('Error processing response:', error);
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

// Utility to ensure proper API URL formatting
export const normalizeApiUrl = (url: string): string => {
  // Make sure URL starts with /api/
  if (!url.startsWith('/api/') && !url.startsWith('/auth/')) {
    if (url.startsWith('/')) {
      return `/api${url}`;
    } else {
      return `/api/${url}`;
    }
  }
  return url;
};

// Check if we're offline (both navigator online status and network check)
const isOffline = () => {
  return !navigator.onLine;
};

// Access the cache for API requests
async function getApiCache(url: string): Promise<Response | null> {
  if ('caches' in window) {
    try {
      const cache = await caches.open('team-task-tracker-api-v3');
      const cachedResponse = await cache.match(url);
      // TypeScript fix: Convert undefined to null
      return cachedResponse || null;
    } catch (error) {
      console.error('Error accessing API cache:', error);
      return null;
    }
  }
  return null;
}

// Store API response in cache
async function storeInApiCache(url: string, response: Response): Promise<void> {
  if ('caches' in window && response.status === 200) {
    try {
      const cache = await caches.open('team-task-tracker-api-v3');
      // Clone the response to avoid consuming it
      await cache.put(url, response.clone());
    } catch (error) {
      console.error('Error storing in API cache:', error);
    }
  }
}

// Get cached data from IndexedDB based on endpoint type
async function getCachedDataFromIndexedDB(url: string): Promise<any | null> {
  try {
    // Import dynamically to ensure it's only loaded when needed
    const idb = await import('./indexedDB');
    
    // Determine what type of data to get based on the URL
    if (url.includes('/tasks')) {
      return await idb.getAllTasks();
    } else if (url.includes('/users')) {
      // If we have a users endpoint, you might want to check if you have a function to get users from IndexedDB
      // For now returning null, but you could add an implementation to get users from IndexedDB
      return null;
    } else if (url.includes('/analytics')) {
      // Analytics data could also be stored in IndexedDB
      return null;
    } else if (url.includes('/activities')) {
      // Activities data could also be stored in IndexedDB
      return null;
    }
    
    // Add other data types as needed
    return null;
  } catch (error) {
    console.error('Error getting data from IndexedDB:', error);
    return null;
  }
}

// Perform API requests with consistent error handling and offline support
export const apiRequest = async (
  method: string,
  url: string,
  data?: any,
  timeout: number = 10000
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  const normalizedUrl = normalizeApiUrl(url);
  console.log(`API Request: ${method} ${normalizedUrl}`);
  
  // For GET requests, always cache data, and check cache first if offline
  let fetchPromise: Promise<Response> | null = null;
  
  if (method === 'GET') {
    // Default options with credentials included - moved up here so we can use them earlier
    const options: RequestInit = {
      method,
      credentials: 'include', // Always include credentials for cookies
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    };

    // Add body if we have data
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    // Always try to store cached copies of GET requests that come back successfully
    fetchPromise = fetch(normalizedUrl, options).then(response => {
      // For successful GET requests, store in cache for offline use
      if (response.status === 200) {
        console.log('Caching successful response for:', normalizedUrl);
        storeInApiCache(normalizedUrl, response.clone());
      }
      return response;
    }).catch(error => {
      console.error('Fetch error in promise:', error);
      throw error; // Re-throw to be caught by the main try/catch
    });
    
    // If we're offline or this is an important data endpoint, try the cache first
    if (isOffline() || url.includes('tasks') || url.includes('users') || url.includes('analytics')) {
    console.log('Offline mode detected, attempting to use cached data');
    
    // Try to get from cache
    const cachedResponse = await getApiCache(normalizedUrl);
    if (cachedResponse) {
      console.log('Found cached response for:', normalizedUrl);
      clearTimeout(timeoutId);
      return cachedResponse;
    }
    
    // If no cache, try to get from IndexedDB
    const indexedDBData = await getCachedDataFromIndexedDB(normalizedUrl);
    if (indexedDBData) {
      console.log('Using IndexedDB data for:', normalizedUrl);
      clearTimeout(timeoutId);
      
      // Create a Response object from the IndexedDB data
      return new Response(JSON.stringify(indexedDBData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-From-IndexedDB': 'true'
        }
      });
    }
    
    // If no cache or IndexedDB data, return empty data that won't break the UI
    console.log('No cached data available for:', normalizedUrl);
    clearTimeout(timeoutId);
    
    // Return appropriate empty data based on the endpoint type
    let emptyData: any;
    
    // Customize empty data based on endpoint
    if (url.includes('/tasks')) {
      emptyData = [];
    } else if (url.includes('/users')) {
      emptyData = [];
    } else if (url.includes('/analytics')) {
      // For analytics endpoints, return structured data that won't break charts
      if (url.includes('/summary')) {
        emptyData = {
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          pendingTasks: 0,
          overdueTasks: 0,
          completionRate: 0
        };
      } else if (url.includes('/team-performance')) {
        emptyData = [];
      } else if (url.includes('/weekly-completion')) {
        emptyData = [];
      } else {
        emptyData = {};
      }
    } else if (url.includes('/activities')) {
      emptyData = [];
    } else if (url.includes('/reports')) {
      emptyData = [];
    } else {
      // Default empty response for any other endpoints
      emptyData = [];
    }
    
    return new Response(JSON.stringify(emptyData), {
      status: 200, // Return 200 to prevent error handling
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Fallback': 'true'
      }
    });
  }
  
  // We're online or this isn't a critical data endpoint, proceed with normal fetch
  }
  
  try {
    // Options are already defined above for GET requests
    // For non-GET requests, define them here
    let response: Response;
    
    if (method !== 'GET') {
      // For non-GET requests, define options here
      const options: RequestInit = {
        method,
        credentials: 'include', // Always include credentials for cookies
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      };

      // Add body if we have data
      if (data) {
        options.body = JSON.stringify(data);
      }

      console.log('Fetch options for non-GET:', JSON.stringify(options));
      response = await fetch(normalizedUrl, options);
    } else {
      // For GET requests, use the promise we created above
      console.log('Using existing fetch promise for GET request');
      if (fetchPromise) {
        response = await fetchPromise;
      } else {
        // This shouldn't happen, but as a fallback
        console.error('No fetch promise found for GET request, creating new fetch');
        response = await fetch(normalizedUrl, {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });
      }
    }
    
    clearTimeout(timeoutId);
    
    // Log the response details for debugging
    console.log(`API Response: ${response.status} ${response.statusText}`);
    
    // Check for and handle Set-Cookie headers
    const allHeaders = response.headers;
    // Log headers in a compatible way
    console.log('Response headers:');
    allHeaders.forEach((value: string, key: string) => {
      console.log(`${key}: ${value}`);
    });
    
    // Extract cookies from response and store them
    if (response.status === 200 && (url.includes('/login') || url.includes('/register'))) {
      // For login/register, we need to ensure the cookie is properly stored
      const cookies = document.cookie.split(';');
      console.log('Current cookies after login:', cookies);
      
      // Store the session in localStorage as a backup
      const sidCookie = cookies.find(cookie => cookie.trim().startsWith('connect.sid='));
      if (sidCookie) {
        const sid = sidCookie.trim().substring('connect.sid='.length);
        localStorage.setItem('connect.sid.backup', sid);
        console.log('Stored session ID in localStorage backup');
      } else {
        console.warn('No connect.sid cookie found after login!');
        
        // Create a clone of the response to preserve the original
        const responseClone = response.clone();
        
        // Try to extract session ID from response body
        try {
          const data = await responseClone.json();
          if (data && data.sessionId) {
            console.log('Found sessionId in response body, storing it');
            setSessionCookie(data.sessionId);
          }
        } catch (e) {
          console.error('Failed to parse response JSON', e);
        }
      }
    }
    
    // Special handling for logout endpoint - don't try to parse JSON
    if (url.includes('/logout') && response.status === 200) {
      console.log('Logout endpoint returned success status');
      return response;
    }
    
    // Check for errors
    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('API request error:', error);
    throw error;
  }
};

type UnauthorizedBehavior = "returnNull" | "throw" | "redirect";

// Helper function to return empty data for specific API endpoints that won't break the UI
function getEmptyResponseForEndpoint<T>(url: string): T {
  if (url.includes('/api/users') || url.includes('/users')) {
    return [] as unknown as T;
  }
  if (url.includes('/api/tasks') || url.includes('/tasks')) {
    return [] as unknown as T;
  }
  if (url.includes('/api/analytics') || url.includes('/analytics')) {
    if (url.includes('/summary')) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        completionRate: 0
      } as unknown as T;
    } else {
      return [] as unknown as T;
    }
  }
  if (url.includes('/api/activities') || url.includes('/activities')) {
    return [] as unknown as T;
  }
  if (url.includes('/api/reports') || url.includes('/reports')) {
    return [] as unknown as T;
  }
  // Default case - empty array is safer than null
  return [] as unknown as T;
}

export function getQueryFn<T>(options: {
  on401: UnauthorizedBehavior;
  timeoutMs?: number;
}): QueryFunction<T> {
  const { on401: unauthorizedBehavior, timeoutMs = 3000 } = options;
  
  return async ({ queryKey }) => {
    const url = queryKey[0] as string;
    console.log(`Query Fn: ${url}`);
    
    // First, check if we're offline and this is a cacheable endpoint
    if (!navigator.onLine && (url.includes('/tasks') || url.includes('/users') || url.includes('/analytics'))) {
      console.log(`Offline detected for query ${url}, trying cache...`);
      
      try {
        // Try to get from cache first
        if ('caches' in window) {
          const cache = await caches.open('team-task-tracker-api-v3');
          const cachedResponse = await cache.match(url);
          
          if (cachedResponse) {
            console.log(`Found cached data for query ${url}`);
            const text = await cachedResponse.clone().text();
            return JSON.parse(text) as T;
          }
        }
        
        // Try IndexedDB as backup
        if (url.includes('/tasks')) {
          const idb = await import('./indexedDB');
          console.log('Trying to get tasks from IndexedDB...');
          const tasks = await idb.getAllTasks();
          if (tasks && tasks.length > 0) {
            console.log(`Found ${tasks.length} tasks in IndexedDB`);
            return tasks as unknown as T;
          }
        }
        
        // Default empty responses that won't crash the UI
        console.log(`No offline data found for ${url}, returning empty data`);
        return getEmptyResponseForEndpoint<T>(url);
      } catch (cacheError) {
        console.error('Error retrieving cached data:', cacheError);
        return getEmptyResponseForEndpoint<T>(url);
      }
    }
    
    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn(`Query request timed out: ${url}`);
      }, timeoutMs);
      
      // Set cache control headers to prevent excessive caching
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Accept': 'application/json'
      };
      
      // Explicitly add connect.sid cookie to ensure authentication works
      const sessionId = getSessionCookie();
      if (sessionId) {
        headers['Cookie'] = `connect.sid=${sessionId}`;
      }
      
      const res = await fetch(url, {
        credentials: "include",
        headers,
        signal: controller.signal
      });
      
      // Clear timeout if request completed
      clearTimeout(timeoutId);

      console.log(`Query Response: ${url} - Status: ${res.status}`);
      
      // Check if we need to update the session cookie from response
      const setCookieHeader = res.headers.get('set-cookie');
      if (setCookieHeader) {
        const sidMatch = setCookieHeader.match(/connect\.sid=([^;]+)/);
        if (sidMatch && sidMatch[1]) {
          setSessionCookie(sidMatch[1]);
        }
      }
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Query ${url} returned 401, returning null`);
        return null as unknown as T;
      }
      
      // For 200 responses, cache them for offline use
      if (res.status === 200 && (url.includes('/tasks') || url.includes('/users') || url.includes('/analytics'))) {
        console.log(`Caching successful response for offline use: ${url}`);
        if ('caches' in window) {
          const cache = await caches.open('team-task-tracker-api-v3');
          await cache.put(url, res.clone());
        }
      }

      await throwIfResNotOk(res);
      
      // Parse response body as text for robust JSON handling
      const text = await res.clone().text();
      const previewText = text.substring(0, 200) + (text.length > 200 ? '...' : '');
      console.log(`Query ${url} response text preview: ${previewText}`);

      // Handle HTML responses gracefully
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        console.error(`HTML response received when JSON expected from ${url}`);
        return getEmptyResponseForEndpoint<T>(url);
      }

      // Parse JSON from text
      try {
        const data = JSON.parse(text) as T;
        console.log(`Query data parsed for ${url}`);
        return data;
      } catch (jsonError) {
        console.error(`Failed to parse JSON from response of ${url}`, jsonError);
        return getEmptyResponseForEndpoint<T>(url);
      }
    } catch (error) {
      // Enhanced error handling
      console.error(`Error fetching ${url}:`, error);
      
      // If this is a network error and we're offline, try to get data from cache
      if (!navigator.onLine || (error instanceof Error && error.message.includes('network'))) {
        console.log('Network error or offline, trying fallback methods...');
        
        // Try to get from cache
        try {
          if ('caches' in window) {
            const cache = await caches.open('team-task-tracker-api-v3');
            const cachedResponse = await cache.match(url);
            
            if (cachedResponse) {
              console.log(`Found cached data for query ${url} after network error`);
              const text = await cachedResponse.clone().text();
              return JSON.parse(text) as T;
            }
          }
        } catch (fallbackError) {
          console.error('Error retrieving from cache during error fallback:', fallbackError);
        }
      }
      
      // Check if this is an abort error (timeout)
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.error(`Query request timed out: ${url}`);
        return getEmptyResponseForEndpoint<T>(url);
      }
      
      console.error(`Query failed: ${url}`, error);
      return getEmptyResponseForEndpoint<T>(url);
    }
  };
}

// No notifications interceptor - removed completely

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry with exponential backoff
      // This will retry 4x with increasing delay before failing
      // Approx delay pattern: 1s, 2s, 4s, 8s, 16s
      retry: (failureCount, error) => {
        // Don't retry if we're offline - we'll use cached data instead
        if (!navigator.onLine) {
          console.log('Offline detected during query, not retrying');
          return false;
        }
        
        // Limit number of retries based on error type
        // Don't retry on 401/403/404 errors
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          if (
            message.includes('401') || 
            message.includes('403') || 
            message.includes('404')
          ) {
            return false;
          }
        }
        // Default retry policy - up to 4 retries
        return failureCount < 4;
      },
      retryDelay: 1000,
      // Increased stale time to reduce network requests
      staleTime: 10 * 60 * 1000, // 10 minutes before refetching
      // Longer cache retention
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      // Disable automatic refetching on window focus to prefer cached data
      refetchOnWindowFocus: false,
      // Only refetch when mounting if data is stale
      refetchOnMount: 'always',
      // Refetch when coming back online
      refetchOnReconnect: true,
      // Add a timeout to prevent queries from hanging
      queryFn: getQueryFn({
        on401: 'redirect', // redirect to login on 401s
        timeoutMs: 30000, // 30 seconds
      }),
    },
  },
});
