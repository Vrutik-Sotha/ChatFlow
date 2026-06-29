import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { useChatStore } from "../store/useChatStore";
import { MessageCircle, Menu, X } from "lucide-react";
 
const ChatPage = () => {
  const { activeRoom } = useChatStore();
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
 
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowSidebar(true);
      }
    };
 
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
 
  const handleSelectChat = () => {
    if (isMobile) {
      setShowSidebar(false);
    }
  };
 
  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: "#080818",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Mobile: Toggle Sidebar Button */}
      {isMobile && (
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          style={{
            position: "fixed",
            top: 12,
            left: 12,
            zIndex: 100,
            background: "#7C3AED",
            border: "none",
            borderRadius: 10,
            padding: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {showSidebar ? (
            <X size={20} color="white" />
          ) : (
            <Menu size={20} color="white" />
          )}
        </button>
      )}
 
      {/* Sidebar */}
      {(!isMobile || showSidebar) && (
        <div style={{
          position: isMobile ? "fixed" : "relative",
          top: 0,
          left: 0,
          zIndex: 50,
          width: isMobile ? "100%" : "auto",
          height: "100vh",
          background: "#0d0d1f",
        }}>
          <Sidebar onSelectChat={handleSelectChat} />
        </div>
      )}
 
      {/* Chat Window or Empty State */}
      {activeRoom ? (
        <ChatWindow />
      ) : (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#555",
          width: "100%",
        }}>
          <div style={{
            width: 72,
            height: 72,
            background: "rgba(124,58,237,0.1)",
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}>
            <MessageCircle size={36} color="#7C3AED" />
          </div>
          <h2 style={{
            fontSize: 20,
            fontWeight: 600,
            color: "#fff",
            marginBottom: 8,
          }}>
            Your Messages
          </h2>
          <p style={{ fontSize: 14, color: "#555" }}>
            Select a chat or start a new conversation
          </p>
        </div>
      )}
    </div>
  );
};
 
export default ChatPage;