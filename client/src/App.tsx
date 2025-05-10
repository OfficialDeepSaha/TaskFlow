import { Switch, Route, useLocation, useRoute } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useContext, useState, useMemo, ErrorInfo, Component, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "./pages/dashboard-page";
import TasksPage from "./pages/tasks-page";
import AssignedTasksPage from "./pages/assigned-tasks-page";
import CreatedTasksPage from "./pages/created-tasks-page";
import OverdueTasksPage from "./pages/overdue-tasks-page";
import { QuickTaskButton } from "./components/quick-task-button";
import { AuthContext } from "./hooks/use-auth";

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
          <div className="flex items-center justify-center h-screen">
            <div className="flex flex-col items-center">
              <p className="text-lg mb-4">Ready to continue</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </TooltipProvider>
      );
    }
    
    // Normal short loading screen
    return (
      <TooltipProvider>
        <Toaster />
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 rounded-full border-4 border-t-blue-500 border-b-transparent animate-spin mb-4"></div>
            <p className="text-lg">Loading...</p>
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
  // Only show quick task button when user is logged in
  const showQuickTaskButton = !!user;
  
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/auth" component={AuthPage} />
          <Route path="/" component={HomePage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/tasks" component={TasksPage} />
          <Route path="/assigned" component={AssignedTasksPage} />
          <Route path="/created" component={CreatedTasksPage} />
          <Route path="/overdue" component={OverdueTasksPage} />
          <Route component={NotFound} />
        </Switch>
        
        {showQuickTaskButton && <QuickTaskButton />}
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
