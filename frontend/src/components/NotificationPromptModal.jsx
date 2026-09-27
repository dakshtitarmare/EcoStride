import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "../hooks/useLocation";
import { Bell, ShieldAlert, CheckCircle2, MapPin, Mail, Sparkles, X, ChevronRight, AlertTriangle } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../apiConfig";

const PRESET_THRESHOLDS = [
  { value: 50, label: "50 — Moderate", desc: "Sensitive groups & children", color: "var(--aqi-good)" },
  { value: 100, label: "100 — Unhealthy", desc: "Default recommended limit", color: "var(--aqi-moderate)" },
  { value: 150, label: "150 — Poor", desc: "High pollution advisory", color: "var(--aqi-sensitive)" },
  { value: 200, label: "200 — Hazardous", desc: "Emergency health warning", color: "var(--aqi-unhealthy)" },
];

const NotificationPromptModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { location, getGPS } = useLocation();

  const [visible, setVisible] = useState(false);
  const [city, setCity] = useState("");
  const [threshold, setThreshold] = useState(100);
  const [customThreshold, setCustomThreshold] = useState("");
  const [enableBrowserNotif, setEnableBrowserNotif] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Sync city with detected location
  useEffect(() => {
    if (location?.city && !city) {
      setCity(location.city);
    }
  }, [location?.city]);

  // Check if first-time prompt should open
  useEffect(() => {
    if (isOpen !== undefined) {
      setVisible(isOpen);
      return;
    }

    if (user?.email) {
      const storageKey = `ecostride_notification_seen_${user.email}`;
      const hasSeen = localStorage.getItem(storageKey);
      if (!hasSeen) {
        // Small delay so user sees dashboard before prompt appears
        const timer = setTimeout(() => {
          setVisible(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [user?.email, isOpen]);

  // Listen for manual trigger events (e.g. from user menu)
  useEffect(() => {
    const handleOpenEvent = () => setVisible(true);
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

  const handleSelectThreshold = (val) => {
    setThreshold(val);
    setCustomThreshold("");
  };

  const handleCustomThresholdChange = (e) => {
    const val = parseInt(e.target.value);
    setCustomThreshold(e.target.value);
    if (!isNaN(val) && val > 0) {
      setThreshold(val);
    }
  };

  const handleEnableNotifications = async (e) => {
    e?.preventDefault();
    if (!user?.email) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const targetCity = city.trim() || location?.city || "Pune";
    const targetThreshold = parseInt(threshold) || 100;

    // 1. Request Browser Desktop Notification permission if selected
    if (enableBrowserNotif && "Notification" in window) {
      try {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
          await Notification.requestPermission();
        }
      } catch (notifErr) {
        console.warn("Notification permission request error:", notifErr);
      }
    }

    // 2. Call backend alert service to register subscription & immediately check AQI
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

      // Save user notification settings locally
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

      // 3. Trigger immediate Browser notification if permission granted
      if ("Notification" in window && Notification.permission === "granted") {
        if (data.alert_triggered) {
          new Notification(`⚠️ High AQI Alert: ${targetCity}`, {
            body: `Current AQI is ${data.current_aqi}, which exceeds your limit (${targetThreshold}). Health precautions advised!`,
            icon: "/favicon.ico",
          });
        } else {
          new Notification(`✅ EcoStride Notifications Active`, {
            body: `Alerts set for ${targetCity}. You will receive emails if AQI exceeds ${targetThreshold}.`,
            icon: "/favicon.ico",
          });
        }
      }

      // Close modal automatically after showing success state
      setTimeout(() => {
        handleClose("enabled");
      }, 4500);
    } catch (err) {
      console.error("Subscription error:", err);
      setError(err.response?.data?.message || "Failed to set up notifications. Please try again.");
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
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.25s ease-out",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--bg-card)",
          border: "1px solid rgba(0, 229, 160, 0.25)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 229, 160, 0.15)",
          borderRadius: "16px",
          overflow: "hidden",
          position: "relative",
          animation: "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Glowing Top accent bar */}
        <div
          style={{
            height: "4px",
            background: "linear-gradient(90deg, #00e5a0, #f5c542, #ff4f6b)",
          }}
        />

        {/* Close Button */}
        <button
          onClick={() => handleClose("dismissed")}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 0.2s",
          }}
          title="Close"
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <X size={20} />
        </button>

        <div style={{ padding: "24px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(0, 229, 160, 0.12)",
                border: "1px solid rgba(0, 229, 160, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
                flexShrink: 0,
              }}
            >
              <Bell size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--accent)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Air Quality Notifications
                </span>
                <Sparkles size={13} color="var(--accent)" />
              </div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: "4px 0",
                  fontFamily: "var(--font-display)",
                }}
              >
                Shall we send you AQI alerts?
              </h3>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  lineHeight: "1.4",
                }}
              >
                Get instant notifications on your Google email when pollution levels exceed your comfort limit.
              </p>
            </div>
          </div>

          {/* Result Banner if already submitted */}
          {result && (
            <div
              style={{
                background: result.alert_triggered
                  ? "rgba(255, 79, 107, 0.12)"
                  : "rgba(0, 229, 160, 0.12)",
                border: `1px solid ${
                  result.alert_triggered ? "rgba(255, 79, 107, 0.3)" : "rgba(0, 229, 160, 0.3)"
                }`,
                borderRadius: "10px",
                padding: "14px",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                {result.alert_triggered ? (
                  <AlertTriangle size={20} color="var(--aqi-unhealthy)" style={{ flexShrink: 0 }} />
                ) : (
                  <CheckCircle2 size={20} color="var(--accent)" style={{ flexShrink: 0 }} />
                )}
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      color: result.alert_triggered ? "var(--aqi-unhealthy)" : "var(--accent)",
                      marginBottom: "4px",
                    }}
                  >
                    {result.alert_triggered
                      ? `⚠️ Active Air Alert for ${result.city} (AQI ${result.current_aqi})!`
                      : `✅ Subscribed Successfully!`}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-primary)", lineHeight: "1.4" }}>
                    {result.alert_triggered ? (
                      <>
                        Current air quality in <strong>{result.city}</strong> is at{" "}
                        <strong style={{ color: "var(--aqi-unhealthy)" }}>AQI {result.current_aqi}</strong> (exceeds your limit of {result.threshold}). We have sent an immediate alert and health recommendations to <strong>{user?.email}</strong>.
                      </>
                    ) : (
                      <>
                        Confirmation sent to <strong>{user?.email}</strong>. Current AQI in {result.city} is{" "}
                        <strong style={{ color: "var(--accent)" }}>{result.current_aqi ?? "Safe"}</strong>. You will be alerted whenever it rises above AQI {result.threshold}.
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                background: "rgba(255, 79, 107, 0.1)",
                border: "1px solid rgba(255, 79, 107, 0.3)",
                color: "#ff4f6b",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}

          {!result && (
            <form onSubmit={handleEnableNotifications}>
              {/* Logged in Google User Info */}
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  marginBottom: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      background: "rgba(66, 133, 244, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#4285F4",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                    }}
                  >
                    G
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Send Alerts To Google Email
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 600 }}>
                      {user?.email || "Signed-in User"}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    background: "rgba(0, 229, 160, 0.1)",
                    color: "var(--accent)",
                    border: "1px solid rgba(0, 229, 160, 0.3)",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "0.65rem",
                    fontWeight: 600,
                  }}
                >
                  Verified
                </span>
              </div>

              {/* Location Input */}
              <div style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: "6px",
                  }}
                >
                  Monitoring Location
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <MapPin
                      size={16}
                      style={{
                        position: "absolute",
                        left: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)",
                      }}
                    />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Pune, Mumbai, Delhi..."
                      className="input"
                      style={{
                        paddingLeft: "32px",
                        width: "100%",
                        fontSize: "0.85rem",
                        height: "38px",
                      }}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      getGPS();
                      if (location?.city) setCity(location.city);
                    }}
                    className="btn-ghost"
                    style={{
                      padding: "0 12px",
                      fontSize: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      height: "38px",
                      whiteSpace: "nowrap",
                    }}
                    title="Use Current GPS Location"
                  >
                    <MapPin size={14} color="#34A853" />
                    <span>GPS</span>
                  </button>
                </div>
              </div>

              {/* Threshold Selection */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Alert Me When AQI Exceeds:
                  </label>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-mono)",
                      color: "var(--accent)",
                      fontWeight: 700,
                    }}
                  >
                    Limit: &gt; {threshold}
                  </span>
                </div>

                {/* Preset Options Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                  {PRESET_THRESHOLDS.map((p) => {
                    const isSelected = threshold === p.value && !customThreshold;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => handleSelectThreshold(p.value)}
                        style={{
                          background: isSelected ? "rgba(0, 229, 160, 0.12)" : "var(--bg-surface)",
                          border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                          borderRadius: "8px",
                          padding: "8px 10px",
                          textAlign: "left",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: p.color,
                            }}
                          />
                          <span
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: isSelected ? 700 : 500,
                              color: isSelected ? "var(--accent)" : "var(--text-primary)",
                            }}
                          >
                            {p.label}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px", paddingLeft: "14px" }}>
                          {p.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Limit Input */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    Or custom limit:
                  </span>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    placeholder="e.g. 75 or 120"
                    value={customThreshold}
                    onChange={handleCustomThresholdChange}
                    className="input"
                    style={{
                      height: "32px",
                      fontSize: "0.75rem",
                      padding: "4px 8px",
                      width: "120px",
                    }}
                  />
                </div>
              </div>

              {/* Notification Channels Checkboxes */}
              <div
                style={{
                  background: "var(--bg-surface)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  marginBottom: "20px",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", color: "var(--text-primary)", cursor: "pointer" }}>
                  <input type="checkbox" checked={true} readOnly style={{ accentColor: "var(--accent)" }} />
                  <Mail size={14} color="var(--accent)" />
                  <span>Email Alerts (Directly sent to {user?.email})</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", color: "var(--text-primary)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={enableBrowserNotif}
                    onChange={(e) => setEnableBrowserNotif(e.target.checked)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <Bell size={14} color="var(--accent)" />
                  <span>Desktop / Browser Push Notifications</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => handleClose("dismissed")}
                  className="btn-ghost"
                  style={{
                    padding: "9px 16px",
                    fontSize: "0.85rem",
                    borderRadius: "8px",
                  }}
                  disabled={loading}
                >
                  Maybe Later
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    padding: "9px 20px",
                    fontSize: "0.85rem",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                  disabled={loading}
                >
                  <Bell size={16} />
                  <span>{loading ? "Activating..." : "Yes, Enable Alerts"}</span>
                </button>
              </div>
            </form>
          )}

          {result && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => handleClose("enabled")}
                className="btn-primary"
                style={{
                  padding: "8px 24px",
                  fontSize: "0.85rem",
                  borderRadius: "8px",
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPromptModal;
