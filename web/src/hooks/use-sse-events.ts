import { useEffect, useRef, useCallback } from "react";

/**
 * Event types that can be received from the SSE endpoint.
 * Must match EventType enum in backend services/events.py
 */
export type SSEEventType = "title_generated";

export interface TitleGeneratedEvent {
  session_id: string;
  title: string;
}

type SSEEventData = {
  title_generated: TitleGeneratedEvent;
};

type SSEEventHandler<T extends SSEEventType> = (data: SSEEventData[T]) => void;

interface UseSSEEventsOptions {
  /** Called when a title is generated for a session */
  onTitleGenerated?: SSEEventHandler<"title_generated">;
}

/**
 * Hook to subscribe to real-time SSE events from the backend via the BFF proxy.
 *
 * Uses the native EventSource API which automatically:
 * - Maintains a persistent connection
 * - Reconnects on disconnection
 * - Handles the SSE protocol parsing
 *
 * @example
 * useSSEEvents({
 *   onTitleGenerated: ({ session_id, title }) => {
 *     setSessions(prev => prev.map(s =>
 *       s.id === session_id ? { ...s, title } : s
 *     ));
 *   }
 * });
 */
export function useSSEEvents({ onTitleGenerated }: UseSSEEventsOptions) {
  // Use refs to avoid re-creating EventSource on callback changes
  const onTitleGeneratedRef = useRef(onTitleGenerated);
  onTitleGeneratedRef.current = onTitleGenerated;

  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    // Handle title_generated events
    eventSource.addEventListener("title_generated", (event) => {
      try {
        const data = JSON.parse(event.data) as TitleGeneratedEvent;
        onTitleGeneratedRef.current?.(data);
      } catch (error) {
        console.error("Failed to parse title_generated event:", error);
      }
    });

    // Log connection status for debugging
    eventSource.onopen = () => {
      console.debug("[SSE] Connected to event stream");
    };

    eventSource.onerror = (error) => {
      console.debug("[SSE] Connection error, will retry:", error);
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, []);
}
