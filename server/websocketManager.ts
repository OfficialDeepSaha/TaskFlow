import { WebSocketServer, WebSocket } from 'ws';
import { storage } from './storage';

/**
 * WebSocket heartbeat function to keep connections alive
 */
function heartbeat(this: WebSocket) {
  (this as any).isAlive = true;
}

/**
 * Configure and manage WebSocket connections
 */
export function setupWebSocketServer(wss: WebSocketServer, app: any) {
  // Store active connections by user ID
  const clients = new Map<number, Set<WebSocket>>();
  
  // Set up ping interval
  const pingInterval = setInterval(() => {
    let liveConnections = 0;
    
    wss.clients.forEach((ws) => {
      if ((ws as any).isAlive === false) {
        return ws.terminate();
      }
      
      (ws as any).isAlive = false;
      ws.ping();
      liveConnections++;
    });
    
    if (liveConnections > 0) {
      console.log(`[WEBSOCKET] Sent heartbeat to ${liveConnections} connections`);
    }
  }, 30000);
  
  // Clean up interval on server close
  wss.on('close', () => {
    clearInterval(pingInterval);
  });
  
  // Handle new connections
  wss.on('connection', async (ws: WebSocket, req: any) => {
    console.log('--------------------------------');
    console.log('[WEBSOCKET] New connection from:', req.headers.origin);
    console.log('[WEBSOCKET] Connection URL:', req.url);
    
    // Track connection lifetime
    const connectedAt = Date.now();
    let userId: number | null = null;
    
    // Initialize heartbeat
    (ws as any).isAlive = true;
    ws.on('pong', heartbeat);
    
    // Handle errors
    ws.on('error', (error: any) => {
      console.error('[WEBSOCKET] Connection error:', error);
    });
    
    // Handle disconnection
    ws.on('close', (code, reason) => {
      const duration = Date.now() - connectedAt;
      console.log(`[WEBSOCKET] User ${userId} disconnected after ${duration}ms. Code: ${code}, Reason: ${reason || ''}`);
      
      // Remove from clients map
      if (userId && clients.has(userId)) {
        clients.get(userId)!.delete(ws);
        if (clients.get(userId)!.size === 0) {
          clients.delete(userId);
        }
      }
    });
    
    try {
      // Add this WebSocket to a set of pending connections
      console.log('[WEBSOCKET] Connection pending authentication');
      
      // Try to authenticate from URL parameters
      if (req.url) {
        try {
          const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          const token = parsedUrl.searchParams.get('token');
          const sessionId = parsedUrl.searchParams.get('sessionId');
          
          // Start with not authenticated
          let authenticated = false;
          
          // Try session-based authentication first
          if (sessionId) {
            try {
              console.log('[WEBSOCKET] Attempting to authenticate with session ID');
              
              // Verify session exists and contains userId
              const session = await new Promise<any>((resolve, reject) => {
                storage.sessionStore.get(sessionId, (err: Error | null, session: any) => {
                  if (err) reject(err);
                  else resolve(session);
                });
              });
              
              if (session && session.userId) {
                // Session found with userId
                const validUserId = session.userId as number;
                userId = validUserId;
                const user = await storage.getUser(validUserId);
                
                if (user) {
                  console.log(`[WEBSOCKET] User ${validUserId} (${user.name}) authenticated via session ID`);
                  authenticated = true;
                  
                  // Save userId on the socket for later reference
                  (ws as any).userId = validUserId;
                  
                  // Add connection to clients map
                  if (!clients.has(validUserId)) {
                    clients.set(validUserId, new Set());
                  }
                  clients.get(validUserId)!.add(ws);
                  
                  // Send success message
                  ws.send(JSON.stringify({
                    type: 'auth_success',
                    userId: validUserId,
                    timestamp: Date.now(),
                    authMethod: 'session'
                  }));
                  
                  // Refresh session
                  storage.sessionStore.touch(sessionId, session, (err: Error | null) => {
                    if (err) console.error('[WEBSOCKET] Error refreshing session:', err);
                    else console.log('[WEBSOCKET] Session refreshed successfully');
                  });
                }
              }
            } catch (sessionError) {
              console.error('[WEBSOCKET] Session authentication error:', sessionError);
            }
          }
          
          // If session auth failed, try token-based auth
          if (!authenticated && token && !isNaN(parseInt(token))) {
            try {
              const validTokenId = parseInt(token);
              console.log('[WEBSOCKET] Token authentication from URL:', validTokenId);
              
              // Verify user exists
              const user = await storage.getUser(validTokenId);
              if (user) {
                userId = validTokenId;
                console.log(`[WEBSOCKET] User ${validTokenId} (${user.name}) authenticated via token`);
                
                // Save userId on the socket for later reference
                (ws as any).userId = validTokenId;
                
                // Add connection to clients map
                if (!clients.has(validTokenId)) {
                  clients.set(validTokenId, new Set());
                }
                clients.get(validTokenId)!.add(ws);
                
                // Send success message
                ws.send(JSON.stringify({
                  type: 'auth_success',
                  userId: validTokenId,
                  timestamp: Date.now(),
                  authMethod: 'token'
                }));
              } else {
                console.error('[WEBSOCKET] User not found for token:', validTokenId);
              }
            } catch (tokenError) {
              console.error('[WEBSOCKET] Token authentication error:', tokenError);
            }
          }
        } catch (urlError) {
          console.error('[WEBSOCKET] Error parsing URL:', urlError);
        }
      }
      
      // Handle messages
      ws.on('message', async (message: Buffer) => {
        try {
          const messageString = message.toString();
          
          // Handle simple ping messages directly
          if (messageString === 'ping') {
            console.log('[WEBSOCKET] Ping received, sending pong');
            try {
              ws.send('pong');
              return;
            } catch (pingError) {
              console.error('[WEBSOCKET] Error sending pong:', pingError);
              return;
            }
          }
          
          // Parse JSON messages
          try {
            const data = JSON.parse(messageString);
            console.log('[WEBSOCKET] Message received:', data.type || 'unknown type');
            
            // Handle auth messages
            if (data.type === 'auth' && !userId) {
              try {
                if (data.userId && !isNaN(parseInt(data.userId.toString()))) {
                  const authenticatingUserId = parseInt(data.userId.toString());
                  console.log('[WEBSOCKET] Authenticating user:', authenticatingUserId);
                  
                  // Verify user exists
                  const user = await storage.getUser(authenticatingUserId);
                  if (user) {
                    userId = authenticatingUserId;
                    console.log(`[WEBSOCKET] User ${userId} (${user.name}) authenticated via message`);
                    
                    // Save userId on the socket for later reference
                    (ws as any).userId = userId;
                    
                    // Add connection to clients map
                    if (!clients.has(userId)) {
                      clients.set(userId, new Set());
                    }
                    clients.get(userId)!.add(ws);
                    
                    // Send authentication success message
                    ws.send(JSON.stringify({
                      type: 'auth_success',
                      userId: userId,
                      timestamp: Date.now()
                    }));
                  } else {
                    console.error('[WEBSOCKET] User not found:', authenticatingUserId);
                    ws.send(JSON.stringify({
                      type: 'auth_error',
                      message: 'User not found',
                      timestamp: Date.now()
                    }));
                  }
                } else {
                  console.error('[WEBSOCKET] Invalid userId in auth message:', data.userId);
                  ws.send(JSON.stringify({
                    type: 'auth_error',
                    message: 'Invalid user ID',
                    timestamp: Date.now()
                  }));
                }
              } catch (authError) {
                console.error('[WEBSOCKET] Authentication error:', authError);
              }
            }
            // Handle JSON ping messages
            else if (data.type === 'ping') {
              try {
                ws.send(JSON.stringify({
                  type: 'pong',
                  timestamp: data.timestamp || Date.now(),
                  serverTime: Date.now()
                }));
              } catch (pongError) {
                console.error('[WEBSOCKET] Error sending pong response:', pongError);
              }
            }
          } catch (jsonError) {
            console.error('[WEBSOCKET] Error parsing JSON message:', jsonError);
          }
        } catch (messageError) {
          console.error('[WEBSOCKET] Error handling message:', messageError);
        }
      });
      
    } catch (connectionError) {
      console.error('[WEBSOCKET] Connection error:', connectionError);
      try {
        ws.close(1011, 'Server error');
      } catch (closeError) {
        console.error('[WEBSOCKET] Error closing connection:', closeError);
      }
    }
  });
  
  // Store the notification functions on app.locals for use in other parts of the app
  app.locals.notifications = {
    // Send notification to a specific user
    sendNotification: (userId: number, notification: any) => {
      console.log(`[NOTIFICATION] Sending to user ${userId}:`, notification);
      
      if (!clients.has(userId)) {
        console.log(`[NOTIFICATION] User ${userId} not connected, notification not sent`);
        return false;
      }
      
      try {
        const userClients = clients.get(userId);
        let sentToAtLeastOne = false;
        
        userClients!.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'notification',
              data: notification,
              timestamp: Date.now()
            }));
            sentToAtLeastOne = true;
          }
        });
        
        return sentToAtLeastOne;
      } catch (error) {
        console.error('[NOTIFICATION] Error sending notification:', error);
        return false;
      }
    }
  };
  
  return { clients, wss };
}
