import express from "express";
import {
  getOrCreateDM,
  createGroupRoom,
  getMyRooms,
  getRoomById,
  searchUsers,
} from "../controllers/room.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute); // All room routes are protected

router.get("/", getMyRooms);
router.get("/users/search", searchUsers);
router.get("/:roomId", getRoomById);
router.post("/dm", getOrCreateDM);
router.post("/group", createGroupRoom);

export default router;