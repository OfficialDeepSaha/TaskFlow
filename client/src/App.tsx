import { Switch, Route, useLocation, useRoute } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useContext, useState, useMemo, ErrorInfo, Component, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "./pages/dashboard-page";
import TasksPage from "./pages/tasks-page";
import AssignedTasksPage from "./pages/assigned-tasks-page";
import CreatedTasksPage from "./pages/created-tasks-page";
import OverdueTasksPage from "./pages/overdue-tasks-page";
import AdminAnalyticsPage from "./pages/admin-analytics-page";
import TeamMembersPage from "./pages/team-members-page";
import { QuickTaskButton } from "./components/quick-task-button";
import { OfflineBanner } from "./components/offline-banner";
import { AuthContext } from "./hooks/use-auth";
import { Sidebar } from "./components/sidebar";
import { Navbar } from "./components/navbar";

// Error boundary to catch rendering errors
class ErrorBoundary extends Component<{children: ReactNode, fallback?: ReactNode}> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Application error caught by boundary:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center p-6 bg-red-50 border border-red-200 rounded-lg max-w-md">
            <p className="text-red-600 text-xl font-medium mb-2">Application Error</p>
            <p className="text-gray-700 mb-4 text-center">
              Something went wrong rendering the application.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Dashboard layout with sidebar
function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [location] = useLocation();
  
  // Extract page title from location
  const getTitle = () => {
    const path = location;
    const segments = path.split('/');
    // Check if it's an admin route
    if (segments.length > 1 && segments[1] === 'admin') {
      if (segments.length > 2) {
        // For routes like /admin/analytics
        return `${segments[2].charAt(0).toUpperCase() + segments[2].slice(1)}`;
      }
      return 'Admin Dashboard';
    }
    // Other routes
    switch (path) {
      case '/':
      case '/dashboard':
        return 'Dashboard';
      case '/tasks':
        return 'My Tasks';
      case '/assigned':
        return 'Tasks Assigned to Me';
      case '/created':
        return 'Tasks Created by Me';
      case '/overdue':
        return 'Overdue Tasks';
      case '/profile':
        return 'User Profile';
      case '/preferences':
        return 'User Preferences';
      default:
        return 'TaskFlow';
    }
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar 
          title={getTitle()} 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background/50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        {/* Offline status banner */}
        <OfflineBanner />
      </div>
    </div>
  );
}

// Main App component
function App() {
  // App initialization
  const [initStartTime] = useState(() => Date.now());
  const getElapsedTime = () => Date.now() - initStartTime;
  
  // Check if AuthContext exists
  const authContextDirect = useContext(AuthContext);
  
  // Get location and route info early to check for auth page
  const [isAuthPage] = useRoute("/auth");
  
  // Special case: If we're on the auth page, show it immediately
  if (isAuthPage) {
    return (
      <TooltipProvider>
        <Toaster />
        <AuthPage />
      </TooltipProvider>
    );
  }
  
  // Use a short minimal loading time
  const initialLoadElapsed = getElapsedTime() > 300;
  
  // Show a loading screen only for a very short time - max 1 second
  if (!initialLoadElapsed || !authContextDirect) {
    // Only show loading for max 1 second
    if (getElapsedTime() > 1000) {
      // Timeout reached, show content anyway
      return (
        <TooltipProvider>
          <Toaster />
          <div className="flex items-center justify-center h-screen bg-background">
            <div className="flex flex-col items-center p-6 rounded-lg animate-in fade-in duration-500">
              <div className="text-lg mb-4 text-primary font-medium animate-pulse">Ready to continue</div>
              <Button 
                onClick={() => window.location.reload()}
                variant="default"
                className="shadow-sm hover:shadow-md transition-all duration-200"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </TooltipProvider>
      );
    }
    
    // Normal short loading screen
    return (
      <TooltipProvider>
        <Toaster />
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="flex flex-col items-center p-6 animate-in fade-in zoom-in-50 duration-700">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4"></div>
              <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              </div>
            </div>
            <p className="text-lg text-primary/80 font-medium mt-2 animate-pulse">Loading your workspace...</p>
          </div>
        </div>
      </TooltipProvider>
    );
  }
  
  // Authentication context is available
  const authContext = authContextDirect;
  const { user, isLoading } = authContext;
  
  // If not authenticated, redirect to auth page
  if (!user && !isLoading) {
    return (
      <TooltipProvider>
        <Toaster />
        <AuthPage />
      </TooltipProvider>
    );
  }
  
  // If authenticated, render the appropriate page
  // Only show quick task button when user is admin
  const showQuickTaskButton = !!user && user.role && user.role.toString() === "admin";
  const isAdmin = user?.role && user.role.toString() === "admin";
  
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        
        <Switch>
          <Route path="/auth" component={AuthPage} />
          
          {/* Use DashboardLayout for all app routes */}
          <Route path="/:path*">
            {(params) => {
              // For nested routes, use the current location instead of params
              const [currentPath] = useLocation();
              
              return (
                <DashboardLayout>
                  <Switch>
                    <Route path="/" component={HomePage} />
                    <Route path="/dashboard" component={DashboardPage} />
                    <Route path="/analytics" component={AdminAnalyticsPage} />
                    <Route path="/team-members" component={TeamMembersPage} />

                    
                    {/* Task Routes */}
                    <Route path="/tasks">
                      {(params) => <TasksPage {...params} inDashboard={true} />}
                    </Route>
                    <Route path="/assigned">
                      {(params) => <AssignedTasksPage {...params} inDashboard={true} />}
                    </Route>
                    <Route path="/created">
                      {(params) => <CreatedTasksPage {...params} inDashboard={true} />}
                    </Route>
                    <Route path="/overdue">
                      {(params) => <OverdueTasksPage {...params} inDashboard={true} />}
                    </Route>
                    
              
                    
                    {/* Settings Routes */}
                    <Route path="/profile" component={DashboardPage} />
                    <Route path="/preferences" component={DashboardPage} />
                    
                    <Route component={NotFound} />
                  </Switch>
                </DashboardLayout>
              );
            }}
          </Route>
        </Switch>
        
        {showQuickTaskButton && <QuickTaskButton />}
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
