const Board = require("../models/Board");
const redisClient =require("../config/redis");


const createBoard = async (req, res) => {
  try {
    const board = await Board.create({
      title: req.body.title,
      owner: req.user.userId,
      elements: [],
    });

    await redisClient.del(
  `boards:${req.user.userId}`
);

console.log(
  "Boards Cache Invalidated"
);

    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getBoardById = async (req, res) => {
    try {

        const cacheKey =
            `board:${req.params.id}`;

        const cachedBoard =
            await redisClient.get(cacheKey);

        if (cachedBoard) {
            console.log("Cache Hit");

            return res.status(200).json(
                JSON.parse(cachedBoard)
            );
        }

        console.log("Cache Miss");

        const board = await Board.findById(
            req.params.id
        );

        if (!board) {
            return res.status(404).json({
                message: "Board not found"
            });
        }

        await redisClient.set(
            cacheKey,
            JSON.stringify(board),
            {
                EX: 3600,
            }
        );

        res.status(200).json(board);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const updateBoard = async (req, res) => {
    try {
        const board = await Board.findById(
            req.params.id
        );

        if (!board) {
            return res.status(404).json({
                message: "Board not found",
            });
        }

        board.title =
            req.body.title || board.title;

        board.elements =
            req.body.elements || board.elements;

        const updatedBoard =
            await board.save();

        await redisClient.del(`board:${req.params.id}`);

        console.log("Cache Invalidated");

        await redisClient.del(
  `boards:${req.user.userId}`
);

console.log(
  "Boards Cache Invalidated"
);


        res.status(200).json(updatedBoard);

    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const deleteBoard = async (req, res) => {
    try {
        const board = await Board.findById(
            req.params.id
        );

        if (!board) {
            return res.status(404).json({
                message: "Board not found",
            });
        }

        await board.deleteOne();

        await redisClient.del(`board:${req.params.id}`);

        console.log("Cache Invalidated");

        await redisClient.del(
  `boards:${req.user.userId}`
);

console.log(
  "Boards Cache Invalidated"
);

        res.status(200).json({
            message: "Board deleted successfully",
        });

    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const getBoards = async (req, res) => {
  try {

    const cacheKey =`boards:${req.user.userId}`;

    const cachedBoards =await redisClient.get(cacheKey);

    if (cachedBoards) {

      console.log(
        "Boards Cache Hit"
      );

      return res.json(
        JSON.parse(cachedBoards)
      );
    }

    console.log(
      "Boards Cache Miss"
    );

    const boards = await Board.find({
      owner: req.user.userId,
    })
    .select("_id title updatedAt")
    .sort({ updatedAt: -1 });

    await redisClient.set(
        cacheKey,
        JSON.stringify(boards),
        {
            EX: 3600,
        }
    );

    console.log("Boards Cached");
    
    res.json(boards);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


module.exports = {
  createBoard,
  getBoardById,
  updateBoard,
  deleteBoard,
  getBoards,
};