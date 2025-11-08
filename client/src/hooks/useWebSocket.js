import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebSocket = (url, options = {}) => {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onError,
    onOpen,
    onClose
  } = options;

  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  // Clean up existing connection
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Start heartbeat to detect dead connections
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      // Clean up existing connection
      cleanup();

      console.log(`[WebSocket] Connecting to ${url}`);
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = (event) => {
        console.log('[WebSocket] Connection opened');
        setIsConnected(true);
        setError(null);
        setReconnectAttempts(0);
        setLastUpdate(new Date());

        // Start heartbeat
        startHeartbeat();

        if (onOpen) {
          onOpen(event);
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Handle heartbeat response
          if (message.type === 'pong') {
            console.log('[WebSocket] Heartbeat received');
            return;
          }

          setLastUpdate(new Date());
          setData(message);

          if (onMessage) {
            onMessage(message, event);
          }
        } catch (parseError) {
          console.error('[WebSocket] Failed to parse message:', parseError);
          setError(new Error('Failed to parse server message'));
        }
      };

      wsRef.current.onerror = (event) => {
        console.error('[WebSocket] Error occurred:', event);
        setError(new Error('WebSocket connection error'));
        setIsConnected(false);

        if (onError) {
          onError(event);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(`[WebSocket] Connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        setIsConnected(false);

        // Clean up heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        if (onClose) {
          onClose(event);
        }

        // Attempt reconnection if not a normal closure and we haven't exceeded attempts
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          const nextAttempt = reconnectAttempts + 1;
          setReconnectAttempts(nextAttempt);

          console.log(`[WebSocket] Attempting reconnection ${nextAttempt}/${maxReconnectAttempts} in ${reconnectInterval}ms`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          console.error('[WebSocket] Max reconnection attempts reached');
          setError(new Error('Failed to reconnect after maximum attempts'));
        }
      };

    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      setError(error);
      setIsConnected(false);
    }
  }, [
    url,
    reconnectInterval,
    maxReconnectAttempts,
    reconnectAttempts,
    onOpen,
    onMessage,
    onError,
    onClose,
    cleanup,
    startHeartbeat
  ]);

  // Initialize connection
  useEffect(() => {
    connect();

    return () => {
      cleanup();
    };
  }, [connect, cleanup]);

  // Send message function
  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        const messageString = typeof message === 'string' ? message : JSON.stringify(message);
        wsRef.current.send(messageString);
        return true;
      } catch (error) {
        console.error('[WebSocket] Failed to send message:', error);
        setError(error);
        return false;
      }
    } else {
      console.warn('[WebSocket] Cannot send message - WebSocket is not connected');
      return false;
    }
  }, []);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    console.log('[WebSocket] Manual reconnection requested');
    setReconnectAttempts(0);
    connect();
  }, [connect]);

  // Connection status object
  const connectionStatus = {
    isConnected,
    error,
    lastUpdate,
    reconnectAttempts,
    canReconnect: reconnectAttempts < maxReconnectAttempts
  };

  return {
    data,
    isConnected,
    error,
    lastUpdate,
    sendMessage,
    reconnect,
    connectionStatus
  };
};