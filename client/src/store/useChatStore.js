import { create } from "zustand";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";

export const useChatStore = create((set, get) => ({
  rooms: [],
  activeRoom: null,
  messages: [],
  isLoadingRooms: false,
  isLoadingMessages: false,
  onlineUsers: [],

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  fetchRooms: async () => {
    set({ isLoadingRooms: true });
    try {
      const res = await axiosInstance.get("/rooms");
      set({ rooms: res.data });
    } catch {
      toast.error("Failed to load chats");
    } finally {
      set({ isLoadingRooms: false });
    }
  },

  setActiveRoom: (room) => {
    set({ activeRoom: room, messages: [] });
  },

  fetchMessages: async (roomId) => {
    set({ isLoadingMessages: true });
    try {
      const res = await axiosInstance.get(`/messages/${roomId}`);
      set({ messages: res.data });
    } catch {
      toast.error("Failed to load messages");
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  replaceMessage: (tempId, message) => {
    set((state) => ({
      messages: state.messages.map((m) => (m._id === tempId ? message : m)),
    }));
  },

  removeMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.filter((m) => m._id !== messageId),
    }));
  },

  updateMessageStatus: (messageId, updates) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, ...updates } : m
      ),
      rooms: state.rooms.map((r) =>
        r.lastMessage?._id === messageId
          ? { ...r, lastMessage: { ...r.lastMessage, ...updates } }
          : r
      ),
    }));
  },

  updateRoomLastMessage: (roomId, message) => {
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r._id === roomId ? { ...r, lastMessage: message } : r
      ),
    }));
  },
}));
