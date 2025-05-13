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

  // Always register the service worker to ensure offline functionality works in all environments
  // This ensures PWA features work in development and production
  return registerServiceWorker();
}

// The actual registration function
async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  try {
    // Register with immediate control to ensure service worker starts controlling the page without requiring a refresh
    const registration = await navigator.serviceWorker.register('/sw.js', {
      // Update immediately without waiting for user to navigate away
      updateViaCache: 'none',
    });
    console.log('Service Worker registered with scope:', registration.scope);
    
    // Set up update handling
    setupUpdateHandling(registration);
    
    // If there's no active service worker controller yet,
    // force a page reload to ensure SW is active and in control
    if (!navigator.serviceWorker.controller) {
      // Reload once to allow service worker to take control
      window.addEventListener('load', () => {
        if (!navigator.serviceWorker.controller) {
          console.log('Force reload to activate Service Worker');
          window.location.reload();
        }
      });
    }
    
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
      console.log('Service worker state change:', installingWorker.state);
      
      if (installingWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // At this point, the updated precached content has been fetched,
          // but the previous service worker will still serve the older content
          console.log('New content is available and will be used when all tabs for this page are closed');
          
          // Show a notification to the user
          showUpdateNotification();
          
          // Optionally, force immediate activation
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        } else {
          // At this point, everything has been precached
          console.log('Content is cached for offline use');
        }
      } else if (installingWorker.state === 'activated') {
        console.log('Service worker activated successfully!');
      } else if (installingWorker.state === 'redundant') {
        console.error('Service worker became redundant!');
      }
    };
  };
  
  // Listen for the controlling service worker changing
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('New service worker controlling the page');
  });
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
      
      // Reload the page to ensure the new service worker takes control
      setTimeout(() => {
        console.log('Reloading page to apply service worker updates');
        window.location.reload();
      }, 1000);
    }
  });
}

// Function to show an update notification to the user
function showUpdateNotification(): void {
  console.log('New version available! Reload the app to use the latest features.');
  
  // Dispatch an event that components can listen for
  window.dispatchEvent(new CustomEvent('serviceWorkerUpdateAvailable'));
  
  // For a better user experience, you could show a toast notification
  try {
    // Create a simple toast notification element
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.background = '#3b82f6';
    toast.style.color = 'white';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    toast.style.zIndex = '9999';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.justifyContent = 'space-between';
    toast.style.minWidth = '280px';
    toast.style.maxWidth = '400px';
    toast.style.transition = 'all 0.3s ease';
    
    // Add notification content
    toast.innerHTML = `
      <div>
        <div style="font-weight: 600; margin-bottom: 4px;">New version available!</div>
        <div style="font-size: 14px; opacity: 0.9;">Reload to update the app with the latest features.</div>
      </div>
      <button id="sw-update-button" style="background: white; color: #3b82f6; border: none; padding: 6px 12px; border-radius: 4px; font-weight: 600; margin-left: 12px; cursor: pointer;">Update</button>
    `;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Add click handler for the update button
    document.getElementById('sw-update-button')?.addEventListener('click', () => {
      applyUpdates();
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    });
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 10000);
  } catch (error) {
    console.error('Error showing update notification:', error);
  }
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
