import Room from "../models/Room.model.js";
import User from "../models/User.model.js";

// @POST /api/rooms/dm
// Create or get existing DM room between two users
export const getOrCreateDM = async (req, res) => {
  const { receiverId } = req.body;
  const senderId = req.user._id;

  try {
    // Check if DM room already exists
    let room = await Room.findOne({
      isGroup: false,
      members: { $all: [senderId, receiverId] },
    }).populate("members", "-password");

    if (room) return res.status(200).json(room);

    // Create new DM room
    room = await Room.create({
      isGroup: false,
      members: [senderId, receiverId],
    });

    room = await room.populate("members", "-password");
    res.status(201).json(room);
  } catch (error) {
    console.error("getOrCreateDM error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @POST /api/rooms/group
// Create a group room
export const createGroupRoom = async (req, res) => {
  const { name, memberIds } = req.body;
  const adminId = req.user._id;

  try {
    if (!name || !memberIds || memberIds.length < 2)
      return res.status(400).json({ message: "Group name and at least 2 members required" });

    const allMembers = [...new Set([...memberIds, adminId.toString()])];

    const room = await Room.create({
      name,
      isGroup: true,
      members: allMembers,
      admin: adminId,
    });

    const populated = await room.populate("members", "-password");
    res.status(201).json(populated);
  } catch (error) {
    console.error("createGroupRoom error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/rooms
// Get all rooms for logged in user
export const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.user._id })
      .populate("members", "-password")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    res.status(200).json(rooms);
  } catch (error) {
    console.error("getMyRooms error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/rooms/:roomId
// Get single room by ID
export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate("members", "-password")
      .populate("lastMessage");

    if (!room) return res.status(404).json({ message: "Room not found" });

    const isMember = room.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );
    if (!isMember) return res.status(403).json({ message: "Access denied" });

    res.status(200).json(room);
  } catch (error) {
    console.error("getRoomById error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/rooms/users/search?query=
// Search users to start a DM
export const searchUsers = async (req, res) => {
  const query = String(req.query.query || "").trim();
  try {
    if (!query) return res.status(200).json([]);

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { username: { $regex: escapedQuery, $options: "i" } },
            { email: { $regex: escapedQuery, $options: "i" } },
          ],
        },
      ],
    })
      .select("-password")
      .limit(20);

    res.status(200).json(users);
  } catch (error) {
    console.error("searchUsers error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
