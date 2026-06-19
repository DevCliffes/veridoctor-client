const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// rooms[roomId] = { offererSocketId, offer, answer }
const rooms = {};

io.on("connection", (socket) => {
  const { userName, roomName } = socket.handshake.auth;

  if (!roomName) {
    socket.disconnect();
    return;
  }

  // Join the room
  socket.join(roomName);
  console.log(`[${roomName}] ${userName} connected`);

  // ── Offerer sends their offer ──────────────────────────────────────────────
  socket.on("newOffer", (offer) => {
    if (!rooms[roomName]) rooms[roomName] = {};
    rooms[roomName].offer = offer;
    rooms[roomName].offererSocketId = socket.id;
    console.log(`[${roomName}] offer stored`);

    // Tell anyone already in the room (the answerer) that an offer is available
    socket.to(roomName).emit("availableOffer", offer);
  });

  // ── Answerer sends their answer ────────────────────────────────────────────
  socket.on("newAnswer", (answer) => {
    if (!rooms[roomName]) rooms[roomName] = {};
    rooms[roomName].answer = answer;
    console.log(`[${roomName}] answer stored`);

    // Send answer back to the offerer
    if (rooms[roomName].offererSocketId) {
      io.to(rooms[roomName].offererSocketId).emit("remoteAnswer", answer);
    }
  });

  // ── ICE candidates (relay between peers) ──────────────────────────────────
  socket.on("icecandidate", ({ candidate, roomId, isOfferer }) => {
    // Send to everyone else in the room
    socket.to(roomId || roomName).emit("receiveIceCandidate", candidate);
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`[${roomName}] ${userName} disconnected`);
    // Notify other peer that this person left
    socket.to(roomName).emit("peerLeft", { userName });
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
