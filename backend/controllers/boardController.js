const Board = require("../models/Board");
const redisClient =require("../config/redis");
const User =require("../models/User");
const AccessRequest =require("../models/AccessRequest");


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


    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getBoardById = async (req, res) => {
    try {

        const cacheKey =`board:${req.params.id}`;

        const board = await Board.findById(
            req.params.id
        );

        if (!board) {
            return res.status(404).json({
                message: "Board not found"
          });
        }

        const isOwner =board.owner.toString() ===req.user.userId;

        const isMember =
            board.members.some(
                (memberId) =>
                    memberId.toString() ===
                    req.user.userId
            );

        if (!isOwner && !isMember) {
            return res.status(403).json({
                message: "Access denied",
            });
        }


      const cachedBoard =await redisClient.get(cacheKey);

      if (cachedBoard) {
          return res.status(200).json(
              JSON.parse(cachedBoard)
          );
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
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        message: "Board not found",
      });
    }

    const isOwner =
      board.owner.toString() === req.user.userId;

    const isMember = board.members.some(
      (memberId) =>
        memberId.toString() === req.user.userId
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const updatedBoard = await Board.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title ?? board.title,
        elements: req.body.elements ?? board.elements,
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    try {
      await redisClient.del(`board:${req.params.id}`);
      await redisClient.del(`boards:${board.owner.toString()}`);
    } catch (redisError) {
      console.error(
        "Redis cache delete failed in updateBoard:",
        redisError.message
      );
    }

    res.status(200).json(updatedBoard);
  } catch (error) {
    console.error("updateBoard error:", error);
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
        await redisClient.del(`boards:${req.user.userId}`);

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
      return res.json(
        JSON.parse(cachedBoards)
      );
    }

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
    res.json(boards);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const inviteMember = async (req,res) => {
  try {
    
    const { email } = req.body;
    const board =await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
          message:
            "Board not found",
        });
    }

    if (board.owner.toString()!== req.user.userId) {
      return res.status(403).json({
          message:
            "Not authorized",
        });

    }

    const user =await User.findOne({email,});

    if (!user) {
      return res.status(404).json({
          message:
            "User not found",
        });
    }


    if (board.owner.toString() ===user._id.toString()) {
        return res.status(400).json({message:"Owner cannot be invited",});
    }


    if (board.members.some((memberId) =>memberId.toString() ===user._id.toString())) {
      return res.status(400).json({
          message:
            "Already invited",
        });
    }


    board.members.push(user._id);
    await board.save();
    res.json({message:"Member invited",});

  } catch (error) {
    res.status(500).json({message:error.message,});
  }
};


const requestAccess =async (req, res) => {

    try {

        const board =
            await Board.findById(
            req.params.id
            );

        if (!board) {
            return res
            .status(404)
            .json({
                message:
                "Board not found",
            });
        }

        const alreadyMember =
        board.owner.toString() ===
            req.user.userId ||
        board.members.some(
            (m) =>
            m.toString() ===
            req.user.userId
        );

        if (alreadyMember) {
        return res
            .status(400)
            .json({
            message:
                "Already has access",
            });
        }

        const existing =
        await AccessRequest.findOne(
            {
            board:req.params.id,
            user:req.user.userId,
            }
        );

        if (existing) {

            if (existing.status === "pending") {
                return res.status(400).json({message:"Request already pending",});
            }

            if (existing.status === "rejected") {
                return res.status(403).json({message:"Your request was rejected",});
            }

            if (existing.status === "approved") {
                return res.status(400).json({message:"Already approved",});
            }
        }

        await AccessRequest.create({
        board:req.params.id,
        user:req.user.userId,
        });

        res.json({
        message:"Access request sent",
        });

    } catch (error) {
      res.status(500).json({
        message:error.message,
      });
    }
};


const getPendingRequests =async (req, res) => {

    try {

      const board =
        await Board.findById(
          req.params.id
        );

      if (!board) {
        return res
          .status(404)
          .json({
            message:
              "Board not found",
          });
      }

      if (
        board.owner.toString() !==
        req.user.userId
      ) {
        return res
          .status(403)
          .json({
            message:
              "Not authorized",
          });
      }

      const requests =
        await AccessRequest.find({
          board:
            req.params.id,
          status:
            "pending",
        }).populate(
          "user",
          "name email"
        );

      res.json(requests);

    } catch (error) {

      res.status(500).json({
        message:
          error.message,
      });

    }
};


const approveRequest = async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    const board = await Board.findById(request.board);

    if (!board) {
      return res.status(404).json({
        message: "Board not found",
      });
    }

    if (board.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    if (!board.members.some((m) => m.toString() === request.user.toString())) {
      board.members.push(request.user);
      await board.save();
    }

    request.status = "approved";
    await request.save();

    res.json({
      message: "Access approved",
    });
  } catch (error) {
    console.error("approveRequest error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};


const rejectRequest = async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    const board = await Board.findById(request.board);

    if (!board) {
      return res.status(404).json({
        message: "Board not found",
      });
    }

    if (board.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    request.status = "rejected";
    await request.save();

    res.json({
      message: "Request rejected",
    });
  } catch (error) {
    console.error("rejectRequest error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

const getBoardMembers = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate("owner", "name email")
      .populate("members", "name email");

    if (!board) {
      return res.status(404).json({
        message: "Board not found",
      });
    }

    if (board.owner._id.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    res.json({
      owner: board.owner,
      members: board.members,
    });
  } catch (error) {
    console.error("getBoardMembers error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

const removeMember = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        message: "Board not found",
      });
    }

    if (board.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    const memberId = req.params.memberId;

    if (board.owner.toString() === memberId) {
      return res.status(400).json({
        message: "Owner cannot be removed",
      });
    }

    board.members = board.members.filter(
      (m) => m.toString() !== memberId
    );

    await board.save();

    // also remove any approved/pending request record if you want cleanup
    await AccessRequest.deleteMany({
      board: board._id,
      user: memberId,
    });

    try {
      await redisClient.del(`board:${board._id}`);
      await redisClient.del(`boards:${board.owner.toString()}`);
    } catch (redisError) {
      console.error(
        "Redis cache delete failed in removeMember:",
        redisError.message
      );
    }

    res.json({
      message: "Member removed",
    });
  } catch (error) {
    console.error("removeMember error:", error);
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
  inviteMember,
  requestAccess,
  getPendingRequests,
  approveRequest,
  rejectRequest,
  getBoardMembers,
  removeMember
};