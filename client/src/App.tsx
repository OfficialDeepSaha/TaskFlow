import { Switch, Route } from "wouter";
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

function App() {
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
    </TooltipProvider>
  );
}

export default App;
