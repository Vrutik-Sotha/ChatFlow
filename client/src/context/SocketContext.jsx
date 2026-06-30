import { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import axiosInstance from "../lib/axios";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const notifiedMessagesRef = useRef(new Set());
  const { authUser } = useAuthStore();
  const {
    addMessage,
    updateRoomLastMessage,
    updateMessageStatus,
    setOnlineUsers,
  } = useChatStore();

  useEffect(() => {
    if (!authUser) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL, {
  withCredentials: true,
  autoConnect: true,
  transports: ["websocket", "polling"],
});
    socketRef.current = socket;

    socket.emit("user:online", authUser._id);

    socket.on("users:online", (users) => setOnlineUsers(users));

    socket.on("message:receive", (message) => {
      const currentRoom = useChatStore.getState().activeRoom;

      if (message.sender?._id !== authUser._id) {
        if (currentRoom?._id === message.roomId) addMessage(message);
        updateRoomLastMessage(message.roomId, message);
        socket.emit("message:delivered", {
          messageId: message._id,
          roomId: message.roomId,
          userId: authUser._id,
        });

        const viewingRoom = currentRoom?._id === message.roomId;
        if (document.hidden && !viewingRoom) {
          showMessageNotification(message, socket);
        }
      }
    });

    socket.on("message:delivered", ({ messageId, ...updates }) => {
      updateMessageStatus(messageId, updates);
    });

    socket.on("message:seen", ({ updates }) => {
      updates.forEach(({ messageId, ...messageUpdates }) => {
        updateMessageStatus(messageId, messageUpdates);
      });
    });

    socket.on("message:edited", (message) => {
      updateMessageStatus(message._id, message);
      updateRoomLastMessage(message.roomId, message);
    });

    socket.on("message:deleted", ({ messageId, mode, message, userId }) => {
      if (mode === "me" && userId === authUser._id) {
        useChatStore.getState().removeMessage(messageId);
        return;
      }

      if (message) {
        updateMessageStatus(messageId, message);
        updateRoomLastMessage(message.roomId, message);
      }
    });

    return () => socket.disconnect();
  }, [authUser]);

  const showMessageNotification = async (message, socket) => {
    if (!("Notification" in window)) return;
    if (notifiedMessagesRef.current.has(message._id)) return;

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") return;

    notifiedMessagesRef.current.add(message._id);

    const senderName = message.sender?.username || "New message";
    const preview = message.content || (message.image?.imageUrl ? "Image" : "New message");
    const notification = new Notification(senderName, {
      body: preview,
      icon: message.sender?.avatar || "/favicon.svg",
      tag: message._id,
    });

    notification.onclick = async () => {
      window.focus();
      notification.close();

      const store = useChatStore.getState();
      let room = store.rooms.find((item) => item._id === message.roomId);
      if (!room) {
        const res = await axiosInstance.get(`/rooms/${message.roomId}`);
        room = res.data;
      }

      store.setActiveRoom(room);
      socket.emit("room:join", room._id);
    };
  };

  return (
    <SocketContext.Provider value={socketRef}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
