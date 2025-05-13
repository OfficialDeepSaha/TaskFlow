import { useEffect, useState } from 'react';
import { useOffline } from '../hooks/use-offline';

/**
 * OfflineBanner component shows a banner when the app is offline
 * and provides functionality to manually trigger sync when online
 */
export function OfflineBanner() {
  const { isOnline, isSyncing, pendingActions, hasNetworkError, syncPendingOperations, checkNetworkConnection } = useOffline();
  const [showBanner, setShowBanner] = useState(!isOnline || hasNetworkError);
  const [fadeOutBanner, setFadeOutBanner] = useState(false);

  // Update banner visibility when online status or network error status changes
  useEffect(() => {
    if (!isOnline || hasNetworkError) {
      setShowBanner(true);
      setFadeOutBanner(false);
    } else if (pendingActions === 0) {
      // If we're online with no network errors and have no pending actions, hide the banner after a delay
      setFadeOutBanner(true);
      const timer = setTimeout(() => {
        setShowBanner(false);
        setFadeOutBanner(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      // If we're online but have pending actions, keep the banner visible
      setShowBanner(true);
      setFadeOutBanner(false);
    }
  }, [isOnline, hasNetworkError, pendingActions]);

  if (!showBanner) {
    return null;
  }

  // Determine banner color based on status
  const getBannerColor = () => {
    if (hasNetworkError) return 'bg-red-500'; // Error - red
    if (!isOnline) return 'bg-orange-500'; // Offline - orange
    if (isSyncing) return 'bg-blue-500'; // Syncing - blue
    if (pendingActions > 0) return 'bg-indigo-500'; // Pending actions - indigo
    return 'bg-green-500'; // Online, all synced - green
  };

  // Get appropriate icon
  const getStatusIcon = () => {
    if (hasNetworkError) return '⚠️'; // Warning icon
    if (!isOnline) return '📶'; // Antenna/offline icon
    if (isSyncing) return '🔄'; // Sync icon
    if (pendingActions > 0) return '📋'; // Clipboard icon
    return '✅'; // Checkmark icon
  };

  // Determine message based on status
  const getMessage = () => {
    if (hasNetworkError) {
      return 'Network error detected. The app will continue working offline.';
    }
    if (!isOnline) {
      return 'You\'re offline, but you can still use the app. Changes will sync when you reconnect.';
    }
    if (isSyncing) {
      return `Syncing ${pendingActions} changes...`;
    }
    if (pendingActions > 0) {
      return `You have ${pendingActions} changes to sync`;
    }
    return 'Back online! All changes synced.';
  };

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 p-3 z-50 flex items-center justify-between
        ${getBannerColor()} text-white shadow-lg transition-all duration-300
        ${fadeOutBanner ? 'opacity-0 translate-y-full' : 'opacity-100 translate-y-0'}`}
    >
      <div className="flex items-center">
        <span className="mr-2 text-xl">
          {getStatusIcon()}
        </span>
        <div>
          <span>{getMessage()}</span>
        </div>
      </div>
      
      <div className="flex gap-2">
        {hasNetworkError && (
          <button
            onClick={() => checkNetworkConnection()}
            className="px-3 py-1 bg-white text-red-500 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Check Connection
          </button>
        )}
        
        {isOnline && pendingActions > 0 && !isSyncing && (
          <button
            onClick={syncPendingOperations}
            className="px-3 py-1 bg-white text-indigo-500 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Sync Now
          </button>
        )}
        
        {(isOnline && pendingActions === 0 && !hasNetworkError) && (
          <button
            onClick={() => {
              setFadeOutBanner(true);
              setTimeout(() => setShowBanner(false), 300);
            }}
            className="px-3 py-1 bg-white text-green-500 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
