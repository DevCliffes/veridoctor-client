import { io, Socket } from "socket.io-client";

class SocketService {
  socket: Socket | null;
  listeners: { [key: string]: (...args: any[]) => void };
  isConnected: boolean;

  constructor() {
    this.socket = null;
    this.listeners = {};
    this.isConnected = false;
  }

  /**
   * Initialize WebSocket connection.
   * @param {string} url - WebSocket server URL.
   * @param {object} auth - Authentication data (e.g., userId, meetId).
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

    this.socket.connect();

    // default listeners
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
   * @param {string} event - Event name.
   * @param {any} data - Data to send.
   */
  emit(event: string, data: any) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }
    this.socket.emit(event, data);
  }

  /**
   * Register a custom event listener.
   * @param {string} event - Event name (e.g., 'message', 'error').
   * @param {function} callback - Callback function.
   */
  on(event: string, callback: (...args: any[]) => void) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }
    this.socket.on(event, callback);
    this.listeners[event] = callback;
  }

  /**
   * Remove a specific event listener.
   * @param {string} event - Event name.
   */
  off(event: string) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }
    this.socket.off(event, this.listeners[event]);
    delete this.listeners[event];
  }

  /**
   * Remove all listeners and cleanup.
   */
  removeAllListeners() {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }
    Object.keys(this.listeners).forEach((event) => {
      this.socket?.off(event, this.listeners[event]);
    });
    this.listeners = {};
  }
}

export default new SocketService();
