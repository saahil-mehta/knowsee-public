"use client";

import { Message, MessageContent } from "./message";
import { Shimmer } from "./shimmer";

export function TypingIndicator() {
  return (
    <Message from="assistant">
      <MessageContent>
        <Shimmer className="text-sm">Thinking...</Shimmer>
      </MessageContent>
    </Message>
  );
}
