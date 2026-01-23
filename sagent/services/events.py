"""SSE event bus for real-time updates to connected clients.

Provides a simple in-process pub/sub mechanism for broadcasting events
to all connected SSE clients. Each client gets their own asyncio.Queue
and receives events as they're published.

Includes automatic heartbeat mechanism to keep connections alive through
proxies (Next.js BFF, nginx, load balancers) that may timeout idle connections.

Usage:
    # Publishing (from anywhere in the app):
    from services import event_bus, EventType
    await event_bus.publish(EventType.TITLE_GENERATED, {
        "session_id": "abc123",
        "title": "Python Debugging Help"
    })

    # Subscribing (in SSE endpoint):
    async for event in event_bus.subscribe():
        yield event.to_sse()
"""

import asyncio
import json
import time
from collections.abc import AsyncGenerator
from dataclasses import dataclass
from enum import Enum
from typing import Any
from weakref import WeakSet

# Heartbeat interval in seconds. Set below common proxy timeouts:
# - undici (Node.js fetch): 300s body timeout
# - nginx: 60s proxy_read_timeout (default)
# - AWS ALB: 60s idle timeout
HEARTBEAT_INTERVAL_SECONDS = 30


class EventType(str, Enum):
    """Types of events that can be broadcast via SSE."""

    TITLE_GENERATED = "title_generated"
    HEARTBEAT = "heartbeat"  # Internal keepalive, clients can ignore

    # Future event types can be added here:
    # SESSION_DELETED = "session_deleted"
    # AGENT_STATUS = "agent_status"


@dataclass
class Event:
    """A single event to be broadcast to clients."""

    type: EventType
    data: dict[str, Any]

    def to_sse(self) -> str:
        """Format as SSE message.

        Heartbeats use SSE comment format (: prefix) which clients ignore
        but keeps the connection alive through proxies.
        """
        if self.type == EventType.HEARTBEAT:
            # SSE comment format - ignored by EventSource but keeps connection alive
            return f": heartbeat {self.data.get('timestamp', '')}\n\n"
        return f"event: {self.type.value}\ndata: {json.dumps(self.data)}\n\n"


class EventBus:
    """In-process event bus for SSE broadcasting.

    Thread-safe pub/sub using asyncio.Queue for each subscriber.
    Subscribers are automatically cleaned up when they disconnect.

    Includes automatic heartbeat mechanism - subscribers receive periodic
    heartbeat events to keep connections alive through proxies.
    """

    def __init__(self) -> None:
        self._subscribers: WeakSet[asyncio.Queue] = WeakSet()
        self._lock = asyncio.Lock()

    async def publish(self, event_type: EventType, data: dict[str, Any]) -> None:
        """Publish an event to all connected subscribers."""
        event = Event(type=event_type, data=data)
        async with self._lock:
            # Copy to list to avoid modification during iteration
            for queue in list(self._subscribers):
                try:
                    queue.put_nowait(event)
                except asyncio.QueueFull:
                    # Skip slow consumers rather than blocking
                    pass

    async def subscribe(self) -> AsyncGenerator[Event, None]:
        """Subscribe to events with automatic heartbeats.

        Yields events as they're published, interleaved with periodic
        heartbeat events to prevent proxy timeouts.

        Usage:
            async for event in event_bus.subscribe():
                yield event.to_sse()
        """
        queue: asyncio.Queue[Event] = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._subscribers.add(queue)
        try:
            while True:
                try:
                    # Wait for event with timeout, send heartbeat if none arrives
                    event = await asyncio.wait_for(
                        queue.get(),
                        timeout=HEARTBEAT_INTERVAL_SECONDS,
                    )
                    yield event
                except TimeoutError:
                    # No event within interval - send heartbeat to keep connection alive
                    yield Event(
                        type=EventType.HEARTBEAT,
                        data={"timestamp": int(time.time())},
                    )
        finally:
            # Cleanup on disconnect
            async with self._lock:
                self._subscribers.discard(queue)

    @property
    def subscriber_count(self) -> int:
        """Number of currently connected subscribers."""
        return len(self._subscribers)


# Global singleton instance
event_bus = EventBus()
