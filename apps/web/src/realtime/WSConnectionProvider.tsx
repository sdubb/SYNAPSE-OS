import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/state/auth';
import { SynapseRealtimeEvent } from '@/types';

export type WSConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';
export type RealtimeEventListener = (event: SynapseRealtimeEvent) => void;

export interface WSContextValue {
  connected: boolean;
  status: WSConnectionStatus;
  subscribe: (channelOrEventType: string, listener?: RealtimeEventListener) => () => void;
  unsubscribe: (channelOrEventType: string, listener?: RealtimeEventListener) => void;
  send: (action: string, payload?: unknown) => void;
  lastEvent: SynapseRealtimeEvent | null;
  reconnect: () => void;
}

const WSContext = createContext<WSContextValue | null>(null);

export function WSConnectionProvider({ children }: { children: React.ReactNode }) {
  const { token, tenantId } = useAuth();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<WSConnectionStatus>('DISCONNECTED');
  const [lastEvent, setLastEvent] = useState<SynapseRealtimeEvent | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const activeSubscriptions = useRef<Set<string>>(new Set());
  const eventListenersRef = useRef<Map<string, Set<RealtimeEventListener>>>(new Map());
  const reconnectTimeoutRef = useRef<number | null>(null);
  const backoffDelayRef = useRef<number>(1000);
  const heartbeatIntervalRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch {}
      socketRef.current = null;
    }

    setStatus('CONNECTING');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const wsUrl = `${protocol}//${host}:3001?token=${encodeURIComponent(token || '')}&tenantId=${encodeURIComponent(tenantId || 'default_tenant')}`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('CONNECTED');
        backoffDelayRef.current = 1000;

        // Auto subscribe to tenant channel
        const defaultTenantChannel = `tenant:${tenantId || 'default_tenant'}`;
        ws.send(JSON.stringify({ action: 'SUBSCRIBE', channel: defaultTenantChannel }));

        // Resubscribe to previous channels if reconnected
        activeSubscriptions.current.forEach((ch) => {
          ws.send(JSON.stringify({ action: 'SUBSCRIBE', channel: ch }));
        });

        // Start ping heartbeat
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'PING' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const synapseEvent: SynapseRealtimeEvent = parsed.type === 'EVENT' && parsed.data ? parsed.data : parsed;

          if (synapseEvent && synapseEvent.eventType) {
            setLastEvent(synapseEvent);

            // Dispatch to registered event listeners
            const specificListeners = eventListenersRef.current.get(synapseEvent.eventType);
            const wildcardListeners = eventListenersRef.current.get('*');
            specificListeners?.forEach((fn) => fn(synapseEvent));
            wildcardListeners?.forEach((fn) => fn(synapseEvent));

            // Dynamically invalidate & update React Query cache based on event category
            const eventType = synapseEvent.eventType || '';

            if (eventType.startsWith('session.') || eventType.startsWith('run.')) {
              queryClient.invalidateQueries({ queryKey: ['sessions'] });
              if (synapseEvent.sessionId) {
                queryClient.invalidateQueries({ queryKey: ['sessions', synapseEvent.sessionId] });
              }
            } else if (eventType.startsWith('agent.')) {
              queryClient.invalidateQueries({ queryKey: ['agents'] });
            } else if (eventType.startsWith('task.')) {
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
            } else if (eventType.startsWith('approval.')) {
              queryClient.invalidateQueries({ queryKey: ['approvals'] });
            } else if (eventType.startsWith('verification.')) {
              queryClient.invalidateQueries({ queryKey: ['verifications'] });
            } else if (eventType.startsWith('policy.')) {
              queryClient.invalidateQueries({ queryKey: ['policies'] });
            } else if (eventType.startsWith('audit.')) {
              queryClient.invalidateQueries({ queryKey: ['audit'] });
            } else if (eventType.startsWith('world.')) {
              queryClient.invalidateQueries({ queryKey: ['world-entities'] });
            }
          }
        } catch (err) {
          console.error('Failed to parse realtime WebSocket message:', err);
        }
      };

      ws.onerror = () => {
        setStatus('ERROR');
      };

      ws.onclose = () => {
        setStatus('DISCONNECTED');
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Schedule exponential backoff reconnect
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        const delay = backoffDelayRef.current;
        backoffDelayRef.current = Math.min(delay * 1.5, 10000);

        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, delay);
      };
    } catch {
      setStatus('ERROR');
    }
  }, [token, tenantId, queryClient]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const subscribe = useCallback((channelOrEventType: string, listener?: RealtimeEventListener) => {
    if (listener) {
      if (!eventListenersRef.current.has(channelOrEventType)) {
        eventListenersRef.current.set(channelOrEventType, new Set());
      }
      eventListenersRef.current.get(channelOrEventType)!.add(listener);
    }

    activeSubscriptions.current.add(channelOrEventType);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'SUBSCRIBE', channel: channelOrEventType }));
    }

    return () => {
      if (listener) {
        eventListenersRef.current.get(channelOrEventType)?.delete(listener);
      }
    };
  }, []);

  const unsubscribe = useCallback((channelOrEventType: string, listener?: RealtimeEventListener) => {
    if (listener) {
      eventListenersRef.current.get(channelOrEventType)?.delete(listener);
    }
    activeSubscriptions.current.delete(channelOrEventType);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'UNSUBSCRIBE', channel: channelOrEventType }));
    }
  }, []);

  const send = useCallback((action: string, payload?: unknown) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action, payload }));
    }
  }, []);

  return (
    <WSContext.Provider
      value={{
        connected: status === 'CONNECTED',
        status,
        subscribe,
        unsubscribe,
        send,
        lastEvent,
        reconnect: connect,
      }}
    >
      {children}
    </WSContext.Provider>
  );
}

export function useRealtime(): WSContextValue {
  const context = useContext(WSContext);
  if (!context) {
    throw new Error('useRealtime must be used within a WSConnectionProvider');
  }
  return context;
}

export function useWebSocket(): WSContextValue {
  const context = useContext(WSContext);
  if (!context) {
    return {
      connected: false,
      status: 'DISCONNECTED',
      subscribe: () => () => {},
      unsubscribe: () => {},
      send: () => {},
      lastEvent: null,
      reconnect: () => {},
    };
  }
  return context;
}
