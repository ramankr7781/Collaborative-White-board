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

    socket.on("join-board",(boardId) => {
        socket.join(`board:${boardId}`);
        console.log(`${socket.id} joined board:${boardId}`);
    });

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


    socket.on("disconnect",() => {
        console.log("User Disconnected:",socket.id);
    });
});


const PORT =process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});