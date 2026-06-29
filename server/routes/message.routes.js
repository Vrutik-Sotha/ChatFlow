import express from "express";
import {
  sendMessage, sendImage, getMessages,
  markAsSeen, editMessage, deleteMessage, markAsRead,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();
router.use(protectRoute);

router.post("/", sendMessage);
router.post("/image", upload.single("image"), sendImage);
router.get("/:roomId", getMessages);
router.patch("/:messageId/read", markAsRead);
router.patch("/:messageId/seen", markAsSeen);
router.patch("/:messageId/edit", editMessage);
router.delete("/:messageId", deleteMessage);

export default router;