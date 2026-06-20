const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// rooms[roomId] = { offererSocketId, offer, answer, members: Map<socketId, userName> }
const rooms = {};

function getRoom(roomName) {
  if (!rooms[roomName]) {
    rooms[roomName] = {
      offer: null,
      answer: null,
      offererSocketId: null,
      members: new Map(),
    };
  }
  return rooms[roomName];
}

io.on("connection", (socket) => {
  const { userName, roomName } = socket.handshake.auth;

  if (!roomName) {
    socket.disconnect();
    return;
  }

  socket.join(roomName);
  const room = getRoom(roomName);
  room.members.set(socket.id, userName);

  console.log(`[${roomName}] ${userName} connected (socket ${socket.id})`);

  // ✅ FIX 1 — replay the stored offer to anyone who joins after it
  // was created. Without this, a patient joining even a fraction of a
  // second after the doctor's offer was emitted would never receive it,
  // since socket.to(room).emit() only reaches sockets already in the
  // room at the exact moment it fires.
  if (room.offer && socket.id !== room.offererSocketId) {
    socket.emit("availableOffer", room.offer);
    console.log(`[${roomName}] replayed stored offer to ${userName}`);
  }

  // ── Offerer sends their offer ──────────────────────────────────────────────
  socket.on("newOffer", (offer) => {
    room.offer = offer;
    room.offererSocketId = socket.id;
    console.log(`[${roomName}] offer stored`);
    // Tell anyone already in the room (the answerer) that an offer is available
    socket.to(roomName).emit("availableOffer", offer);
  });

  // ── Answerer sends their answer ────────────────────────────────────────────
  socket.on("newAnswer", (answer) => {
    room.answer = answer;
    console.log(`[${roomName}] answer stored`);
    // Send answer back to the offerer
    if (room.offererSocketId) {
      io.to(room.offererSocketId).emit("remoteAnswer", answer);
    }
  });

  // ── ICE candidates (relay between peers) ──────────────────────────────────
  socket.on("icecandidate", ({ candidate, roomId, isOfferer }) => {
    // Send to everyone else in the room
    socket.to(roomId || roomName).emit("receiveIceCandidate", candidate);
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    room.members.delete(socket.id);
    console.log(`[${roomName}] ${userName} disconnected (socket ${socket.id})`);

    // ✅ FIX 2 — only announce peerLeft if this userName has no other
    // active socket still in the room. Without this guard, a transient
    // reconnect (e.g. React StrictMode double-mount, or a brief network
    // blip) would broadcast a false "peer left" to the room, including
    // to the SAME person's new, still-connected socket — confusing the
    // client into thinking the other participant disconnected when
    // nothing actually happened.
    const stillPresent = [...room.members.values()].includes(userName);
    if (!stillPresent) {
      socket.to(roomName).emit("peerLeft", { userName });
    }

    // Clear offerer reference if the offerer's socket was the one that left
    if (room.offererSocketId === socket.id && !stillPresent) {
      room.offererSocketId = null;
      room.offer = null;
    }

    // Clean up empty rooms to avoid unbounded memory growth
    if (room.members.size === 0) {
      delete rooms[roomName];
    }
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
