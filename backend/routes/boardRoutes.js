const express = require("express");

const {createBoard,getBoardById,updateBoard,deleteBoard,getBoards,inviteMember,
    requestAccess,getPendingRequests,approveRequest,rejectRequest,getBoardMembers,removeMember} = require("../controllers/boardController");
const authMiddleware =require("../middleware/authMiddleware");
const router = express.Router();

router.post("/",authMiddleware, createBoard);
router.post("/:id/invite", authMiddleware, inviteMember);
router.get("/", authMiddleware, getBoards);
router.get("/:id", authMiddleware, getBoardById);
router.put("/:id", authMiddleware, updateBoard);
router.delete("/:id", authMiddleware, deleteBoard);
router.post("/:id/request-access",authMiddleware,requestAccess);
router.get("/:id/requests",authMiddleware,getPendingRequests);
router.post("/requests/:requestId/approve",authMiddleware,approveRequest);
router.post("/requests/:requestId/reject",authMiddleware,rejectRequest);
router.get("/:id/members", authMiddleware, getBoardMembers);
router.delete("/:id/members/:memberId", authMiddleware, removeMember);

module.exports = router;