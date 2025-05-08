import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "./lib/protected-route";
import DashboardPage from "./pages/dashboard-page";
import TasksPage from "./pages/tasks-page";
import AssignedTasksPage from "./pages/assigned-tasks-page";
import CreatedTasksPage from "./pages/created-tasks-page";
import OverdueTasksPage from "./pages/overdue-tasks-page";
import { QuickTaskButton } from "./components/quick-task-button";
import { useAuth } from "./hooks/use-auth";

function App() {
  const [location] = useLocation();
  
  // Wrap the content in a try-catch to prevent errors from propagating
  try {
    const { user } = useAuth();
    
    // Only show the quick task button when the user is logged in and not on the auth page
    const showQuickTaskButton = user && location !== "/auth";
    
    return (
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/auth" component={AuthPage} />
          <ProtectedRoute path="/" component={HomePage} />
          <ProtectedRoute path="/dashboard" component={DashboardPage} />
          <ProtectedRoute path="/tasks" component={TasksPage} />
          <ProtectedRoute path="/assigned" component={AssignedTasksPage} />
          <ProtectedRoute path="/created" component={CreatedTasksPage} />
          <ProtectedRoute path="/overdue" component={OverdueTasksPage} />
          <Route component={NotFound} />
        </Switch>
        
        {showQuickTaskButton && <QuickTaskButton />}
      </TooltipProvider>
    );
  } catch (error) {
    // Fallback UI that doesn't use any hooks that might cause errors
    return (
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/auth" component={AuthPage} />
          <Route path="/*" component={() => {
            // Redirect to auth page after a brief delay
            setTimeout(() => window.location.href = '/auth', 100);
            return <div className="flex items-center justify-center h-screen">Loading...</div>;
          }} />
        </Switch>
      </TooltipProvider>
    );
  }
}

export default App;
