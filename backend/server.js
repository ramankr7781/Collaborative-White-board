const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const boardRoutes = require("./routes/boardRoutes");
const authRoutes = require("./routes/authRoutes");
const authLimiter = require("./middleware/rateLimiter");
const helmet = require("helmet");

const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Board = require("./models/Board");

require("./config/redis");

const app = express();
const server = http.createServer(app);

connectDB();

/* =========================
   CORS CONFIG
========================= */
const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL, // your main deployed frontend from Render env
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  // exact allowed origins
  if (allowedOrigins.includes(origin)) return true;

  // allow all Vercel deployments for this project
  if (
    origin.endsWith(".vercel.app") &&
    origin.includes("collaborative-white-board")
  ) {
    return true;
  }

  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json());

app.use("/api/boards", boardRoutes);
app.use("/api/auth", authLimiter, authRoutes);

app.get("/", (req, res) => {
  res.send("Whiteboard Backend Running");
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

/* =========================
   SOCKET.IO
========================= */
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by Socket.IO CORS"));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("join-board", async ({ boardId, token }) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const board = await Board.findById(boardId);

      if (!board) {
        console.log("Board not found");
        return;
      }

      const isOwner = board.owner.toString() === decoded.userId;
      const isMember = board.members.some(
        (memberId) => memberId.toString() === decoded.userId
      );

      if (!isOwner && !isMember) {
        console.log("Unauthorized board access");
        socket.boardId = null;
        socket.emit("board-access-denied");
        return;
      }

      // leave previous board room if switching
      if (socket.boardId && socket.boardId !== boardId) {
        const oldRoom = `board:${socket.boardId}`;

        socket.leave(oldRoom);

        io.to(oldRoom).emit("cursor-remove", socket.id);

        const oldRoomSet = io.sockets.adapter.rooms.get(oldRoom);
        const oldCount = oldRoomSet ? oldRoomSet.size : 0;
        io.to(oldRoom).emit("users-count", oldCount);
      }

      // join new board room
      socket.boardId = boardId;
      socket.join(`board:${boardId}`);

      socket.emit("board-state", {
        elements: board.elements || [],
        title: board.title || "",
      });

      const room = io.sockets.adapter.rooms.get(`board:${boardId}`);
      const count = room ? room.size : 0;
      io.to(`board:${boardId}`).emit("users-count", count);

      console.log(`${socket.id} joined board:${boardId}`);
    } catch (error) {
      console.log("Join board failed:", error.message);
    }
  });

  socket.on("drawing", ({ element }) => {
    if (!socket.boardId) {
      console.log("Blocked drawing from unauthorized user");
      return;
    }

    socket.to(`board:${socket.boardId}`).emit("drawing", element);
  });

  socket.on("clear-board", () => {
    if (!socket.boardId) return;
    socket.to(`board:${socket.boardId}`).emit("clear-board");
  });

  socket.on("move-element", ({ elements }) => {
    if (!socket.boardId) return;
    socket.to(`board:${socket.boardId}`).emit("move-element", elements);
  });

  socket.on("resize-element", ({ elements }) => {
    if (!socket.boardId) return;
    socket.to(`board:${socket.boardId}`).emit("resize-element", elements);
  });

  socket.on("update-elements", ({ elements }) => {
    if (!socket.boardId) return;
    socket.to(`board:${socket.boardId}`).emit("update-elements", elements);
  });

  socket.on("delete-element", ({ elements }) => {
    if (!socket.boardId) return;
    socket.to(`board:${socket.boardId}`).emit("delete-element", elements);
  });

  socket.on("cursor-move", ({ x, y, name }) => {
    if (!socket.boardId) return;

    socket.to(`board:${socket.boardId}`).emit("cursor-move", {
      socketId: socket.id,
      x,
      y,
      name,
    });
  });

  socket.on("disconnect", () => {
    if (socket.boardId) {
      io.to(`board:${socket.boardId}`).emit("cursor-remove", socket.id);

      const room = io.sockets.adapter.rooms.get(`board:${socket.boardId}`);
      const count = room ? room.size : 0;
      io.to(`board:${socket.boardId}`).emit("users-count", count);
    }

    console.log("User Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});