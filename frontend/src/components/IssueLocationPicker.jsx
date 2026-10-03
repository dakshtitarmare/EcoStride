import React, { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.divIcon({
  className: "issue-location-marker",
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#f97316;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const Recenter = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 0.5 });
  }, [map, position]);
  return null;
};

const IssueLocationPicker = ({ value, onChange }) => {
  const [locating, setLocating] = useState(false);
  const position = [value.lat, value.lon];

  const reverseGeocode = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18`,
        { headers: { "Accept-Language": "en", "User-Agent": "EcoStride/1.0" } },
      );
      const data = await response.json();
      return data.display_name || "";
    } catch {
      return "";
    }
  };

  const updatePosition = async (next) => {
    const address = await reverseGeocode(next[0], next[1]);
    onChange({ lat: next[0], lon: next[1], address });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        updatePosition([coords.latitude, coords.longitude]).finally(() => setLocating(false));
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  return (
    <div>
      <div style={{ height: 230, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
        <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <Recenter position={position} />
          <Marker
            position={position}
            icon={markerIcon}
            draggable
            eventHandlers={{ dragend: (event) => updatePosition(event.target.getLatLng().toArray()) }}
          />
        </MapContainer>
      </div>
      <button type="button" className="btn-secondary" onClick={useCurrentLocation} disabled={locating} style={{ marginTop: 8 }}>
        {locating ? "Locating..." : "Use Current Location"}
      </button>
      <div className="text-muted" style={{ fontSize: "0.75rem", marginTop: 6 }}>
        {position[0].toFixed(5)}, {position[1].toFixed(5)}
        {value.address ? ` · ${value.address}` : ""}
      </div>
    </div>
  );
};

export default IssueLocationPicker;
