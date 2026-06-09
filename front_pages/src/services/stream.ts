export type StreamMessageHandler = {
  onMessage: (text: string) => void;
  onDone?: () => void;
  onError?: (error: Event) => void;
};

export function createSSEConnection(url: string, handlers: StreamMessageHandler) {
  const eventSource = new EventSource(url, { withCredentials: true });

  eventSource.onmessage = (event) => {
    if (event.data === "[DONE]") {
      handlers.onDone?.();
      eventSource.close();
      return;
    }
    handlers.onMessage(event.data);
  };

  eventSource.onerror = (error) => {
    handlers.onError?.(error);
    eventSource.close();
  };

  return eventSource;
}
