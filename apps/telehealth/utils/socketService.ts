const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  // ✅ More tolerant keep-alive settings.
  //
  // Defaults are pingInterval: 25000, pingTimeout: 20000 — meaning the
  // server pings every 25s and considers the client dead if it doesn't
  // respond within 20s of that ping. On Render's free tier, network
  // jitter / brief connectivity hiccups (especially over mobile networks
  // or when a tab is backgrounded and briefly throttled by the browser)
  // can easily exceed 20s, causing socket.io to declare the connection
  // dead and disconnect it — even though the underlying network recovers
  // a moment later. socket.io-client's own reconnectionAttempts: Infinity
  // then immediately reconnects, which is exactly the rapid
  // connect/disconnect churn visible in the server logs (sockets cycling
  // every 5-20 seconds), forcing a full WebRTC renegotiation each time —
  // which is what was causing the intermittent media drops.
  //
  // Raising both values gives real network blips more room to recover
  // before the server gives up on the connection.
  pingInterval: 25000,
  pingTimeout: 60000,
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

  // a peer can explicitly ask for any candidates buffered from the OTHER role.
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
  socket.on("disconnect", (reason) => {
    room.members.delete(socket.id);
    console.log(`[${roomName}] ${userName} disconnected (socket ${socket.id}) — reason: ${reason}`);

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
