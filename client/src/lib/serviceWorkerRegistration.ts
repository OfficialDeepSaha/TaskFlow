// Service Worker Registration
// This file handles the registration and lifecycle management of the service worker

// Check if service workers are supported by the browser
const isServiceWorkerSupported = 'serviceWorker' in navigator;

// Function to register the service worker
export function register(): Promise<ServiceWorkerRegistration | undefined> {
  if (!isServiceWorkerSupported) {
    console.warn('Service workers are not supported by this browser');
    return Promise.resolve(undefined);
  }

  // Register the service worker only in production or when specifically enabled
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SERVICE_WORKER === 'true') {
    return registerServiceWorker();
  }
  
  return Promise.resolve(undefined);
}

// The actual registration function
async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered with scope:', registration.scope);
    
    // Set up update handling
    setupUpdateHandling(registration);
    
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
}

// Function to handle service worker updates
function setupUpdateHandling(registration: ServiceWorkerRegistration): void {
  // When an update is found, show a notification
  registration.onupdatefound = () => {
    const installingWorker = registration.installing;
    if (!installingWorker) return;

    installingWorker.onstatechange = () => {
      if (installingWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // At this point, the updated precached content has been fetched,
          // but the previous service worker will still serve the older content
          console.log('New content is available and will be used when all tabs for this page are closed');
          
          // Show a notification to the user
          showUpdateNotification();
        } else {
          // At this point, everything has been precached
          console.log('Content is cached for offline use');
        }
      }
    };
  };
}

// Check for service worker updates
export function checkForUpdates(): void {
  if (!isServiceWorkerSupported) return;

  navigator.serviceWorker.ready.then((registration) => {
    registration.update().catch((error) => {
      console.error('Error checking for service worker updates:', error);
    });
  });
}

// Apply updates (skip waiting)
export function applyUpdates(): void {
  if (!isServiceWorkerSupported) return;

  navigator.serviceWorker.ready.then((registration) => {
    if (registration.waiting) {
      // Send a message to the waiting service worker, instructing it to activate
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });
}

// Function to show an update notification to the user
function showUpdateNotification(): void {
  // This is just a placeholder - in a real app you would show a UI notification
  // You could use a toast notification library or a custom dialog
  console.log('New version available! Reload the app to use the latest features.');
  
  // Example: dispatch an event that components can listen for
  window.dispatchEvent(new CustomEvent('serviceWorkerUpdateAvailable'));
}

// Unregister all service workers
export function unregister(): void {
  if (isServiceWorkerSupported) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('Error unregistering service worker:', error);
      });
  }
}

// Initialize offline synchronization
// Define extended ServiceWorkerRegistration interface with sync property
interface SyncManager {
  register(tag: string): Promise<void>;
}

interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  sync?: SyncManager;
}

export function initializeOfflineSync(): void {
  if (!isServiceWorkerSupported) return;

  // Register for sync events when online
  navigator.serviceWorker.ready.then((registration) => {
    const extendedRegistration = registration as ExtendedServiceWorkerRegistration;
    
    if (extendedRegistration.sync) {
      // Attempt to register for background sync
      window.addEventListener('online', () => {
        extendedRegistration.sync!.register('sync-tasks')
          .catch((error: Error) => console.error('Background sync registration failed:', error));
      });
      
      // Initial registration if already online
      if (navigator.onLine) {
        extendedRegistration.sync!.register('sync-tasks')
          .catch((error: Error) => console.error('Background sync registration failed:', error));
      }
    }
  });
}

// Listen for messages from the service worker
export function listenForServiceWorkerMessages(callback: (data: any) => void): void {
  navigator.serviceWorker.addEventListener('message', (event) => {
    callback(event.data);
  });
}
