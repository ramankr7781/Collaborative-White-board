const express = require("express");

const {createBoard,getBoardById,updateBoard,deleteBoard,getBoards,inviteMember} = require("../controllers/boardController");
const authMiddleware =
    require("../middleware/authMiddleware");
const router = express.Router();

router.post("/",authMiddleware, createBoard);
router.post("/:id/invite", authMiddleware, inviteMember);
router.get("/", authMiddleware, getBoards);
router.get("/:id", authMiddleware, getBoardById);
router.put("/:id", authMiddleware, updateBoard);
router.delete("/:id", authMiddleware, deleteBoard);

console.log(
  "boardRoutes loaded"
);

module.exports = router;