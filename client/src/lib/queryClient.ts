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

// Perform API requests with consistent error handling
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
  
  try {
    // Default options with credentials included
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

    // Make the request
    console.log('Fetch options:', JSON.stringify(options));
    const response = await fetch(normalizedUrl, options);
    clearTimeout(timeoutId);
    
    // Log the response details for debugging
    console.log(`API Response: ${response.status} ${response.statusText}`);
    
    // Check for and handle Set-Cookie headers
    const allHeaders = response.headers;
    // Log headers in a compatible way
    console.log('Response headers:');
    allHeaders.forEach((value, key) => {
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

type UnauthorizedBehavior = "returnNull" | "throw";

// Helper function to return empty data for specific API endpoints
function getEmptyResponseForEndpoint<T>(url: string): T {
  if (url.includes('/api/users')) {
    return [] as unknown as T;
  }
  if (url.includes('/api/tasks')) {
    return [] as unknown as T;
  }
  return null as unknown as T;
}

export function getQueryFn<T>(options: {
  on401: UnauthorizedBehavior;
  timeoutMs?: number;
}): QueryFunction<T> {
  const { on401: unauthorizedBehavior, timeoutMs = 3000 } = options;
  
  return async ({ queryKey }) => {
    const url = queryKey[0] as string;
    console.log(`Query Fn: ${url}`);
    
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
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Only retry once for most queries
        if (failureCount >= 1) return false;
        
        // For auth queries, retry more times
        if (typeof error === 'object' && error && 'message' in error) {
          const errorMessage = (error as Error).message;
          if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
            return failureCount < 2; // Retry network issues twice
          }
        }
        
        return false;
      },
      retryDelay: 1000,
      refetchOnMount: false,
      refetchOnReconnect: true,
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Add a timeout to prevent queries from hanging
      queryFn: getQueryFn<unknown>({ on401: "returnNull", timeoutMs: 3000 }),
    },
    mutations: {
      retry: 0, // Don't retry mutations
    },
  },
});
