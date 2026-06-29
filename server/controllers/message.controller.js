import Message from "../models/Message.model.js";
import Room from "../models/Room.model.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
// @POST /api/messages
export const sendMessage = async (req, res) => {
  const { roomId, content, messageType = "text" } = req.body;
  try {
    if (!roomId) return res.status(400).json({ message: "roomId is required" });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isMember = room.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) return res.status(403).json({ message: "Access denied" });

    const message = await Message.create({
      roomId,
      sender: req.user._id,
      content: content || "",
      messageType,
      status: "sent",
    });

    await Room.findByIdAndUpdate(roomId, { lastMessage: message._id });
    const populated = await message.populate("sender", "-password");
    res.status(201).json(populated);
  } catch (error) {
    console.error("sendMessage error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @POST /api/messages/image
export const sendImage = async (req, res) => {
  const { roomId } = req.body;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }

    if (!roomId) {
      return res.status(400).json({
        message: "roomId is required",
      });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    const isMember = room.members.some(
      (m) => m.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    // Upload image to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer);

    if (!uploadResult?.secure_url) {
      return res.status(500).json({
        message: "Image upload failed",
      });
    }

    const message = await Message.create({
      roomId,
      sender: req.user._id,
      content: "",
      messageType: "image",
      imageUrl: uploadResult.secure_url,
      status: "sent",
    });

    await Room.findByIdAndUpdate(roomId, {
      lastMessage: message._id,
    });

    const populated = await message.populate(
      "sender",
      "-password"
    );

    return res.status(201).json(populated);

  } catch (error) {
    console.error("sendImage error:", error);

    return res.status(500).json({
      message: "Image upload failed",
      error: error.message,
    });
  }
};

// @GET /api/messages/:roomId
export const getMessages = async (req, res) => {
  const { roomId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  try {
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isMember = room.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) return res.status(403).json({ message: "Access denied" });

    const messages = await Message.find({
      roomId,
      deletedFor: { $nin: [req.user._id] },
    })
      .populate("sender", "-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error("getMessages error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @PATCH /api/messages/:messageId/seen
export const markAsSeen = async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      {
        $addToSet: { seenBy: req.user._id },
        status: "seen",
      },
      { new: true }
    );
    if (!message) return res.status(404).json({ message: "Message not found" });
    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @PATCH /api/messages/:messageId/edit
export const editMessage = async (req, res) => {
  const { content } = req.body;
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not your message" });

    const age = (Date.now() - new Date(message.createdAt)) / 1000 / 60;
    if (age > 15)
      return res.status(400).json({ message: "Cannot edit after 15 minutes" });

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populated = await message.populate("sender", "-password");
    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @DELETE /api/messages/:messageId
export const deleteMessage = async (req, res) => {
  const { deleteFor } = req.query; // "me" or "everyone"
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (deleteFor === "everyone") {
      if (message.sender.toString() !== req.user._id.toString())
        return res.status(403).json({ message: "Not your message" });

      const age = (Date.now() - new Date(message.createdAt)) / 1000 / 60;
      if (age > 15)
        return res.status(400).json({ message: "Cannot delete for everyone after 15 minutes" });

      message.isDeleted = true;
      message.content = "";
      await message.save();
    } else {
      // Delete for me only
      await Message.findByIdAndUpdate(req.params.messageId, {
        $addToSet: { deletedFor: req.user._id },
      });
    }

    res.status(200).json({ success: true, deleteFor, messageId: req.params.messageId });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @PATCH /api/messages/:messageId/read
export const markAsRead = async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      { $addToSet: { seenBy: req.user._id } },
      { new: true }
    );
    if (!message) return res.status(404).json({ message: "Message not found" });
    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};