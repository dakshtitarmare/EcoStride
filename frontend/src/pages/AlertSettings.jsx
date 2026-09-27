import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "../hooks/useLocation";
import {
  Bell,
  Mail,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Send,
  Trash2,
  RefreshCw,
  Shield,
  Info,
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../apiConfig";

const PRESET_LIMITS = [
  { value: 50, label: "50 — Moderate", desc: "Alert for sensitive groups, elderly & children", badge: "Sensitive" },
  { value: 100, label: "100 — Unhealthy", desc: "Recommended standard threshold for general public", badge: "Standard" },
  { value: 150, label: "150 — Poor", desc: "High pollution advisory; mask suggested", badge: "Warning" },
  { value: 200, label: "200 — Hazardous", desc: "Severe emergency pollution warning", badge: "Danger" },
];

const AlertSettings = () => {
  const { user } = useAuth();
  const { location, getGPS } = useLocation();

  const [city, setCity] = useState("");
  const [threshold, setThreshold] = useState(100);
  const [customThreshold, setCustomThreshold] = useState("");
  const [enableEmail, setEnableEmail] = useState(true);
  const [enableBrowser, setEnableBrowser] = useState(true);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  const [loading, setLoading] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(true);
  const [testingAlert, setTestingAlert] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Initialize city from location hook or subscription
  useEffect(() => {
    if (location?.city && !city) {
      setCity(location.city);
    }
  }, [location?.city]);

  // Load existing alert settings from API and localStorage
  const loadAlertSettings = async () => {
    if (!user?.email) {
      setFetchingStatus(false);
      return;
    }

    setFetchingStatus(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/alerts/status?contact=${encodeURIComponent(user.email)}`
      );
      if (res.data?.subscription?.subscribed) {
        const sub = res.data.subscription;
        setCurrentSubscription(sub);
        if (sub.city) setCity(sub.city);
        if (sub.threshold) {
          setThreshold(sub.threshold);
          if (![50, 100, 150, 200].includes(sub.threshold)) {
            setCustomThreshold(sub.threshold.toString());
          }
        }
        setEnableEmail(true);
      } else {
        setCurrentSubscription(null);
      }
    } catch (err) {
      console.warn("Could not fetch remote alert subscription:", err);
    }

    // Also check local config
    try {
      const local = localStorage.getItem(`ecostride_notification_config_${user.email}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed.browserNotifications !== undefined) {
          setEnableBrowser(parsed.browserNotifications);
        }
        if (!city && parsed.city) setCity(parsed.city);
        if (parsed.threshold) setThreshold(parsed.threshold);
      }
    } catch (err) {
      console.error(err);
    }

    setFetchingStatus(false);
  };

  useEffect(() => {
    loadAlertSettings();
  }, [user?.email]);

  const handleCustomThresholdChange = (e) => {
    const val = e.target.value;
    setCustomThreshold(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setThreshold(parsed);
    }
  };

  const handleSavePreferences = async (e) => {
    e?.preventDefault();
    if (!user?.email) return;

    setLoading(true);
    setSaveStatus(null);
    setFeedback(null);

    const targetCity = city.trim() || location?.city || "Pune";
    const targetThreshold = Number(threshold) || 100;

    // Browser push notification permission request if checked
    if (enableBrowser && "Notification" in window) {
      try {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
          await Notification.requestPermission();
        }
      } catch (err) {
        console.warn("Notification permission request error:", err);
      }
    }

    try {
      let resultData = {};

      if (enableEmail) {
        const res = await axios.post(`${API_BASE_URL}/api/alerts/subscribe`, {
          contact: user.email,
          contact_type: "email",
          city: targetCity,
          lat: location?.lat || 18.5204,
          lon: location?.lon || 73.8567,
          threshold: targetThreshold,
        });
        resultData = res.data || {};
      } else {
        // Unsubscribe email alerts
        await axios.post(`${API_BASE_URL}/api/alerts/unsubscribe`, {
          contact: user.email,
        });
        resultData = {
          city: targetCity,
          threshold: targetThreshold,
          email_sent: false,
          email_status: "Email alerts disabled",
        };
      }

      // Save to localStorage
      localStorage.setItem(`ecostride_notification_seen_${user.email}`, "enabled");
      localStorage.setItem(
        `ecostride_notification_config_${user.email}`,
        JSON.stringify({
          email: user.email,
          city: targetCity,
          threshold: targetThreshold,
          browserNotifications: enableBrowser,
          emailNotifications: enableEmail,
          updatedAt: new Date().toISOString(),
        })
      );

      setSaveStatus("success");
      setFeedback(
        enableEmail
          ? `Alert preferences successfully saved! You will receive email alerts at ${user.email} whenever AQI in ${targetCity} exceeds ${targetThreshold}.`
          : `Preferences updated. Desktop notifications active for ${targetCity} (Limit: ${targetThreshold}).`
      );

      // Trigger desktop notification confirmation if enabled
      if (enableBrowser && "Notification" in window && Notification.permission === "granted") {
        new Notification(`✅ EcoStride AQI Alerts Saved`, {
          body: `Monitoring ${targetCity} for AQI > ${targetThreshold}.`,
          icon: "/favicon.ico",
        });
      }

      await loadAlertSettings();
    } catch (err) {
      console.error("Save alert error:", err);
      setSaveStatus("error");
      setFeedback(err.response?.data?.message || "Failed to save preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestAlert = async () => {
    if (!user?.email) return;
    setTestingAlert(true);
    setSaveStatus(null);
    setFeedback(null);

    const targetCity = city.trim() || location?.city || "Pune";

    try {
      const res = await axios.post(`${API_BASE_URL}/api/alerts/test`, {
        contact: user.email,
        city: targetCity,
      });

      if (enableBrowser && "Notification" in window && Notification.permission === "granted") {
        new Notification(`🧪 Test Alert — EcoStride`, {
          body: `Test notification sent for ${targetCity}. System is connected and functional!`,
          icon: "/favicon.ico",
        });
      }

      setSaveStatus("success");
      setFeedback(`Test alert sent to ${user.email}! Please check your inbox and spam folder.`);
    } catch (err) {
      console.error("Test alert error:", err);
      setSaveStatus("error");
      setFeedback(
        err.response?.data?.message ||
          "Test alert failed to send. Please check your network or SMTP configuration."
      );
    } finally {
      setTestingAlert(false);
    }
  };

  const handleUnsubscribeAll = async () => {
    if (!window.confirm("Are you sure you want to disable all AQI alerts for your account?")) {
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/alerts/unsubscribe`, {
        contact: user.email,
      });

      setEnableEmail(false);
      setEnableBrowser(false);
      localStorage.setItem(`ecostride_notification_seen_${user.email}`, "disabled");

      setSaveStatus("success");
      setFeedback("You have been unsubscribed from all AQI alerts.");
      await loadAlertSettings();
    } catch (err) {
      setSaveStatus("error");
      setFeedback(err.response?.data?.message || "Failed to unsubscribe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "var(--accent-dim, rgba(0, 229, 160, 0.12))",
              border: "1px solid rgba(0, 229, 160, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent, #00e5a0)",
            }}
          >
            <Bell size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.75rem", margin: 0, fontWeight: 700 }}>
              AQI Alert & Notification Settings
            </h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary, #7a9ba8)", fontSize: "0.9rem" }}>
              Configure customized real-time air quality warnings and threshold triggers.
            </p>
          </div>
        </div>
      </div>

      {/* Subscription Status Card */}
      <div
        className="card"
        style={{
          padding: "20px 24px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          background: currentSubscription?.subscribed
            ? "linear-gradient(135deg, rgba(0, 229, 160, 0.08), rgba(0, 229, 160, 0.02))"
            : "var(--bg-card, #111b1e)",
          border: `1px solid ${currentSubscription?.subscribed ? "rgba(0, 229, 160, 0.3)" : "var(--border, rgba(255, 255, 255, 0.06))"}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: currentSubscription?.subscribed ? "rgba(0, 229, 160, 0.15)" : "rgba(255, 255, 255, 0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: currentSubscription?.subscribed ? "var(--accent, #00e5a0)" : "var(--text-muted, #718096)",
            }}
          >
            {currentSubscription?.subscribed ? <CheckCircle2 size={26} /> : <Bell size={24} />}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.05rem", fontWeight: 600 }}>
                {currentSubscription?.subscribed ? "Active Monitoring" : "Alerts Inactive"}
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontWeight: 600,
                  backgroundColor: currentSubscription?.subscribed ? "rgba(0, 229, 160, 0.15)" : "rgba(255, 255, 255, 0.08)",
                  color: currentSubscription?.subscribed ? "var(--accent, #00e5a0)" : "var(--text-muted)",
                }}
              >
                {currentSubscription?.subscribed ? "SUBSCRIBED" : "NOT CONFIGURED"}
              </span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              {currentSubscription?.subscribed ? (
                <>
                  Tracking <strong>{currentSubscription.city}</strong> • Trigger when AQI &gt; <strong>{currentSubscription.threshold}</strong> • Verified account: <strong>{user?.email}</strong>
                </>
              ) : (
                "Set your monitored city and AQI threshold below to start receiving timely notifications."
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={loadAlertSettings}
            disabled={fetchingStatus}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              padding: "8px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <RefreshCw size={14} className={fetchingStatus ? "spin" : ""} />
            <span>Refresh</span>
          </button>
          {currentSubscription?.subscribed && (
            <button
              type="button"
              onClick={handleUnsubscribeAll}
              disabled={loading}
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                padding: "8px 14px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Trash2 size={14} />
              <span>Disable Alerts</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Feedback Notification */}
      {feedback && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "8px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            backgroundColor: saveStatus === "success" ? "rgba(0, 229, 160, 0.1)" : "rgba(239, 68, 68, 0.1)",
            border: `1px solid ${saveStatus === "success" ? "rgba(0, 229, 160, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            color: saveStatus === "success" ? "var(--accent, #00e5a0)" : "#f87171",
            fontSize: "0.88rem",
          }}
        >
          {saveStatus === "success" ? (
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
          ) : (
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
          )}
          <div style={{ flex: 1 }}>{feedback}</div>
        </div>
      )}

      {/* Main Form Settings */}
      <form onSubmit={handleSavePreferences}>
        <div className="card" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
            <MapPin size={18} color="var(--accent, #00e5a0)" />
            <span>Monitored Location & Account</span>
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>
            {/* Account Email (Read-only) */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Target Notification Email
              </label>
              <input
                type="email"
                value={user?.email || ""}
                readOnly
                className="input"
                style={{
                  width: "100%",
                  cursor: "not-allowed",
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  color: "var(--text-secondary)",
                }}
              />
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Linked to your Google authenticated account
              </span>
            </div>

            {/* Target City */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Monitored City
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
                  <span>Use Live GPS</span>
                </button>
              </div>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Pune, Mumbai, Delhi"
                required
                className="input"
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                City or region to continuously check for air quality spikes
              </span>
            </div>
          </div>
        </div>

        {/* AQI Threshold Selection */}
        <div className="card" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Sliders size={18} color="var(--accent, #00e5a0)" />
            <span>AQI Alert Threshold</span>
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "18px" }}>
            An alert will trigger immediately whenever the live AQI crosses this limit.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "16px" }}>
            {PRESET_LIMITS.map((preset) => {
              const isSelected = threshold === preset.value && !customThreshold;
              return (
                <div
                  key={preset.value}
                  onClick={() => {
                    setThreshold(preset.value);
                    setCustomThreshold("");
                  }}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "10px",
                    border: `1px solid ${isSelected ? "var(--accent, #00e5a0)" : "var(--border, rgba(255,255,255,0.06))"}`,
                    backgroundColor: isSelected ? "rgba(0, 229, 160, 0.08)" : "rgba(255, 255, 255, 0.02)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.95rem", fontWeight: 600, color: isSelected ? "var(--accent, #00e5a0)" : "var(--text-primary)" }}>
                      AQI &gt; {preset.value}
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: isSelected ? "rgba(0, 229, 160, 0.2)" : "rgba(255,255,255,0.05)",
                        color: isSelected ? "var(--accent, #00e5a0)" : "var(--text-muted)",
                      }}
                    >
                      {preset.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.3" }}>
                    {preset.desc}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Threshold Input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              Or specify a custom AQI threshold:
            </span>
            <input
              type="number"
              min="10"
              max="500"
              placeholder="e.g. 75"
              value={customThreshold}
              onChange={handleCustomThresholdChange}
              className="input"
              style={{ width: "120px", height: "36px", fontSize: "0.85rem" }}
            />
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Current selected limit: <strong style={{ color: "var(--accent, #00e5a0)" }}>AQI &gt; {threshold}</strong>
            </span>
          </div>
        </div>

        {/* Notification Channels Selection */}
        <div className="card" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Mail size={18} color="var(--accent, #00e5a0)" />
            <span>Delivery Channels</span>
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "18px" }}>
            Select how you would like to be alerted when air pollution exceeds your limit.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Email Alerts Toggle Card */}
            <div
              onClick={() => setEnableEmail(!enableEmail)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "14px 18px",
                borderRadius: "10px",
                border: `1px solid ${enableEmail ? "rgba(0, 229, 160, 0.4)" : "var(--border, rgba(255, 255, 255, 0.06))"}`,
                backgroundColor: enableEmail ? "rgba(0, 229, 160, 0.05)" : "rgba(255, 255, 255, 0.02)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <input
                type="checkbox"
                checked={enableEmail}
                onChange={(e) => {
                  e.stopPropagation();
                  setEnableEmail(e.target.checked);
                }}
                style={{
                  width: "18px",
                  height: "18px",
                  minWidth: "18px",
                  cursor: "pointer",
                  accentColor: "var(--accent, #00e5a0)",
                  margin: 0,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: "0.92rem", fontWeight: 500, color: "var(--text-primary)" }}>
                  Verified Email Notifications
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Instant health advisories and pollution warnings sent to{" "}
                  <strong style={{ color: "var(--accent, #00e5a0)" }}>{user?.email}</strong>
                </div>
              </div>
            </div>

            {/* Desktop Push Toggle Card */}
            <div
              onClick={() => setEnableBrowser(!enableBrowser)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "14px 18px",
                borderRadius: "10px",
                border: `1px solid ${enableBrowser ? "rgba(0, 229, 160, 0.4)" : "var(--border, rgba(255, 255, 255, 0.06))"}`,
                backgroundColor: enableBrowser ? "rgba(0, 229, 160, 0.05)" : "rgba(255, 255, 255, 0.02)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <input
                type="checkbox"
                checked={enableBrowser}
                onChange={(e) => {
                  e.stopPropagation();
                  setEnableBrowser(e.target.checked);
                }}
                style={{
                  width: "18px",
                  height: "18px",
                  minWidth: "18px",
                  cursor: "pointer",
                  accentColor: "var(--accent, #00e5a0)",
                  margin: 0,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: "0.92rem", fontWeight: 500, color: "var(--text-primary)" }}>
                  Desktop Push Notifications
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Real-time system tray / browser popup banner on this device
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <button
            type="button"
            onClick={handleTestAlert}
            disabled={testingAlert || loading}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              color: "var(--text-primary)",
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Send size={15} />
            <span>{testingAlert ? "Sending Test..." : "Send Test Notification"}</span>
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              padding: "12px 28px",
              fontSize: "0.9rem",
              borderRadius: "8px",
              fontWeight: 600,
            }}
          >
            {loading ? "Saving Preferences..." : "Save Notification Preferences"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AlertSettings;
