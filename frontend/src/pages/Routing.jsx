import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useLocation } from "../hooks/useLocation";
import { useAuth } from "../context/AuthContext";
import MapWidget from "../components/MapWidget";
import { API_BASE_URL } from "../apiConfig";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ─────────────────────────────────────────────────────────────────
// Search for place suggestions via Nominatim (restricted to India)
async function searchPlaces(query) {
  if (!query || query.length < 3) return [];
  try {
    const res = await axios.get(`${API_BASE_URL}/api/places/search`, {
      params: { q: query },
      timeout: 7000,
    });
    return res.data.places || [];
  } catch (e) {
    console.error("Suggestion error:", e);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
const Routing = () => {
  const { location } = useLocation();
  const { idToken, user } = useAuth();
  const [start, setStart] = useState("");
  const [vehicleType, setVehicleType] = useState("petrol_car");
  const [advancedBlocked, setAdvancedBlocked] = useState(false);
  const [usageRemaining, setUsageRemaining] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [end, setEnd] = useState("");
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [suggestions, setSuggestions] = useState({ start: [], end: [] });
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const isNavigating = false; // Kept as constant for MapWidget compat
  const [userPos, setUserPos] = useState(null);
  const [travelMode, setTravelMode] = useState("driving");
  const hasCalculated = useRef(false);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") setMapFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ── Suggestion debounce refs (one timer + one abort controller per field) ──
  const suggestTimers = useRef({ start: null, end: null });
  const suggestAborts = useRef({ start: null, end: null });
  const suggestRequestIds = useRef({ start: 0, end: 0 });

  const fetchSuggestions = useCallback((val, type) => {
    const requestId = ++suggestRequestIds.current[type];

    // Clear any pending timer for this field
    if (suggestTimers.current[type]) {
      clearTimeout(suggestTimers.current[type]);
    }
    // Abort any in-flight request for this field
    if (suggestAborts.current[type]) {
      suggestAborts.current[type].abort();
    }

    if (!val || val.length < 3) {
      setSuggestions((prev) => ({ ...prev, [type]: [] }));
      return;
    }

    // Debounce: wait 350ms after the user stops typing
    suggestTimers.current[type] = setTimeout(async () => {
      const controller = new AbortController();
      suggestAborts.current[type] = controller;
      try {
        const response = await axios.get(`${API_BASE_URL}/api/places/search`, {
          params: { q: val },
          timeout: 7000,
          signal: controller.signal,
        });
        if (requestId !== suggestRequestIds.current[type]) return;
        const results = response.data.places || [];
        setSuggestions((prev) => ({ ...prev, [type]: results }));
      } catch (e) {
        const wasCancelled = e.name === "AbortError" || axios.isCancel(e);
        if (!wasCancelled && requestId === suggestRequestIds.current[type]) {
          console.error("Suggestion error:", e);
          setSuggestions((prev) => ({ ...prev, [type]: [] }));
        }
        // AbortError is expected when a new keystroke cancels the old request — ignore it
      }
    }, 350);
  }, []);

  // ── Main route calculation via Backend API ─────────────────────
  const calculateRoute = useCallback(
    async (e) => {
      e?.preventDefault();

      const startVal = start.trim();
      const endVal = end.trim();

      if (!startVal || !endVal) {
        alert("Please enter both starting point and destination.");
        return;
      }

      if (startVal === "My Location" && !userPos) {
        alert("Could not retrieve your location. Please check GPS settings.");
        return;
      }
      if (endVal === "My Location" && !userPos) {
        alert("Could not retrieve your location based destination.");
        return;
      }

      setLoading(true);
      setLoadingMsg("Resolving locations…");
      setRoutes([]);
      setSelectedRoute(null);
      setSuggestions({ start: [], end: [] });

      try {
        // Auto-geocode if user typed a name without selecting from dropdown
        let resolvedStartCoords = startCoords;
        let resolvedEndCoords = endCoords;

        if (startVal !== "My Location" && !resolvedStartCoords) {
          const results = await searchPlaces(startVal);
          if (results.length > 0) {
            resolvedStartCoords = { lat: results[0].lat, lon: results[0].lon };
            setStartCoords(resolvedStartCoords);
          }
        }

        if (endVal !== "My Location" && !resolvedEndCoords) {
          const results = await searchPlaces(endVal);
          if (results.length > 0) {
            resolvedEndCoords = { lat: results[0].lat, lon: results[0].lon };
            setEndCoords(resolvedEndCoords);
          }
        }

        setLoadingMsg("Calculating dynamic safe paths…");

        const payload = {
          start_name: startVal,
          end_name: endVal,
          mode: travelMode,
      vehicleType,
      idToken,
      user,
          city: location.city,
          vehicle_type: vehicleType,
        };

        // If choosing "My Location", send coordinates directly
        if (startVal === "My Location" && userPos) {
          payload.start_lat = userPos.lat;
          payload.start_lon = userPos.lon;
        } else if (resolvedStartCoords) {
          payload.start_lat = resolvedStartCoords.lat;
          payload.start_lon = resolvedStartCoords.lon;
        }

        if (endVal === "My Location" && userPos) {
          payload.end_lat = userPos.lat;
          payload.end_lon = userPos.lon;
        } else if (resolvedEndCoords) {
          payload.end_lat = resolvedEndCoords.lat;
          payload.end_lon = resolvedEndCoords.lon;
        }

        // Explicitly attach current GPS if available as base lat/lon for city detection fallback
        if (userPos) {
          payload.lat = userPos.lat;
          payload.lon = userPos.lon;
        }

        const headers = {};
        if (idToken) headers.Authorization = `Bearer ${idToken}`;
        const res = await axios.post(
          `${API_BASE_URL}/api/route/calculate`,
          payload,
          { headers }
        );
        if (
          res.data.status === "success" &&
          res.data.routes &&
          res.data.routes.length > 0
        ) {
          const fetchedRoutes = res.data.routes;
          setRoutes(fetchedRoutes);
          if (res.data.advanced_analysis_blocked) {
             setAdvancedBlocked(true);
             if (!user) setShowUpgradeModal(true); // If not logged in, prompt to log in or upgrade
             else setShowUpgradeModal(true);
          } else {
             setAdvancedBlocked(false);
             setUsageRemaining(res.data.usage_remaining);
          }
          // Default to Cleanest route (lowest AQI); backend sorts ascending so routes[0] is cleanest
          const cleanest =
            fetchedRoutes.find((r) => r.type === "cleanest") ||
            [...fetchedRoutes].sort(
              (a, b) => a.aqi_exposure_score - b.aqi_exposure_score,
            )[0];
          setSelectedRoute(cleanest);
        } else {
          alert(
            res.data.message || "No safe routes found between these locations.",
          );
        }
      } catch (err) {
        console.error("Routing error:", err);
        alert("Could not connect to routing service. Please try again.");
      } finally {
        setLoading(false);
        setLoadingMsg("");
      }
    },
    [
      start,
      end,
      travelMode,
      vehicleType,
      idToken,
      user,
      userPos,
      startCoords,
      endCoords,
      location.lat,
      location.lon,
      location.city,
    ],
  );

  // ── GPS watch ──────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => {
        console.warn("GPS error:", err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const useMyLocation = () => {
    if (userPos) setStart("My Location");
    else alert("GPS not yet available. Please allow location access.");
  };

  const centerLat = location.lat || userPos?.lat || 20.9343;
  const centerLon = location.lon || userPos?.lon || 77.7489;

  return (
    <div className="routing-layout">
      {/* ── Left Panel ──────────────────────────────────── */}
      <div
        className="routing-routes-panel card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          overflowY: "auto",
          padding: "20px",
          position: "relative",
        }}
      >
        <div>
          <h2 style={{ marginBottom: "2px" }}>🗺️ Eco-Route Planner</h2>
          <p className="text-muted" style={{ fontSize: "0.82rem" }}>
            Plan dynamic, healthy paths anywhere in India.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={calculateRoute}
          style={{ display: "flex", flexDirection: "column", gap: "10px" }}
        >
          {/* Start */}
          <div style={{ position: "relative" }}>
            <label
              style={{
                fontSize: "0.78rem",
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Starting Point
            </label>
            <input
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                setStartCoords(null);
                fetchSuggestions(e.target.value, "start");
              }}
              onFocus={() => fetchSuggestions(start, "start")}
              placeholder="e.g. Bandra, Mumbai or Tech Park"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
            <button
              type="button"
              onClick={useMyLocation}
              style={{
                position: "absolute",
                right: "8px",
                top: "28px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1.2rem",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#34A853">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5z" />
              </svg>
            </button>
            {suggestions.start.length > 0 && (
              <div className="suggestions-box">
                {suggestions.start.map((s, i) => (
                  <div
                    key={i}
                    className="suggestion-item"
                    onClick={() => {
                      setStart(s.name);
                      setStartCoords({ lat: s.lat, lon: s.lon });
                      setSuggestions((p) => ({ ...p, start: [] }));
                    }}
                  >
                    {s.display}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* End */}
          <div style={{ position: "relative" }}>
            <label
              style={{
                fontSize: "0.78rem",
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Destination
            </label>
            <input
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                setEndCoords(null);
                fetchSuggestions(e.target.value, "end");
              }}
              onFocus={() => fetchSuggestions(end, "end")}
              placeholder="e.g. Viman Nagar, Pune or MG Road"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
            {suggestions.end.length > 0 && (
              <div className="suggestions-box">
                {suggestions.end.map((s, i) => (
                  <div
                    key={i}
                    className="suggestion-item"
                    onClick={() => {
                      setEnd(s.name);
                      setEndCoords({ lat: s.lat, lon: s.lon });
                      setSuggestions((p) => ({ ...p, end: [] }));
                    }}
                  >
                    {s.display}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Travel Mode & Vehicle */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                Mode
              </label>
              <select
                value={travelMode}
                onChange={(e) => {
                  setTravelMode(e.target.value);
                  if (e.target.value !== 'driving') setVehicleType('none');
                  else setVehicleType('petrol_car');
                }}
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderRadius: "8px", fontSize: "0.9rem" }}
              >
                <option value="driving">Driving</option>
                <option value="foot">Walking/Jogging</option>
              </select>
            </div>
            
            {travelMode === 'driving' && (
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                  Vehicle
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderRadius: "8px", fontSize: "0.9rem" }}
                >
                  <option value="petrol_car">Petrol Car</option>
                  <option value="diesel_car">Diesel Car</option>
                  <option value="petrol_bike">Petrol Bike</option>
                  <option value="ev">Electric Vehicle</option>
                </select>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ padding: "12px" }}
          >
            {loading
              ? `🔄 ${loadingMsg || "Calculating…"}`
              : "🔍 Find Safe Paths"}
          </button>
        </form>

        {/* Route cards */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "9px",
            marginTop: "10px",
          }}
        >
          {routes.map((r, idx) => {
            const isSelected = selectedRoute?.type === r.type;
            return (
              <div
                key={idx}
                onClick={() => setSelectedRoute(r)}
                style={{
                  cursor: "pointer",
                  borderRadius: "12px",
                  border: `2px solid ${isSelected ? r.color : "transparent"}`,
                  background: isSelected
                    ? `rgba(${hexToRgb(r.color)}, 0.1)`
                    : "var(--bg-tertiary)",
                  padding: "12px",
                  borderLeft: `5px solid ${r.color}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <strong
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {r.label}
                  </strong>
                  <span style={{ color: r.color, fontWeight: "bold" }}>
                    AQI {r.aqi_exposure_score}
                  </span>
                </div>
                <div
                  style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
                >
                  {r.distance_km} km • {r.duration_min} min
                </div>
                {r.via && (
                  <div style={{ fontSize: "0.75rem", marginTop: "5px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ opacity: 0.6 }}>📍 Via</span>
                    <span style={{ color: r.color, fontWeight: "500" }}>{r.via}</span>
                  </div>
                )}
                <div style={{ fontSize: "0.72rem", marginTop: "6px", fontStyle: "italic", opacity: 0.8 }}>
                  {r.safety_reason}
                </div>
                
                {/* Journey Cost & Impact Section */}
                {!advancedBlocked && r.tradeoff && (
                   <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: r.cost ? '1fr 1fr' : '1fr 1fr', gap: '8px', fontSize: '0.75rem' }}>
                      {r.cost && (
                        <>
                          <div style={{ color: 'var(--text-secondary)' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.7, marginBottom: '2px' }}>EST. COST</div>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.9rem' }}>₹{r.cost.estimated}</div>
                            {r.tradeoff.costDifference > 0 ? <span style={{ color: '#F44336', fontSize: '0.7rem' }}>+₹{r.tradeoff.costDifference}</span> : <span style={{ color: '#00C853', fontSize: '0.7rem' }}>Cheapest</span>}
                          </div>
                          
                          <div style={{ color: 'var(--text-secondary)' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.7, marginBottom: '2px' }}>{r.cost.vehicleName.toUpperCase()}</div>
                            <div style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{r.cost.energyUsed} {r.cost.energyUnit}</div>
                            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Estimated Usage</span>
                          </div>
                        </>
                      )}

                      <div style={{ color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.7, marginBottom: '2px' }}>TIME</div>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{r.duration_min} min</div>
                        {r.tradeoff.timeDifferenceMinutes > 0 ? <span style={{ color: '#FF9800', fontSize: '0.7rem' }}>+{r.tradeoff.timeDifferenceMinutes} min</span> : <span style={{ color: '#00BCD4', fontSize: '0.7rem' }}>Fastest</span>}
                      </div>
{/*                       
                      <div style={{ color: 'var(--text-secondary)' }}>
                      
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.7, marginBottom: '2px' }}>POLLUTION EXP.</div>
                      
                        <div style={{ fontWeight: 'bold', color: r.impact.pollutionLevel === 'LOW' ? '#00C853' : (r.impact.pollutionLevel === 'MODERATE' ? '#FF9800' : '#F44336'), fontSize: '0.85rem' }}>{r.impact.pollutionLevel}</div>
                        {r.tradeoff.pollutionDifference > 0 ? <span style={{ color: '#F44336', fontSize: '0.7rem' }}>+{r.tradeoff.pollutionDifference} AQI</span> : <span style={{ color: '#00C853', fontSize: '0.7rem' }}>Cleanest</span>}
                      </div> */}
                   </div>
                )}

              </div>
            );
          })}
        
        {/* Route Trade-off Comparison */}
        {routes.length > 0 && !advancedBlocked && (
          <div className="card" style={{ marginTop: '10px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
             <h3 style={{ fontSize: '0.9rem', marginBottom: '12px', marginTop: 0 }}>Route Trade-off</h3>
             <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
               Every route has a trade-off. EcoStride shows you the impact of your choice.
               <br/><br/>
               <i>Usage remaining: {usageRemaining} / 5</i>
             </p>
             <div style={{ overflowX: 'auto' }}>
               <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                 <thead>
                   <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                     <th style={{ padding: '6px' }}>Type</th>
                     <th style={{ padding: '6px' }}>Time</th>
                     {routes[0].cost && <th style={{ padding: '6px' }}>Cost</th>}
                     <th style={{ padding: '6px' }}>AQI</th>
                   </tr>
                 </thead>
                 <tbody>
                   {routes.map((r, i) => (
                     <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                       <td style={{ padding: '8px 6px', fontWeight: 'bold', color: r.color }}>{r.label}</td>
                       <td style={{ padding: '8px 6px' }}>{r.duration_min}m</td>
                       {r.cost && <td style={{ padding: '8px 6px' }}>₹{r.cost.estimated}</td>}
                       <td style={{ padding: '8px 6px' }}>{r.aqi_exposure_score}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 99999, padding: '20px'
          }}>
             <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '24px', position: 'relative' }}>
                <button onClick={() => setShowUpgradeModal(false)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                <h2 style={{ marginTop: 0, color: 'var(--accent-cyan)' }}>Unlock Advanced EcoStride</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
                  You have reached your daily limit of 5 advanced route analyses on the <b>Free Plan</b>. Basic safe routing will continue to work!
                </p>
                
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '8px' }}>Premium Features</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li>Unlimited advanced analysis</li>
                    <li>Detailed journey analytics</li>
                    <li>Personalized route insights</li>
                  </ul>
                </div>
                
                <button className="btn-primary" style={{ width: '100%', padding: '12px', opacity: 0.6, cursor: 'not-allowed' }}>
                  Coming Soon
                </button>
                <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '12px', marginBottom: 0 }}>
                  Subscription infrastructure is planned for commercialization stage.
                </p>
             </div>
          </div>
        )}

        </div>
      </div>

      <div
        className="routing-map-panel"
        style={
          mapFullscreen
            ? {
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                zIndex: 9998,
                borderRadius: 0,
              }
            : {}
        }
        onClick={() => {
          // Only trigger expand on mobile and when not already fullscreen
          if (window.innerWidth <= 768 && !mapFullscreen) {
            setMapFullscreen(true);
          }
        }}
      >
        {/* Back button — mobile fullscreen only */}
        {mapFullscreen && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // prevent re-triggering map click
              setMapFullscreen(false);
            }}
            style={{
              position: "absolute",
              top: "14px",
              left: "14px",
              zIndex: 9999,
              background: "rgba(13, 21, 24, 0.9)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "8px",
              color: "#e8f0f2",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "0.82rem",
              padding: "8px 14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backdropFilter: "blur(8px)",
            }}
          >
            ← Back
          </button>
        )}

        {!mapFullscreen && (
          <div className="map-tap-hint">Tap map to expand</div>
        )}

        <MapWidget
          lat={centerLat}
          lon={centerLon}
          city={location.city || "Amravati"}
          route={selectedRoute}
          allRoutes={routes}
          onRouteSelect={(r) => setSelectedRoute(r)}
          startPin={selectedRoute?.start_location}
          endPin={selectedRoute?.end_location}
          userPos={userPos}
          isNavigating={isNavigating}
        />
      </div>

      <style>{`
        .suggestions-box { position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-secondary); border: 1px solid var(--border-subtle); z-index: 3000; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-height: min(280px, 38vh); overflow-y: auto; }
        .suggestion-item { min-height: 44px; display: flex; align-items: center; padding: 10px 12px; cursor: pointer; font-size: 0.85rem; border-bottom: 1px solid var(--border-subtle); }
        .suggestion-item:hover { background: var(--bg-tertiary); color: var(--accent-cyan); }
        input { background: var(--bg-tertiary); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 8px 12px; border-radius: 8px; font-size: 0.9rem; }
      `}</style>
    </div>
  );
};

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}`
    : "86,204,242";
}

export default Routing;
