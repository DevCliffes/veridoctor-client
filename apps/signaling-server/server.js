const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer((req, res) => {
  // Health check endpoint — keeps Render's free tier awake and lets
  // UptimeRobot confirm the server is up via a plain HTTP GET.
  if (req.method === "GET" && (req.url === "/health" || req.url === "/")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// rooms[roomId] = {
//   offer, answer, offererSocketId,
//   members: Map<socketId, userName>,
//   candidates: { offerer: [...], answerer: [...] }  -- buffered ICE candidates
// }
const rooms = {};

function getRoom(roomName) {
  if (!rooms[roomName]) {
    rooms[roomName] = {
      offer: null,
      answer: null,
      offererSocketId: null,
      members: new Map(),
      candidates: { offerer: [], answerer: [] },
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

  // Replay the stored offer to anyone who joins after it was created.
  if (room.offer && socket.id !== room.offererSocketId) {
    socket.emit("availableOffer", room.offer);
    console.log(`[${roomName}] replayed stored offer to ${userName}`);
  }

  // ── Offerer sends their offer ──────────────────────────────────────────────
  socket.on("newOffer", (offer) => {
    room.offer = offer;
    room.offererSocketId = socket.id;
    console.log(`[${roomName}] offer stored`);
    socket.to(roomName).emit("availableOffer", offer);
  });

  // ── Answerer sends their answer ────────────────────────────────────────────
  socket.on("newAnswer", (answer) => {
    room.answer = answer;
    console.log(`[${roomName}] answer stored`);
    if (room.offererSocketId) {
      io.to(room.offererSocketId).emit("remoteAnswer", answer);
    }
  });

  // ── ICE candidates (relay between peers, with buffering) ───────────────────
  socket.on("icecandidate", ({ candidate, roomId, isOfferer }) => {
    const targetRoom = getRoom(roomId || roomName);
    const bucket = isOfferer ? "offerer" : "answerer";
    targetRoom.candidates[bucket].push(candidate);
    socket.to(roomId || roomName).emit("receiveIceCandidate", candidate);
  });

  // ── Replay buffered candidates on demand ───────────────────────────────────
  socket.on("requestIceCandidates", ({ isOfferer }) => {
    const wantedBucket = isOfferer ? "answerer" : "offerer";
    const buffered = room.candidates[wantedBucket] || [];
    buffered.forEach((candidate) => {
      socket.emit("receiveIceCandidate", candidate);
    });
    if (buffered.length > 0) {
      console.log(
        `[${roomName}] replayed ${buffered.length} buffered ${wantedBucket} candidate(s) to ${userName}`
      );
    }
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    room.members.delete(socket.id);
    console.log(`[${roomName}] ${userName} disconnected (socket ${socket.id})`);

    const stillPresent = [...room.members.values()].includes(userName);
    if (!stillPresent) {
      socket.to(roomName).emit("peerLeft", { userName });
    }

    if (room.offererSocketId === socket.id && !stillPresent) {
      room.offererSocketId = null;
      room.offer = null;
    }

    if (room.members.size === 0) {
      delete rooms[roomName];
    }
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
