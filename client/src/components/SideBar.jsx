import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useSocket } from "../context/SocketContext";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import {
  Search, Plus, LogOut, MessageCircle,
  Users, X, Check,
} from "lucide-react";
 
const Sidebar = ({ onSelectChat }) => {
  const { authUser, logout } = useAuthStore();
  const { rooms, activeRoom, fetchRooms, setActiveRoom, onlineUsers } = useChatStore();
  const socketRef = useSocket();
 
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchRequestRef = useRef(0);
 
  useEffect(() => { 
    fetchRooms(); 
  }, []);
 
  const handleSearch = async (val) => {
    setSearch(val);
    const trimmed = val.trim();
    const shouldSearchUsers = showNewChat || showGroupModal;

    if (!shouldSearchUsers) {
      setSearchResults([]);
      return;
    }

    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    setSearching(true);
    try {
      const res = await axiosInstance.get("/rooms/users/search", {
        params: { query: trimmed },
      });
      if (requestId !== searchRequestRef.current) return;
      setSearchResults(res.data);
    } catch {
      if (requestId === searchRequestRef.current) toast.error("Search failed");
    } finally {
      if (requestId === searchRequestRef.current) setSearching(false);
    }
  };
 
  const startDM = async (user) => {
    try {
      const res = await axiosInstance.post("/rooms/dm", { receiverId: user._id });
      setActiveRoom(res.data);
      socketRef.current?.emit("room:join", res.data._id);
      setShowNewChat(false);
      setSearch("");
      setSearchResults([]);
      await fetchRooms();
      onSelectChat?.();
    } catch {
      toast.error("Failed to start chat");
    }
  };
 
  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 2)
      return toast.error("Group name and at least 2 members required");
    try {
      const res = await axiosInstance.post("/rooms/group", {
        name: groupName,
        memberIds: selectedUsers.map((u) => u._id),
      });
      setActiveRoom(res.data);
      socketRef.current?.emit("room:join", res.data._id);
      setShowGroupModal(false);
      setGroupName("");
      setSelectedUsers([]);
      await fetchRooms();
      onSelectChat?.();
    } catch {
      toast.error("Failed to create group");
    }
  };
 
  const getRoomName = (room) => {
    if (room.isGroup) return room.name;
    const other = room.members?.find((m) => m._id !== authUser._id);
    return other?.username || "Unknown";
  };
 
  const isOnline = (room) => {
    if (room.isGroup) return false;
    const other = room.members?.find((m) => m._id !== authUser._id);
    return onlineUsers.includes(other?._id);
  };
 
  const filteredRooms = rooms.filter((r) =>
    getRoomName(r).toLowerCase().includes(search.toLowerCase())
  );
 
  return (
    <div style={{
      width: 300, 
      minWidth: 300,
      height: "100vh",
      background: "#0d0d1f",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex", 
      flexDirection: "column",
    }}>
 
      {/* Header */}
      <div style={{ 
        padding: "1.2rem 1rem", 
        borderBottom: "1px solid rgba(255,255,255,0.06)" 
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          marginBottom: "1rem" 
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 10 
          }}>
            <div style={{
              width: 36, 
              height: 36,
              background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
              borderRadius: 10,
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
            }}>
              <MessageCircle size={18} color="white" />
            </div>
            <span style={{ 
              fontWeight: 600, 
              fontSize: 16, 
              color: "#fff" 
            }}>
              ChatFlow
            </span>
          </div>
 
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => { 
                setShowGroupModal(true); 
                setShowNewChat(false); 
              }}
              title="New group"
              style={{
                background: "rgba(255,255,255,0.05)", 
                border: "none",
                borderRadius: 8, 
                padding: "6px", 
                cursor: "pointer",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
              }}
            >
              <Users size={16} color="#aaa" />
            </button>
            <button
              onClick={() => { 
                setShowNewChat(!showNewChat); 
                setSearch(""); 
                setSearchResults([]); 
              }}
              title="New chat"
              style={{
                background: "rgba(255,255,255,0.05)", 
                border: "none",
                borderRadius: 8, 
                padding: "6px", 
                cursor: "pointer",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
              }}
            >
              <Plus size={16} color="#aaa" />
            </button>
            <button
              onClick={logout}
              title="Logout"
              style={{
                background: "rgba(255,255,255,0.05)", 
                border: "none",
                borderRadius: 8, 
                padding: "6px", 
                cursor: "pointer",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
              }}
            >
              <LogOut size={16} color="#aaa" />
            </button>
          </div>
        </div>
 
        {/* Search Input */}
        <div style={{
          display: "flex", 
          alignItems: "center",
          background: "#1a1a2e",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10, 
          padding: "0 12px", 
          gap: 8,
        }}>
          <Search size={15} color="#555" />
          <input
            placeholder={showNewChat ? "Search users..." : "Search chats..."}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              background: "transparent", 
              border: "none", 
              outline: "none",
              color: "#fff", 
              fontSize: 13, 
              padding: "9px 0", 
              flex: 1,
            }}
          />
          {search && (
            <button 
              onClick={() => { 
                setSearch(""); 
                setSearchResults([]); 
              }}
              style={{ 
                background: "none", 
                border: "none", 
                cursor: "pointer" 
              }}>
              <X size={14} color="#555" />
            </button>
          )}
        </div>
      </div>
 
      {/* User search results */}
      {showNewChat && searchResults.length > 0 && (
        <div style={{ 
          padding: "0.5rem", 
          borderBottom: "1px solid rgba(255,255,255,0.06)" 
        }}>
          <p style={{ 
            fontSize: 11, 
            color: "#555", 
            padding: "4px 8px", 
            textTransform: "uppercase", 
            letterSpacing: "0.05em" 
          }}>
            Users
          </p>
          {searchResults.map((user) => (
            <div 
              key={user._id}
              onClick={() => startDM(user)}
              style={{
                display: "flex", 
                alignItems: "center", 
                gap: 10,
                padding: "8px 10px", 
                borderRadius: 10, 
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "rgba(124,58,237,0.1)"}
              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{
                width: 36, 
                height: 36, 
                borderRadius: "50%",
                background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                fontSize: 14, 
                fontWeight: 600, 
                color: "#fff", 
                flexShrink: 0,
              }}>
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <p style={{ 
                  fontSize: 14, 
                  color: "#fff", 
                  fontWeight: 500 
                }}>
                  {user.username}
                </p>
                <p style={{ 
                  fontSize: 12, 
                  color: "#666" 
                }}>
                  {user.email}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
 
      {/* Room list */}
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        padding: "0.5rem" 
      }}>
        {filteredRooms.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "3rem 1rem", 
            color: "#555" 
          }}>
            <MessageCircle size={32} style={{ 
              margin: "0 auto 10px", 
              opacity: 0.3 
            }} />
            <p style={{ fontSize: 13 }}>No chats yet</p>
            <p style={{ 
              fontSize: 12, 
              marginTop: 4 
            }}>
              Click + to start a conversation
            </p>
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div
              key={room._id}
              onClick={() => {
                setActiveRoom(room);
                socketRef.current?.emit("room:join", room._id);
                onSelectChat?.();
              }}
              style={{
                display: "flex", 
                alignItems: "center", 
                gap: 10,
                padding: "10px",
                borderRadius: 12, 
                cursor: "pointer",
                background: activeRoom?._id === room._id 
                  ? "rgba(124,58,237,0.15)" 
                  : "transparent",
                border: activeRoom?._id === room._id 
                  ? "1px solid rgba(124,58,237,0.3)" 
                  : "1px solid transparent",
                marginBottom: 2, 
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => {
                if (activeRoom?._id !== room._id)
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseOut={(e) => {
                if (activeRoom?._id !== room._id)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              {/* Avatar */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{
                  width: 42, 
                  height: 42, 
                  borderRadius: "50%",
                  background: room.isGroup
                    ? "linear-gradient(135deg, #5B21B6, #7C3AED)"
                    : "linear-gradient(135deg, #7C3AED, #9333ea)",
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  fontSize: 16, 
                  fontWeight: 600, 
                  color: "#fff",
                }}>
                  {room.isGroup ? (
                    <Users size={18} color="white" />
                  ) : (
                    getRoomName(room)[0].toUpperCase()
                  )}
                </div>
                {isOnline(room) && (
                  <div style={{
                    position: "absolute", 
                    bottom: 1, 
                    right: 1,
                    width: 10, 
                    height: 10, 
                    borderRadius: "50%",
                    background: "#10b981",
                    border: "2px solid #0d0d1f",
                  }} />
                )}
              </div>
 
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center" 
                }}>
                  <p style={{ 
                    fontSize: 14, 
                    fontWeight: 500, 
                    color: "#fff", 
                    whiteSpace: "nowrap", 
                    overflow: "hidden", 
                    textOverflow: "ellipsis" 
                  }}>
                    {getRoomName(room)}
                  </p>
                  {room.lastMessage?.createdAt && (
                    <span style={{ 
                      fontSize: 11, 
                      color: "#555", 
                      flexShrink: 0, 
                      marginLeft: 6 
                    }}>
                      {new Date(room.lastMessage.createdAt).toLocaleTimeString([], { 
                        hour: "2-digit", 
                        minute: "2-digit" 
                      })}
                    </span>
                  )}
                </div>
                <p style={{ 
                  fontSize: 12, 
                  color: "#666", 
                  whiteSpace: "nowrap", 
                  overflow: "hidden", 
                  textOverflow: "ellipsis", 
                  marginTop: 2 
                }}>
                  {room.lastMessage?.content || "Start a conversation"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
 
      {/* User profile at bottom */}
      <div style={{
        padding: "1rem",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", 
        alignItems: "center", 
        gap: 10,
      }}>
        <div style={{
          width: 36, 
          height: 36, 
          borderRadius: "50%",
          background: "linear-gradient(135deg, #7C3AED, #9333ea)",
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          fontSize: 14, 
          fontWeight: 600, 
          color: "#fff", 
          flexShrink: 0,
        }}>
          {authUser?.username?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ 
            fontSize: 13, 
            fontWeight: 500, 
            color: "#fff" 
          }}>
            {authUser?.username}
          </p>
          <p style={{ 
            fontSize: 11, 
            color: "#10b981" 
          }}>
            ● Online
          </p>
        </div>
      </div>
 
      {/* Group Modal */}
      {showGroupModal && (
        <div style={{
          position: "fixed", 
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          zIndex: 50,
        }}>
          <div style={{
            background: "#12122a",
            border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: 20, 
            padding: "2rem",
            width: "90%", 
            maxWidth: 400,
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "1.5rem" 
            }}>
              <h2 style={{ 
                fontSize: 18, 
                fontWeight: 600, 
                color: "#fff" 
              }}>
                New Group
              </h2>
              <button 
                onClick={() => setShowGroupModal(false)} 
                style={{ 
                  background: "none", 
                  border: "none", 
                  cursor: "pointer" 
                }}>
                <X size={20} color="#aaa" />
              </button>
            </div>
 
            <input
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{
                width: "100%", 
                padding: "12px 14px",
                background: "#0d0d1f",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, 
                color: "#fff", 
                fontSize: 14,
                outline: "none", 
                marginBottom: "1rem",
              }}
            />
 
            <input
              placeholder="Search users to add..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                width: "100%", 
                padding: "12px 14px",
                background: "#0d0d1f",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, 
                color: "#fff", 
                fontSize: 14,
                outline: "none", 
                marginBottom: "0.5rem",
              }}
            />
 
            {/* Search results for group */}
            {searchResults.map((user) => {
              const selected = selectedUsers.find((u) => u._id === user._id);
              return (
                <div 
                  key={user._id}
                  onClick={() => setSelectedUsers(
                    selected
                      ? selectedUsers.filter((u) => u._id !== user._id)
                      : [...selectedUsers, user]
                  )}
                  style={{
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between",
                    padding: "8px 10px", 
                    borderRadius: 10, 
                    cursor: "pointer",
                    background: selected ? "rgba(124,58,237,0.1)" : "transparent",
                    marginBottom: 2,
                  }}
                >
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 10 
                  }}>
                    <div style={{
                      width: 32, 
                      height: 32, 
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      fontSize: 13, 
                      fontWeight: 600, 
                      color: "#fff",
                    }}>
                      {user.username[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: 14, color: "#fff" }}>
                      {user.username}
                    </span>
                  </div>
                  {selected && <Check size={16} color="#7C3AED" />}
                </div>
              );
            })}
 
            {selectedUsers.length > 0 && (
              <p style={{ 
                fontSize: 12, 
                color: "#7C3AED", 
                margin: "0.5rem 0" 
              }}>
                {selectedUsers.length} member{selectedUsers.length > 1 ? "s" : ""} selected
              </p>
            )}
 
            <button
              onClick={createGroup}
              style={{
                width: "100%", 
                padding: "13px",
                background: "#7C3AED", 
                color: "#fff",
                border: "none", 
                borderRadius: 12,
                fontSize: 14, 
                fontWeight: 600, 
                cursor: "pointer",
                marginTop: "1rem",
              }}
            >
              Create Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
 
export default Sidebar;
