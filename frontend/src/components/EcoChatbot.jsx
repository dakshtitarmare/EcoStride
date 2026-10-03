import React, { useCallback, useEffect, useRef, useState } from "react";
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

  const getPositionBounds = useCallback(() => {
    const mobile = window.innerWidth <= 768;
    const bottomInset = mobile ? 86 : 18;
    return {
      maxLeft: Math.max(12, window.innerWidth - 76),
      maxTop: Math.max(12, window.innerHeight - 64 - bottomInset),
      bottomInset,
    };
  }, []);

  const clampPosition = useCallback((next) => {
    const { maxLeft, maxTop } = getPositionBounds();
    return {
      left: Math.max(12, Math.min(maxLeft, next.left)),
      top: Math.max(12, Math.min(maxTop, next.top)),
    };
  }, [getPositionBounds]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ecostride_chatbot_position"));
      if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) setPosition(clampPosition(saved));
    } catch {
      // Ignore invalid saved position.
    }

    const keepInViewport = () => {
      setPosition((current) => current.left === null ? current : clampPosition(current));
    };
    window.addEventListener("resize", keepInViewport);
    return () => window.removeEventListener("resize", keepInViewport);
  }, [clampPosition]);

  const getPosition = () => {
    if (position.left !== null) return position;
    const { maxLeft, maxTop } = getPositionBounds();
    return { left: maxLeft, top: maxTop };
  };

  const savePosition = (next) => {
    const safePosition = clampPosition(next);
    setPosition(safePosition);
    localStorage.setItem("ecostride_chatbot_position", JSON.stringify(safePosition));
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = getPosition();
    dragRef.current = { x: event.clientX, y: event.clientY, left: start.left, top: start.top };
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current) return;
    const next = clampPosition({
      left: dragRef.current.left + event.clientX - dragRef.current.x,
      top: dragRef.current.top + event.clientY - dragRef.current.y,
    });
    dragRef.current.position = next;
    setPosition(next);
  };

  const handlePointerUp = () => {
    if (!dragRef.current) return;
    const next = dragRef.current.position || getPosition();
    dragRef.current = null;
    savePosition(next);
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
