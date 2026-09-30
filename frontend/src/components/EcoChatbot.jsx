import React, { useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import axios from "axios";
import { useLocation } from "../hooks/useLocation";
import { API_BASE_URL } from "../apiConfig";

const DEFAULT_POSITION = { left: null, top: null };

const EcoChatbot = () => {
  const { location } = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! Ask me about your AQI, health, routes, forecasts, or alerts." },
  ]);
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const dragRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ecostride_chatbot_position"));
      if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) setPosition(saved);
    } catch {
      // Ignore invalid saved position.
    }
  }, []);

  const getPosition = () => {
    if (position.left !== null) return position;
    return { left: window.innerWidth - 82, top: window.innerHeight - 82 };
  };

  const savePosition = (next) => {
    setPosition(next);
    localStorage.setItem("ecostride_chatbot_position", JSON.stringify(next));
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = getPosition();
    dragRef.current = { x: event.clientX, y: event.clientY, left: start.left, top: start.top };
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current) return;
    const next = {
      left: Math.max(12, Math.min(window.innerWidth - 72, dragRef.current.left + event.clientX - dragRef.current.x)),
      top: Math.max(12, Math.min(window.innerHeight - 72, dragRef.current.top + event.clientY - dragRef.current.y)),
    };
    setPosition(next);
  };

  const handlePointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    savePosition(getPosition());
  };

  const sendMessage = async (event) => {
    event?.preventDefault();
    const text = message.trim();
    if (!text || busy) return;

    setMessage("");
    setMessages((current) => [...current, { role: "user", text }]);
    setBusy(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/chat`, {
        message: text,
        city: location?.city || "Pune",
        lat: location?.lat,
        lon: location?.lon,
      });
      setMessages((current) => [...current, { role: "assistant", text: response.data.answer }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: error.response?.data?.message || "I cannot reach EcoStride right now. Please try again." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const currentPosition = getPosition();

  return (
    <div
      className={`eco-chatbot ${open ? "is-open" : ""}`}
      style={{ left: currentPosition.left, top: currentPosition.top }}
    >
      {open && (
        <section className="eco-chatbot-panel" aria-label="EcoStride assistant">
          <header className="eco-chatbot-header">
            <div className="eco-chatbot-title"><span className="eco-chatbot-mini-orb"><Bot size={16} /></span><span>EcoStride guide</span></div>
            <button type="button" className="eco-chatbot-close" onClick={() => setOpen(false)} aria-label="Close assistant"><X size={16} /></button>
          </header>
          <div className="eco-chatbot-messages">
            {messages.map((item, index) => <div key={`${item.role}-${index}`} className={`eco-chatbot-message ${item.role}`}>{item.text}</div>)}
            {busy && <div className="eco-chatbot-message assistant eco-chatbot-typing"><span /><span /><span /></div>}
          </div>
          <form className="eco-chatbot-form" onSubmit={sendMessage}>
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask EcoStride..." aria-label="Ask EcoStride" />
            <button type="submit" aria-label="Send question" disabled={busy || !message.trim()}><Send size={16} /></button>
          </form>
        </section>
      )}
      <button
        type="button"
        className="eco-chatbot-orb"
        aria-label={open ? "Move EcoStride assistant" : "Open EcoStride assistant"}
        onClick={() => setOpen((value) => !value)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span className="eco-chatbot-hi">Hi!</span>
        <Bot size={28} strokeWidth={1.8} />
      </button>
    </div>
  );
};

export default EcoChatbot;
