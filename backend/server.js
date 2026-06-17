const express = require("express");
const cors = require("cors");

require("dotenv").config();
const connectDB = require("./config/db");
const boardRoutes =require("./routes/boardRoutes");
const authRoutes =require("./routes/authRoutes");
const authLimiter =require("./middleware/rateLimiter");
const app = express();
const helmet = require("helmet");

const http =require("http");
const { Server } =require("socket.io");
const server =http.createServer(app);
const jwt =require("jsonwebtoken");
const Board =require("./models/Board");

require("./config/redis");

connectDB();



app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));
app.use(helmet());
app.use(express.json());
app.use("/api/boards",boardRoutes);

app.get("/", (req, res) => {
    res.send("Whiteboard Backend Running");
});

app.use("/api/auth",authLimiter, authRoutes);



const io =new Server(server, {
    cors: {
      origin:
        "http://localhost:5173",
      methods: [
        "GET",
        "POST",
      ],
    },
  });




io.on("connection", (socket) => {
    console.log(
        "User Connected:",
        socket.id
    );

    socket.on("join-board",async ({boardId,token,}) => {

        try {
          const decoded =jwt.verify(
              token,
              process.env.JWT_SECRET
            );

          const board =await Board.findById(boardId);

          if (!board) {
            console.log("Board not found");
            return;
          }

          const isOwner =board.owner.toString() ===decoded.userId;

          const isMember =board.members.some((memberId) =>
                memberId.toString() ===
                decoded.userId
            );

          if (!isOwner &&!isMember) {
            console.log("Unauthorized board access");
            return;
          }
          socket.boardId = boardId;
          socket.join(`board:${boardId}`);
          const room =io.sockets.adapter.rooms.get(`board:${boardId}`);
          const count =room? room.size: 0;

          io.to(`board:${boardId}`).emit("users-count",count);

          console.log(`${socket.id} joined board:${boardId}`);

        } catch (error) {
          console.log("Join board failed:",error.message);
        }
      }
    );

    socket.on("drawing",({ boardId, element }) => {
        console.log("Drawing received:",boardId,element);
        socket.to(`board:${boardId}`).emit("drawing",element);
    });


    socket.on("clear-board",(boardId) => {
      socket.to(`board:${boardId}`).emit("clear-board");
    });


    socket.on("move-element",({ boardId, elements }) => {
      socket.to(`board:${boardId}`).emit("move-element",elements);
    });


    socket.on("resize-element",({ boardId, elements }) => {
        socket.to(`board:${boardId}`).emit("resize-element",elements);
    });

    socket.on("update-elements",({ boardId, elements }) => {
        socket.to(`board:${boardId}`).emit("update-elements",elements);
    });

    socket.on("delete-element",({ boardId, elements }) => {
      socket.to(`board:${boardId}`).emit("delete-element",elements);
    });

    socket.on("cursor-move",({ boardId, x, y }) => {

        socket.to(`board:${boardId}`).emit("cursor-move",
          {
            socketId: socket.id,
            x,
            y,
          }
        );

      }
    );


    socket.on("disconnect",() => {

      if (socket.boardId) {
        const room =io.sockets.adapter.rooms.get(`board:${socket.boardId}`);
        const count =room ? room.size : 0;
        io.to(`board:${socket.boardId}`).emit("users-count",count);
      }

        console.log("User Disconnected:",socket.id);
    });
});


const PORT =process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});