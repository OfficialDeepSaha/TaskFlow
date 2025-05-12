import { WebSocket } from 'ws';

/**
 * Utility to safely handle WebSocket ping messages without affecting
 * task creation or other application functionality
 */
export function setupPingHandler(ws: WebSocket) {
  // Original message handler
  const originalOnMessage = (ws as any)._events.message;
  
  // Custom message handler that intercepts ping messages
  const pingInterceptor = (messageBuffer: Buffer) => {
    const messageString = messageBuffer.toString();
    
    // Check if it's a simple ping message
    if (messageString === 'ping') {
      console.log('[WEBSOCKET] Simple ping received, sending pong directly');
      try {
        // Safely send pong response
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('pong');
        }
      } catch (pongError) {
        console.error('[WEBSOCKET] Error sending pong:', pongError);
      }
      return; // Don't pass ping to other handlers
    }
    
    // Otherwise call the original handler
    if (typeof originalOnMessage === 'function') {
      originalOnMessage(messageBuffer);
    } else if (Array.isArray(originalOnMessage)) {
      // If multiple handlers are registered
      originalOnMessage.forEach(handler => {
        if (typeof handler === 'function') {
          handler(messageBuffer);
        }
      });
    }
  };
  
  // Replace the original message handler with our interceptor
  ws.removeAllListeners('message');
  ws.on('message', pingInterceptor);
}
