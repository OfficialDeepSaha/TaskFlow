import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  // Use the useAuth hook directly to get authentication status
  const { user, isLoading } = useAuth();
  const [showLoader, setShowLoader] = useState(true);
  
  // Set a timeout to prevent indefinite loading
  useEffect(() => {
    // Only show loading indicator for 2 seconds max
    const timeoutId = setTimeout(() => {
      setShowLoader(false);
    }, 2000);
    
    // Clean up timeout
    return () => clearTimeout(timeoutId);
  }, []);
  
  // Create a wrapper to properly handle rendering
  const RouteWrapper = () => {
    // Only display loading indicator if we're still within timeout and auth is loading
    if (isLoading && showLoader) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <span>Loading your dashboard...</span>
          </div>
        </div>
      );
    }

    // Redirect to auth if not authenticated
    if (!user) {
      return <Redirect to="/auth" />;
    }

    // User is authenticated or timeout exceeded, render the component
    return <Component />;
  };

  // Always return a Route component with the path
  return <Route path={path} component={RouteWrapper} />;
}
