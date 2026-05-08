import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";

// Create a global document
export const ydoc = new Y.Doc();

// Use an object to hold the provider reference so imports always see the latest value
const state = { provider: null };

export const getProvider = () => state.provider;

export const createProvider = (username, roomName = "monaco") => {
  // Fully destroy any existing provider first (not just disconnect!)
  // destroy() removes all event listeners from the ydoc, awareness, and socket
  // disconnect() only closes the socket but leaves listeners attached,
  // which causes duplicate sync-update emissions and data conflicts
  if (state.provider) {
    try {
      state.provider.destroy();
    } catch (e) {
      console.warn("Error destroying old provider:", e);
    }
    state.provider = null;
  }

  state.provider = new SocketIOProvider(
    "http://localhost:3000",
    roomName,
    ydoc,
    {
      autoConnect: true,
      resyncInterval: 5000, // Re-sync every 5s for robustness
    }
  );

  // Log connection events for debugging
  state.provider.on("sync", (isSynced) => {
    console.log("[Yjs] Sync status:", isSynced);
  });

  state.provider.on("status", ({ status }) => {
    console.log("[Yjs] Connection status:", status);
  });

  state.provider.on("connection-error", (error) => {
    console.error("[Yjs] Connection error:", error);
  });

  if (username) {
    state.provider.awareness.setLocalStateField("user", {
      username,
      color:
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0"),
    });
  }

  return state.provider;
};
