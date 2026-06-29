import { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useSocket } from "../context/SocketContext";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import {
  Send, Users, Smile, Paperclip, Phone,
  Video, MoreVertical, X, Check, CheckCheck,
  Pencil, Trash2, Image, ZoomIn,
} from "lucide-react";

const ChatWindow = () => {
  const {
    activeRoom, messages, fetchMessages, addMessage,
    updateRoomLastMessage, isLoadingMessages,
    editMessageInStore, deleteMessageInStore,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const socketRef = useSocket();

  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fullscreenImg, setFullscreenImg] = useState(null);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [editText, setEditText] = useState("");
  const [showDeleteMenu, setShowDeleteMenu] = useState(null);

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiRef = useRef(null);

  useEffect(() => {
    if (activeRoom?._id) fetchMessages(activeRoom._id);
  }, [activeRoom?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target))
        setShowEmoji(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Socket listeners
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    socket.on("typing:start", ({ userId }) =>
      setTypingUsers((p) => [...new Set([...p, userId])]));

    socket.on("typing:stop", ({ userId }) =>
      setTypingUsers((p) => p.filter((id) => id !== userId)));

    socket.on("message:edited", (msg) => editMessageInStore(msg));

    socket.on("message:deleted", ({ messageId, deleteFor }) => {
      if (deleteFor === "everyone") deleteMessageInStore(messageId);
    });

    socket.on("message:seen", ({ messageId }) => {
      editMessageInStore({ _id: messageId, status: "seen" });
    });

    return () => {
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("message:edited");
      socket.off("message:deleted");
      socket.off("message:seen");
    };
  }, [socketRef?.current]);

  // Browser notification for inactive tab
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleTyping = (val) => {
    setText(val);
    const socket = socketRef?.current;
    if (!socket || !activeRoom) return;
    socket.emit("typing:start", { roomId: activeRoom._id, userId: authUser._id });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing:stop", { roomId: activeRoom._id, userId: authUser._id });
    }, 1500);
  };

  const onEmojiClick = (emojiData) => {
    const cursor = inputRef.current?.selectionStart ?? text.length;
    const newText = text.slice(0, cursor) + emojiData.emoji + text.slice(cursor);
    setText(newText);
    setTimeout(() => {
      inputRef.current?.setSelectionRange(cursor + emojiData.emoji.length, cursor + emojiData.emoji.length);
      inputRef.current?.focus();
    }, 10);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const sendMessage = async () => {
    if ((!text.trim() && !imageFile) || isSending) return;
    setIsSending(true);

    try {
      let message;

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("roomId", activeRoom._id);

        const res = await axiosInstance.post("/messages/image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            setUploadProgress(Math.round((e.loaded * 100) / e.total));
          },
        });
        message = res.data;
        setImageFile(null);
        setImagePreview(null);
        setUploadProgress(0);
      } else {
        const res = await axiosInstance.post("/messages", {
          roomId: activeRoom._id,
          content: text.trim(),
        });
        message = res.data;
      }

      socketRef?.current?.emit("message:send", {
        ...message,
        roomId: activeRoom._id,
      });

      addMessage(message);
      updateRoomLastMessage(activeRoom._id, message);
      setText("");
      socketRef?.current?.emit("typing:stop", {
        roomId: activeRoom._id,
        userId: authUser._id,
      });
    } catch {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleEdit = async (msg) => {
    if (!editText.trim()) return;
    try {
      const res = await axiosInstance.patch(`/messages/${msg._id}/edit`, {
        content: editText,
      });
      editMessageInStore(res.data);
      socketRef?.current?.emit("message:edit", {
        ...res.data,
        roomId: activeRoom._id,
      });
      setEditingMsg(null);
      setEditText("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Cannot edit message");
    }
  };

  const handleDelete = async (msg, deleteFor) => {
    try {
      await axiosInstance.delete(`/messages/${msg._id}?deleteFor=${deleteFor}`);
      if (deleteFor === "everyone") {
        deleteMessageInStore(msg._id);
        socketRef?.current?.emit("message:delete", {
          messageId: msg._id,
          roomId: activeRoom._id,
          deleteFor,
        });
      } else {
        deleteMessageInStore(msg._id);
      }
      setShowDeleteMenu(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Cannot delete message");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getRoomName = () => {
    if (activeRoom.isGroup) return activeRoom.name;
    const other = activeRoom.members?.find((m) => m._id !== authUser._id);
    return other?.username || "Unknown";
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const isMine = (msg) =>
    msg.sender?._id === authUser._id || msg.sender === authUser._id;

  const canEditDelete = (msg) => {
    if (!isMine(msg)) return false;
    const age = (Date.now() - new Date(msg.createdAt)) / 1000 / 60;
    return age <= 15;
  };

  const StatusIcon = ({ msg }) => {
    if (!isMine(msg)) return null;
    if (msg.status === "seen") return <CheckCheck size={12} color="#7C3AED" />;
    if (msg.status === "delivered") return <CheckCheck size={12} color="#888" />;
    return <Check size={12} color="#888" />;
  };

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      height: "100vh", background: "#080818", overflow: "hidden",
    }}>

      {/* Header */}
      <div style={{
        padding: "0 1.2rem", height: 64, flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "#0d0d1f",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg, #7C3AED, #9333ea)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 600, color: "#fff",
          }}>
            {activeRoom.isGroup ? <Users size={18} color="white" /> : getRoomName()[0].toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#fff", lineHeight: 1.3 }}>
              {getRoomName()}
            </p>
            <p style={{ fontSize: 12, color: "#10b981", lineHeight: 1.3 }}>
              {activeRoom.isGroup ? `${activeRoom.members?.length} members` : "● Online"}
            </p>
          </div>
        </div>
        
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "1rem 1.2rem",
        display: "flex", flexDirection: "column", gap: 2,
      }}>
        {isLoadingMessages ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
            <div style={{
              width: 32, height: 32,
              border: "3px solid rgba(124,58,237,0.3)",
              borderTopColor: "#7C3AED",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              {/* Date separator */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "1rem 0" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                <span style={{
                  fontSize: 11, color: "#555",
                  background: "#0d0d1f", padding: "3px 10px",
                  borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  {date}
                </span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              </div>

              {msgs.map((msg, idx) => {
                const mine = isMine(msg);
                const showAvatar = !mine && (idx === 0 || msgs[idx - 1]?.sender?._id !== msg.sender?._id);

                return (
                  <div
                    key={msg._id}
                    onMouseEnter={() => setHoveredMsg(msg._id)}
                    onMouseLeave={() => { setHoveredMsg(null); setShowDeleteMenu(null); }}
                    style={{
                      display: "flex",
                      justifyContent: mine ? "flex-end" : "flex-start",
                      alignItems: "flex-end",
                      gap: 8, marginBottom: 4,
                      position: "relative",
                    }}
                  >
                    {!mine && (
                      <div style={{ width: 28, flexShrink: 0 }}>
                        {showAvatar && (
                          <div style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: "linear-gradient(135deg, #5B21B6, #7C3AED)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 600, color: "#fff",
                          }}>
                            {msg.sender?.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ maxWidth: "65%" }}>
                      {!mine && activeRoom.isGroup && showAvatar && (
                        <p style={{ fontSize: 11, color: "#7C3AED", marginBottom: 3, marginLeft: 4 }}>
                          {msg.sender?.username}
                        </p>
                      )}

                      {/* Message bubble */}
                      <div style={{
                        padding: msg.messageType === "image" ? "4px" : "10px 14px",
                        borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: mine ? "linear-gradient(135deg, #7C3AED, #6D28D9)" : "#1a1a2e",
                        border: mine ? "none" : "1px solid rgba(255,255,255,0.06)",
                        position: "relative",
                      }}>
                        {msg.isDeleted ? (
                          <p style={{ fontSize: 13, color: "#666", fontStyle: "italic" }}>
                            🚫 Message deleted
                          </p>
                        ) : msg.messageType === "image" ? (
                          <div>
                            <img
                              src={msg.imageUrl}
                              alt="sent"
                              loading="lazy"
                              onClick={() => setFullscreenImg(msg.imageUrl)}
                              style={{
                                maxWidth: 240, maxHeight: 240,
                                borderRadius: 14, display: "block",
                                cursor: "zoom-in",
                              }}
                            />
                            <div style={{
                              position: "absolute", top: 8, right: 8,
                              background: "rgba(0,0,0,0.5)",
                              borderRadius: 6, padding: "3px",
                              cursor: "pointer",
                            }}
                              onClick={() => setFullscreenImg(msg.imageUrl)}
                            >
                              <ZoomIn size={14} color="#fff" />
                            </div>
                          </div>
                        ) : (
                          <p style={{
                            fontSize: 14, color: "#fff",
                            lineHeight: 1.5, wordBreak: "break-word", margin: 0,
                          }}>
                            {msg.content}
                          </p>
                        )}
                      </div>

                      {/* Time + status + edited */}
                      <div style={{
                        display: "flex", alignItems: "center", gap: 4,
                        justifyContent: mine ? "flex-end" : "flex-start",
                        marginTop: 3,
                        paddingLeft: mine ? 0 : 4,
                        paddingRight: mine ? 4 : 0,
                      }}>
                        {msg.isEdited && (
                          <span style={{ fontSize: 10, color: "#555", fontStyle: "italic" }}>edited</span>
                        )}
                        <span style={{ fontSize: 10, color: "#555" }}>
                          {formatTime(msg.createdAt)}
                        </span>
                        <StatusIcon msg={msg} />
                      </div>
                    </div>

                    {/* Action buttons on hover */}
                    {hoveredMsg === msg._id && !msg.isDeleted && canEditDelete(msg) && (
                      <div style={{
                        position: "absolute",
                        [mine ? "left" : "right"]: "calc(65% + 12px)",
                        bottom: 20,
                        display: "flex", gap: 4,
                        background: "#12122a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10, padding: "4px",
                        zIndex: 10,
                      }}>
                        {msg.messageType === "text" && (
                          <button
                            onClick={() => { setEditingMsg(msg); setEditText(msg.content); }}
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              padding: "4px", borderRadius: 6,
                              display: "flex", alignItems: "center",
                            }}
                            title="Edit"
                          >
                            <Pencil size={14} color="#aaa" />
                          </button>
                        )}
                        <button
                          onClick={() => setShowDeleteMenu(msg._id)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            padding: "4px", borderRadius: 6,
                            display: "flex", alignItems: "center",
                          }}
                          title="Delete"
                        >
                          <Trash2 size={14} color="#ef4444" />
                        </button>
                      </div>
                    )}

                    {/* Delete menu */}
                    {showDeleteMenu === msg._id && (
                      <div style={{
                        position: "absolute",
                        [mine ? "left" : "right"]: "calc(65% + 12px)",
                        bottom: 20, zIndex: 20,
                        background: "#12122a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12, overflow: "hidden",
                        minWidth: 180,
                      }}>
                        <button
                          onClick={() => handleDelete(msg, "me")}
                          style={{
                            display: "block", width: "100%", padding: "10px 16px",
                            background: "none", border: "none", cursor: "pointer",
                            color: "#fff", fontSize: 13, textAlign: "left",
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                          onMouseOut={(e) => e.currentTarget.style.background = "none"}
                        >
                          Delete for me
                        </button>
                        <button
                          onClick={() => handleDelete(msg, "everyone")}
                          style={{
                            display: "block", width: "100%", padding: "10px 16px",
                            background: "none", border: "none", cursor: "pointer",
                            color: "#ef4444", fontSize: 13, textAlign: "left",
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
                          onMouseOut={(e) => e.currentTarget.style.background = "none"}
                        >
                          Delete for everyone
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
            <div style={{
              padding: "10px 14px",
              background: "#1a1a2e",
              borderRadius: "18px 18px 18px 4px",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", gap: 4, alignItems: "center",
            }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#7C3AED",
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Edit mode bar */}
      {editingMsg && (
        <div style={{
          padding: "10px 1.2rem",
          background: "rgba(124,58,237,0.1)",
          borderTop: "1px solid rgba(124,58,237,0.2)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Pencil size={14} color="#7C3AED" />
          <span style={{ fontSize: 13, color: "#a78bfa", flex: 1 }}>Editing message</span>
          <button
            onClick={() => { setEditingMsg(null); setEditText(""); }}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <X size={16} color="#aaa" />
          </button>
        </div>
      )}

      {/* Image preview bar */}
      {imagePreview && (
        <div style={{
          padding: "10px 1.2rem",
          background: "#0d0d1f",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <img src={imagePreview} alt="preview" style={{
            width: 60, height: 60, borderRadius: 10,
            objectFit: "cover",
          }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: "#fff" }}>Image ready to send</p>
            {uploadProgress > 0 && (
              <div style={{
                height: 3, background: "rgba(255,255,255,0.1)",
                borderRadius: 2, marginTop: 6,
              }}>
                <div style={{
                  height: "100%", width: `${uploadProgress}%`,
                  background: "#7C3AED", borderRadius: 2,
                  transition: "width 0.3s",
                }} />
              </div>
            )}
          </div>
          <button
            onClick={() => { setImagePreview(null); setImageFile(null); }}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <X size={18} color="#aaa" />
          </button>
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: "1rem 1.2rem",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "#0d0d1f", flexShrink: 0,
        position: "relative",
      }}>
        {/* Emoji picker */}
        {showEmoji && (
          <div ref={emojiRef} style={{
            position: "absolute", bottom: "100%", left: "1.2rem",
            zIndex: 100, marginBottom: 8,
          }}>
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme="dark"
              width={320}
              height={380}
            />
          </div>
        )}

        <div style={{
          display: "flex", alignItems: "flex-end", gap: 10,
          background: "#12122a",
          border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: 16, padding: "8px 12px",
        }}>
          {/* Image upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", padding: "4px", flexShrink: 0,
            }}
          >
            <Image size={18} color="#555" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: "none" }}
          />

          {/* Text input */}
          <textarea
            ref={inputRef}
            rows={1}
            placeholder={editingMsg ? "Edit your message..." : "Type a message..."}
            value={editingMsg ? editText : text}
            onChange={(e) => {
              if (editingMsg) {
                setEditText(e.target.value);
              } else {
                handleTyping(e.target.value);
              }
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                editingMsg ? handleEdit(editingMsg) : sendMessage();
              }
            }}
            style={{
              flex: 1, background: "transparent",
              border: "none", outline: "none",
              color: "#fff", fontSize: 14,
              padding: "4px 0", resize: "none",
              lineHeight: 1.5, maxHeight: 120,
              fontFamily: "inherit",
            }}
          />

          {/* Emoji */}
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", padding: "4px", flexShrink: 0,
            }}
          >
            <Smile size={18} color={showEmoji ? "#7C3AED" : "#555"} />
          </button>

          {/* Send */}
          <button
            onClick={() => editingMsg ? handleEdit(editingMsg) : sendMessage()}
            disabled={(!text.trim() && !imageFile && !editText.trim()) || isSending}
            style={{
              width: 36, height: 36,
              background: (text.trim() || imageFile || editText.trim())
                ? "#7C3AED" : "rgba(124,58,237,0.2)",
              border: "none", borderRadius: 10,
              cursor: (text.trim() || imageFile || editText.trim()) ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s", flexShrink: 0,
            }}
          >
            <Send size={16} color={(text.trim() || imageFile || editText.trim()) ? "#fff" : "#7C3AED"} />
          </button>
        </div>

        <p style={{ fontSize: 11, color: "#444", textAlign: "center", marginTop: 6 }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>

      {/* Fullscreen image modal */}
      {fullscreenImg && (
        <div
          onClick={() => setFullscreenImg(null)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, cursor: "zoom-out",
          }}
        >
          <button
            onClick={() => setFullscreenImg(null)}
            style={{
              position: "absolute", top: 20, right: 20,
              background: "rgba(255,255,255,0.1)", border: "none",
              borderRadius: "50%", width: 40, height: 40,
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={20} color="#fff" />
          </button>
          <img
            src={fullscreenImg}
            alt="fullscreen"
            style={{
              maxWidth: "90vw", maxHeight: "90vh",
              borderRadius: 12, objectFit: "contain",
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

export default ChatWindow;