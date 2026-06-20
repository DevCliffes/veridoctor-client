import { io, Socket } from "socket.io-client";

class SocketService {
  socket: Socket | null;
  listeners: { [key: string]: (...args: any[]) => void };
  // Listeners registered before connect() is called are queued here
  // and attached to the socket automatically once connect() runs.
  pendingListeners: { event: string; callback: (...args: any[]) => void }[];
  isConnected: boolean;

  constructor() {
    this.socket = null;
    this.listeners = {};
    this.pendingListeners = [];
    this.isConnected = false;
  }

  /**
   * Initialize WebSocket connection.
   * Any listeners registered via on() before this call are attached now.
   */
  connect(
    url: string,
    auth: { userName: string | null; roomName: string | null },
  ) {
    if (this.socket) this.disconnect();
    if (auth.userName === null || auth.roomName === null) {
      throw new Error("Username or room name is null");
    }

    this.socket = io(url, {
      transports: ["websocket"],
      autoConnect: false,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      auth: auth,
    });

    // Attach any listeners that were registered before connect() was called
    this.pendingListeners.forEach(({ event, callback }) => {
      this.socket!.on(event, callback);
      this.listeners[event] = callback;
    });
    this.pendingListeners = [];

    this.socket.connect();

    this.socket.on("connect", () => {
      this.isConnected = true;
    });
    this.socket.on("disconnect", () => {
      this.isConnected = false;
      console.error("DISCONNECTED FROM SIGNALING SERVER");
    });
  }

  /**
   * Disconnect WebSocket and clean up.
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Emit an event to the server.
   */
  emit(event: string, data: any) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }
    this.socket.emit(event, data);
  }

  /**
   * Register a custom event listener.
   * Safe to call before connect() — the listener will be queued and
   * attached automatically when connect() is called.
   */
  on(event: string, callback: (...args: any[]) => void) {
    if (!this.socket) {
      // Queue for when connect() is called
      this.pendingListeners.push({ event, callback });
      return;
    }
    this.socket.on(event, callback);
    this.listeners[event] = callback;
  }

  /**
   * Remove a specific event listener.
   */
  off(event: string) {
    // Also remove from pending queue if not yet connected
    this.pendingListeners = this.pendingListeners.filter(
      (p) => p.event !== event
    );
    if (!this.socket) return;
    this.socket.off(event, this.listeners[event]);
    delete this.listeners[event];
  }

  /**
   * Remove all listeners and cleanup.
   */
  removeAllListeners() {
    this.pendingListeners = [];
    if (!this.socket) return;
    Object.keys(this.listeners).forEach((event) => {
      this.socket?.off(event, this.listeners[event]);
    });
    this.listeners = {};
  }
}

export default new SocketService();
