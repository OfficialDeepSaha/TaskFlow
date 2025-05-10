import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider } from "./hooks/use-auth";
import App from "./App";
import "./index.css";

// Register service worker for PWA support
import * as serviceWorkerRegistration from "./lib/serviceWorkerRegistration";

// Error boundary function to catch React rendering errors
function handleRenderError(error: Error) {
  console.error('React rendering error:', error);
  
  // Display a simple error UI
  const errorContainer = document.createElement('div');
  errorContainer.style.display = 'flex';
  errorContainer.style.flexDirection = 'column';
  errorContainer.style.alignItems = 'center';
  errorContainer.style.justifyContent = 'center';
  errorContainer.style.height = '100vh';
  errorContainer.style.padding = '20px';
  errorContainer.style.textAlign = 'center';
  
  const errorTitle = document.createElement('h2');
  errorTitle.textContent = 'Application Error';
  errorTitle.style.color = '#e11d48';
  errorTitle.style.marginBottom = '16px';
  
  const errorMessage = document.createElement('p');
  errorMessage.textContent = 'There was a problem loading the application. Please refresh the page.';
  errorMessage.style.marginBottom = '16px';
  
  const refreshButton = document.createElement('button');
  refreshButton.textContent = 'Refresh Page';
  refreshButton.style.backgroundColor = '#3b82f6';
  refreshButton.style.color = 'white';
  refreshButton.style.padding = '8px 16px';
  refreshButton.style.borderRadius = '4px';
  refreshButton.style.border = 'none';
  refreshButton.style.cursor = 'pointer';
  refreshButton.onclick = () => window.location.reload();
  
  errorContainer.appendChild(errorTitle);
  errorContainer.appendChild(errorMessage);
  errorContainer.appendChild(refreshButton);
  
  // Clear container and add error UI
  const container = document.getElementById('root');
  if (container) {
    container.innerHTML = '';
    container.appendChild(errorContainer);
  }
}

// Mount the React app with error handling
try {
  const container = document.getElementById("root");
  if (!container) {
    throw new Error("Root container missing in index.html");
  }
  
  const root = createRoot(container);
  
  // Reset any existing error state
  container.innerHTML = '';
  
  // Mount with all providers in the correct order
  root.render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="taskflow-theme">
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
  
  // Register service worker for PWA support
  serviceWorkerRegistration.register().then(() => {
    // Initialize offline sync functionality
    serviceWorkerRegistration.initializeOfflineSync();
  
    // Listen for service worker messages (e.g., sync completed)
    serviceWorkerRegistration.listenForServiceWorkerMessages((data) => {
      if (data.type === 'sync-complete') {
        console.log(`Sync completed for ${data.count} tasks`);
        // You could show a notification here if needed
      }
    });
  
    // Set up a check for updates every hour
    setInterval(() => {
      serviceWorkerRegistration.checkForUpdates();
    }, 60 * 60 * 1000);
  }).catch(error => {
    console.error('Service worker registration failed:', error);
  });
  
  // Listen for online/offline status changes
  window.addEventListener('online', () => {
    console.log('Application is online');
    document.body.classList.remove('offline-mode');
  });
  
  window.addEventListener('offline', () => {
    console.log('Application is offline');
    document.body.classList.add('offline-mode');
  });
  
  // Set initial offline status
  if (!navigator.onLine) {
    document.body.classList.add('offline-mode');
  }
  
  if (import.meta.hot) {
    import.meta.hot.accept();
    import.meta.hot.dispose(() => {
      root.unmount();
    });
  }
} catch (error) {
  console.error('Error initializing application:', error);
  handleRenderError(error as Error);
}
