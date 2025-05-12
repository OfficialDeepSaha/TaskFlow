import { useEffect, useState } from 'react';
import { useOffline } from '../hooks/use-offline';

/**
 * OfflineBanner component shows a banner when the app is offline
 * and provides functionality to manually trigger sync when online
 */
export function OfflineBanner() {
  const { isOnline, isSyncing, pendingActions, syncPendingOperations } = useOffline();
  const [showBanner, setShowBanner] = useState(!isOnline);

  // Update banner visibility when online status changes
  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
    } else if (pendingActions === 0) {
      // If we're online and have no pending actions, hide the banner after a delay
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      // If we're online but have pending actions, keep the banner visible
      setShowBanner(true);
    }
  }, [isOnline, pendingActions]);

  if (!showBanner) {
    return null;
  }

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 p-3 z-50 flex items-center justify-between ${
        isOnline ? 'bg-blue-500' : 'bg-orange-500'
      } text-white transition-all shadow-lg`}
    >
      <div className="flex items-center">
        <span className="mr-2 text-xl">
          {isOnline ? '🔄' : '📶'}
        </span>
        <div>
          {!isOnline ? (
            <span>You're offline, but you can still use the app. Changes will sync when you reconnect.</span>
          ) : pendingActions > 0 ? (
            <span>
              {isSyncing
                ? `Syncing ${pendingActions} changes...`
                : `You have ${pendingActions} changes to sync`}
            </span>
          ) : (
            <span>Back online! All changes synced.</span>
          )}
        </div>
      </div>
      
      {isOnline && pendingActions > 0 && !isSyncing && (
        <button
          onClick={syncPendingOperations}
          className="px-3 py-1 bg-white text-blue-500 rounded-md text-sm font-medium"
        >
          Sync Now
        </button>
      )}
      
      {isOnline && pendingActions === 0 && (
        <button
          onClick={() => setShowBanner(false)}
          className="px-3 py-1 bg-white text-blue-500 rounded-md text-sm font-medium"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
