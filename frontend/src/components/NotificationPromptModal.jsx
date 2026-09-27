import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "../hooks/useLocation";
import { X, MapPin } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../apiConfig";

const PRESET_LIMITS = [
  { value: 50, label: "50 (Moderate)", note: "Sensitive groups & children" },
  { value: 100, label: "100 (Unhealthy)", note: "Recommended standard limit" },
  { value: 150, label: "150 (Poor)", note: "High pollution advisory" },
  { value: 200, label: "200 (Hazardous)", note: "Severe health warning" },
];

const NotificationPromptModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { location, getGPS } = useLocation();

  const [visible, setVisible] = useState(false);
  const [city, setCity] = useState("");
  const [threshold, setThreshold] = useState(100);
  const [customThreshold, setCustomThreshold] = useState("");
  const [enableBrowserNotif, setEnableBrowserNotif] = useState(true);
  const [enableEmailNotif, setEnableEmailNotif] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Sync city with detected user location if available
  useEffect(() => {
    if (location?.city && !city) {
      setCity(location.city);
    }
  }, [location?.city]);

  // Handle first-time login modal display logic
  useEffect(() => {
    if (isOpen !== undefined) {
      setVisible(isOpen);
      return;
    }

    if (user?.email) {
      const storageKey = `ecostride_notification_seen_${user.email}`;
      const hasSeen = localStorage.getItem(storageKey);
      if (!hasSeen) {
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [user?.email, isOpen]);

  // Listen for open event from header / user dropdown
  useEffect(() => {
    const handleOpenEvent = () => {
      setResult(null);
      setError(null);
      setVisible(true);
    };
    window.addEventListener("open-notification-modal", handleOpenEvent);
    return () => window.removeEventListener("open-notification-modal", handleOpenEvent);
  }, []);

  const handleClose = (status = "dismissed") => {
    if (user?.email) {
      const storageKey = `ecostride_notification_seen_${user.email}`;
      localStorage.setItem(storageKey, status);
    }
    setVisible(false);
    if (onClose) onClose();
  };

  const handleCustomThresholdChange = (e) => {
    const val = e.target.value;
    setCustomThreshold(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setThreshold(parsed);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!user?.email) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const targetCity = city.trim() || location?.city || "Pune";
    const targetThreshold = Number(threshold) || 100;

    // 1. Request desktop push notification permission if enabled
    if (enableBrowserNotif && "Notification" in window) {
      try {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
          await Notification.requestPermission();
        }
      } catch (err) {
        console.warn("Desktop notification permission error:", err);
      }
    }

    // 2. Register subscription with backend API
    try {
      const res = await axios.post(`${API_BASE_URL}/api/alerts/subscribe`, {
        contact: user.email,
        contact_type: "email",
        city: targetCity,
        lat: location?.lat || 18.5204,
        lon: location?.lon || 73.8567,
        threshold: targetThreshold,
      });

      const data = res.data || {};
      setResult(data);

      if (user?.email) {
        localStorage.setItem(`ecostride_notification_seen_${user.email}`, "enabled");
        localStorage.setItem(
          `ecostride_notification_config_${user.email}`,
          JSON.stringify({
            email: user.email,
            city: targetCity,
            threshold: targetThreshold,
            browserNotifications: enableBrowserNotif,
            subscribedAt: new Date().toISOString(),
          })
        );
      }

      // 3. Desktop push notification feedback
      if (enableBrowserNotif && "Notification" in window && Notification.permission === "granted") {
        if (data.alert_triggered) {
          new Notification(`⚠️ EcoStride AQI Warning: ${targetCity}`, {
            body: `Current AQI is ${data.current_aqi} (Limit: ${targetThreshold}). Health precautions advised!`,
            icon: "/favicon.ico",
          });
        } else {
          new Notification(`✅ Notification Preferences Saved`, {
            body: `You will be alerted when AQI in ${targetCity} exceeds ${targetThreshold}.`,
            icon: "/favicon.ico",
          });
        }
      }
    } catch (err) {
      console.error("Alert subscription error:", err);
      setError(err.response?.data?.message || "Unable to save notification preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "var(--bg-card, #161b22)",
          border: "1px solid var(--border, #30363d)",
          borderRadius: "12px",
          boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
          overflow: "hidden",
          color: "var(--text-primary, #f0f6fc)",
          position: "relative",
          animation: "scaleIn 0.25s ease-out",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: "18px 24px 14px",
            borderBottom: "1px solid var(--border, #30363d)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>
              Air Quality Alert Preferences
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-muted, #8b949e)" }}>
              Receive instant alerts when AQI crosses your safety threshold.
            </p>
          </div>
          <button
            onClick={() => handleClose("dismissed")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted, #8b949e)",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px 24px" }}>
          {/* Submission Result Feedback */}
          {result && (
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "8px",
                  backgroundColor: result.alert_triggered
                    ? "rgba(239, 68, 68, 0.1)"
                    : "rgba(16, 185, 129, 0.1)",
                  border: `1px solid ${
                    result.alert_triggered ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"
                  }`,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "4px", color: result.alert_triggered ? "#f87171" : "#34d399" }}>
                  {result.alert_triggered
                    ? `⚠️ High Pollution Alert (${result.city}: AQI ${result.current_aqi})`
                    : `✅ Alert Preferences Saved`}
                </div>
                <div style={{ fontSize: "0.82rem", lineHeight: "1.4", color: "var(--text-secondary, #c9d1d9)" }}>
                  {result.alert_triggered ? (
                    <>Current air quality in <strong>{result.city}</strong> is <strong>AQI {result.current_aqi}</strong>, exceeding your set limit of {result.threshold}.</>
                  ) : (
                    <>Monitoring <strong>{result.city}</strong> for AQI &gt; {result.threshold}. Live AQI is <strong>{result.current_aqi ?? "Normal"}</strong>.</>
                  )}
                </div>

                {/* Email Delivery Detail */}
                <div
                  style={{
                    marginTop: "10px",
                    paddingTop: "8px",
                    borderTop: "1px dashed var(--border, #30363d)",
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Email Status:</span>
                  {result.email_sent ? (
                    <span style={{ color: "#34d399" }}>Sent to {user?.email}</span>
                  ) : (
                    <span style={{ color: "#fbbf24" }}>
                      {result.email_status || `Logged for ${user?.email} (Check Gmail SMTP settings)`}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => handleClose("enabled")}
                  className="btn-primary"
                  style={{ padding: "8px 20px", fontSize: "0.85rem", borderRadius: "6px" }}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "6px",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                fontSize: "0.82rem",
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}

          {!result && (
            <form onSubmit={handleSubmit}>
              {/* Google Account Email Field */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary, #8b949e)", marginBottom: "6px" }}>
                  Verified Google Account
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  readOnly
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "0.85rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border, #30363d)",
                    backgroundColor: "var(--bg-surface, #0d1117)",
                    color: "var(--text-muted, #8b949e)",
                    cursor: "not-allowed",
                  }}
                />
              </div>

              {/* City Location Field */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary, #8b949e)" }}>
                    Target City / Location
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      getGPS();
                      if (location?.city) setCity(location.city);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent, #00e5a0)",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: 0,
                    }}
                  >
                    <MapPin size={12} />
                    <span>Use Current Location</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Pune, Mumbai, Delhi"
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "0.85rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border, #30363d)",
                    backgroundColor: "var(--bg-surface, #0d1117)",
                    color: "var(--text-primary, #f0f6fc)",
                  }}
                />
              </div>

              {/* AQI Limit Selector */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary, #8b949e)", marginBottom: "8px" }}>
                  AQI Warning Threshold
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                  {PRESET_LIMITS.map((item) => {
                    const isSelected = threshold === item.value && !customThreshold;
                    return (
                      <div
                        key={item.value}
                        onClick={() => {
                          setThreshold(item.value);
                          setCustomThreshold("");
                        }}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: `1px solid ${isSelected ? "var(--accent, #00e5a0)" : "var(--border, #30363d)"}`,
                          backgroundColor: isSelected ? "rgba(0, 229, 160, 0.08)" : "var(--bg-surface, #0d1117)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ fontSize: "0.82rem", fontWeight: isSelected ? 600 : 500, color: isSelected ? "var(--accent, #00e5a0)" : "inherit" }}>
                          AQI &gt; {item.label}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted, #8b949e)", marginTop: "2px" }}>
                          {item.note}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Limit Input */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted, #8b949e)" }}>Custom AQI Limit:</span>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    placeholder="e.g. 80"
                    value={customThreshold}
                    onChange={handleCustomThresholdChange}
                    style={{
                      width: "100px",
                      padding: "6px 10px",
                      fontSize: "0.8rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border, #30363d)",
                      backgroundColor: "var(--bg-surface, #0d1117)",
                      color: "var(--text-primary, #f0f6fc)",
                    }}
                  />
                </div>
              </div>

              {/* Notification Method Checkboxes */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "6px",
                  backgroundColor: "var(--bg-surface, #0d1117)",
                  border: "1px solid var(--border, #30363d)",
                  marginBottom: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={enableEmailNotif}
                    onChange={(e) => setEnableEmailNotif(e.target.checked)}
                    style={{ accentColor: "var(--accent, #00e5a0)" }}
                  />
                  <span>Send email alerts to <strong>{user?.email}</strong></span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={enableBrowserNotif}
                    onChange={(e) => setEnableBrowserNotif(e.target.checked)}
                    style={{ accentColor: "var(--accent, #00e5a0)" }}
                  />
                  <span>Enable desktop push notifications</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => handleClose("dismissed")}
                  disabled={loading}
                  style={{
                    padding: "8px 16px",
                    fontSize: "0.82rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border, #30363d)",
                    background: "transparent",
                    color: "var(--text-secondary, #8b949e)",
                    cursor: "pointer",
                  }}
                >
                  Not Now
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{
                    padding: "8px 20px",
                    fontSize: "0.82rem",
                    borderRadius: "6px",
                  }}
                >
                  {loading ? "Saving..." : "Save Preferences"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPromptModal;
