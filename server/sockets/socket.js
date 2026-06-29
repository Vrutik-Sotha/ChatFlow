const onlineUsers = new Map();

export const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on("user:online", (userId) => {
      onlineUsers.set(userId, socket.id);
      io.emit("users:online", Array.from(onlineUsers.keys()));
    });

    socket.on("room:join", (roomId) => {
      socket.join(roomId);
    });

    socket.on("message:send", (message) => {
      io.to(message.roomId).emit("message:receive", message);
    });

    socket.on("message:seen", ({ messageId, roomId, userId }) => {
      io.to(roomId).emit("message:seen", { messageId, userId });
    });

    socket.on("message:edit", (message) => {
      io.to(message.roomId).emit("message:edited", message);
    });

    socket.on("message:delete", ({ messageId, roomId, deleteFor }) => {
      io.to(roomId).emit("message:deleted", { messageId, deleteFor });
    });

    socket.on("typing:start", ({ roomId, userId }) => {
      socket.to(roomId).emit("typing:start", { userId });
    });

    socket.on("typing:stop", ({ roomId, userId }) => {
      socket.to(roomId).emit("typing:stop", { userId });
    });

    socket.on("disconnect", () => {
      onlineUsers.forEach((sId, uId) => {
        if (sId === socket.id) onlineUsers.delete(uId);
      });
      io.emit("users:online", Array.from(onlineUsers.keys()));
    });
  });
};

export const getSocketId = (userId) => onlineUsers.get(userId);