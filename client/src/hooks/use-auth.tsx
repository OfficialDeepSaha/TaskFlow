import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { InsertUser, User } from "../../../shared/schema";
import { queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import axios from "axios";
import { apiRequest, setSessionCookie, clearSessionCookie } from "@/lib/queryClient";
import { connectWebSocket, disconnectWebSocket } from "@/lib/websocket";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, InsertUser>;
  refetchUser: () => void;
  loadingUser: boolean;
  isAuthenticated: boolean;
  setConnectSidCookie: (sid: string) => void;
};

type LoginData = {
  username: string;
  password: string;
};

// Create a default context value to use as fallback if context access fails
const defaultAuthContext: AuthContextType = {
  user: null,
  isLoading: false,
  error: null,
  loginMutation: {} as UseMutationResult<User, Error, LoginData>,
  logoutMutation: {} as UseMutationResult<void, Error, void>,
  registerMutation: {} as UseMutationResult<User, Error, InsertUser>,
  refetchUser: () => {},
  loadingUser: false,
  isAuthenticated: false,
  setConnectSidCookie: () => {}
};

export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  
  // Start auth check immediately and restore session if possible
  useEffect(() => {
    console.log('Starting authentication check');
    
    // Try to restore session from localStorage on page load/refresh
    const restoreSession = async () => {
      try {
        // Check for session cookie
        const sessionCookie = document.cookie
          .split(';')
          .find(cookie => cookie.trim().startsWith('connect.sid='));
        
        // Also check localStorage backup
        const backupSessionId = localStorage.getItem('connect.sid.backup');
          
        // If we have a session ID in either location, try to restore it
        if (sessionCookie) {
          console.log('Found existing session cookie, initializing auth check');
        } else if (backupSessionId) {
          console.log('Found backup session in localStorage, restoring cookie');
          // Restore the cookie from backup
          const expires = new Date();
          expires.setDate(expires.getDate() + 7); // 7 day expiration
          document.cookie = `connect.sid=${backupSessionId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
          console.log('Restored session cookie from localStorage backup');
        } else {
          console.log('No existing session found');
        }
        
        // Always initialize so queries can run
        setIsInitialized(true);
      } catch (error) {
        console.error('Error restoring session:', error);
        setIsInitialized(true); // Still mark as initialized so queries can run
      }
    };
    
    restoreSession();
  }, []);
  
  // We'll add an extra check after refetchUser is defined
  
  // User query with simplified approach
  const {
    data: currentUser,
    error: userError,
    isLoading: loadingUser,
    refetch: refetchUser,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        console.log('Fetching user data with axios...');
        
        // Make sure we send the session cookie if it exists
        const backupSessionId = localStorage.getItem('connect.sid.backup');
        const headers: Record<string, string> = {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Accept': 'application/json'
        };
        
        // Try to restore cookie from backup if needed
        if (backupSessionId && !document.cookie.includes('connect.sid')) {
          console.log('No session cookie found, restoring from backup');
          const expires = new Date();
          expires.setDate(expires.getDate() + 7);
          document.cookie = `connect.sid=${backupSessionId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
        }
        
        const response = await axios.get('/api/user', {
          withCredentials: true, // Important! This ensures cookies are sent
          headers,
          timeout: 3000 // 3 second timeout for more reliable requests
        });
        
        console.log('User fetch response:', response.status);
        const userData = response.data;
        
        // If successful, also check if we need to update our localStorage backup
        const cookies = document.cookie.split(';');
        const sidCookie = cookies.find(cookie => cookie.trim().startsWith('connect.sid='));
        if (sidCookie) {
          const sid = sidCookie.trim().substring('connect.sid='.length);
          localStorage.setItem('connect.sid.backup', sid);
          console.log('Updated session backup in localStorage');
        }
        
        console.log('User data fetched successfully');
        return userData;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            console.log('User not authenticated (401)');
            // If we have a backup but still got 401, the backup is invalid
            if (localStorage.getItem('connect.sid.backup')) {
              console.log('Session backup appears to be invalid, removing');
              localStorage.removeItem('connect.sid.backup');
            }
            return null;
          }
          
          console.error('API error:', error.message);
          throw new Error(error.message);
        } else {
          console.error('Unknown error:', error);
          throw new Error('Unknown error occurred');
        }
      }
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
    gcTime: Infinity, // Keep user in cache indefinitely
    enabled: isInitialized,
  });
  
  // Set user when data changes
  useEffect(() => {
    if (currentUser) {
      console.log('User data received:', currentUser.name);
      setUser(currentUser);
    } else if (userError) {
      console.error('User data error:', userError);
      setUser(null);
    }
  }, [currentUser, userError]);
  
  // Add an extra check that runs after mount for more persistent sessions
  useEffect(() => {
    if (isInitialized) {
      // Small delay to allow initial auth query to complete
      const timeoutId = setTimeout(() => {
        if (!user) {
          console.log('No user after initialization, attempting session recovery');
          // Check if we have a session cookie or backup
          const sessionCookie = document.cookie
            .split(';')
            .find(cookie => cookie.trim().startsWith('connect.sid='));
          const backupSessionId = localStorage.getItem('connect.sid.backup');
          
          if (sessionCookie || backupSessionId) {
            console.log('Found session information, trying to refetch user data');
            refetchUser();
          } else {
            console.log("No user found, refetching...");
            refetchUser().then((result) => {
              if (result.isError) {
                console.log("Refetch failed, navigating to auth");
                navigate("/auth");
              }
            })
          }
        }
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isInitialized, user, refetchUser, navigate]);
  
  // Effect to connect WebSocket for already logged-in users
  useEffect(() => {
    if (user?.id) {
      // Connect to WebSocket for real-time notifications
      console.log('Connecting to WebSocket for existing user', user.id);
      connectWebSocket(user.id);
      
      // Disconnect when component unmounts or user changes
      return () => {
        console.log('Disconnecting WebSocket');
        disconnectWebSocket();
      };
    }
  }, [user?.id]);
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log('Attempting login with:', credentials.username);
      const res = await apiRequest('POST', '/api/login', credentials);
      
      // Extract and set the connect.sid cookie if needed
      const cookies = document.cookie.split(';');
      const sidCookie = cookies.find(cookie => cookie.trim().startsWith('connect.sid='));
      if (!sidCookie) {
        // If cookie is not set automatically, manually set it
        const setCookieHeader = res.headers.get('set-cookie');
        if (setCookieHeader) {
          const sidMatch = setCookieHeader.match(/connect\.sid=([^;]+)/);
          if (sidMatch && sidMatch[1]) {
            setSessionCookie(sidMatch[1]);
          }
        }
      }
      
      return res.json();
    },
    onSuccess: (userData: User) => {
      console.log('Login successful for:', userData.name);
      
      // Update cache
      queryClient.setQueryData(["/api/user"], userData);
      
      // Force set session cookie for all users (admin and regular users)
      // This ensures the cookie is properly set even if the automatic setting didn't work
      const cookies = document.cookie.split(';');
      const sidCookie = cookies.find(cookie => cookie.trim().startsWith('connect.sid='));
      if (sidCookie) {
        const sid = sidCookie.trim().substring('connect.sid='.length);
        setSessionCookie(sid);
      }
      
      // Connect to WebSocket for real-time notifications
      if (userData.id) {
        console.log('Connecting to WebSocket for notifications');
        connectWebSocket(userData.id);
      }
      
      // Show success toast
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.name}!`,
      });
      
      // Navigate to dashboard immediately
      console.log('Navigating to dashboard after login');
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      console.log('Attempting registration for:', credentials.username);
      const res = await apiRequest('POST', '/api/register', credentials);
      return res.json();
    },
    onSuccess: (userData: User) => {
      console.log('Registration successful for:', userData.name);
      
      // Update cache
      queryClient.setQueryData(["/api/user"], userData);
      
      // Show success toast
      toast({
        title: "Registration successful",
        description: `Welcome to TaskFlow, ${userData.name}!`,
      });
      
      // Navigate to dashboard immediately
      console.log('Navigating to dashboard after registration');
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('Attempting logout');
      try {
        // First try the server logout endpoint
        await apiRequest('POST', '/api/logout', {});
        console.log('Server logout successful');
      } catch (error) {
        // If server logout fails, we'll still do client-side cleanup
        console.warn('Server logout failed, but continuing with client cleanup:', error);
      }
      
      // Even if the server logout fails, we'll clear everything on the client
      return;
    },
    onSuccess: () => {
      console.log('Logout successful - clearing all state and storage');
      
      // Disconnect WebSocket first
      disconnectWebSocket();
      
      // Clear session cookies
      clearSessionCookie();
      
      // Set user to null immediately
      setUser(null);
      
      // Clear auth state
      queryClient.setQueryData(["/api/user"], null);
      
      // Clear all query cache
      queryClient.clear();
      
      // Show success toast
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      
      // Force a page reload to ensure all components unmount and reset
      setTimeout(() => {
        console.log('Navigating to auth page after logout');
        navigate("/auth");
        
        // Optional: Add a small delay and force refresh to ensure a clean state
        setTimeout(() => {
          window.location.href = '/auth';
        }, 100);
      }, 50);
    },
    onError: (error: Error) => {
      console.error('Logout error:', error);
      
      // Even on error, try to clean up client-side state
      disconnectWebSocket();
      clearSessionCookie();
      setUser(null);
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
      
      toast({
        title: "Logout process completed",
        description: "You have been logged out, but there was an issue with the server.",
        variant: "destructive",
      });
      
      // Redirect to auth page regardless of error
      navigate("/auth");
    },
  });

  // Create the actual context value
  const contextValue: AuthContextType = {
    user: user ?? null,
    isLoading: loadingUser,
    error: userError ?? null,
    loginMutation,
    logoutMutation,
    registerMutation,
    refetchUser,
    loadingUser,
    isAuthenticated: !!user,
    setConnectSidCookie: setSessionCookie
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  try {
    const context = useContext(AuthContext);
    
    if (!context) {
      console.error("useAuth must be used within an AuthProvider");
      return defaultAuthContext;
    }
    
    return context;
  } catch (error) {
    console.error("Error accessing auth context:", error);
    return defaultAuthContext;
  }
}
