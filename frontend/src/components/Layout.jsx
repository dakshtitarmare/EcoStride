import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationPromptModal from './NotificationPromptModal';
import { LocationProvider } from '../context/LocationContext';
import { useLocation } from "../hooks/useLocation";
import { Search, MapPin } from "lucide-react";
import axios from "axios";
import EcoChatbot from "./EcoChatbot";

const LayoutContent = () => {
  const { location, setManualLocation, getGPS } = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 2) {
      try {
        const res = await axios.get(
          `https://nominatim.openstreetmap.org/search?q=${query}, India&format=json&limit=5`
        );
        setSearchResults(res.data);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSearchResults([]);
    }
  };

  const selectCity = (city) => {
    const lat = parseFloat(city.lat);
    const lon = parseFloat(city.lon);
    const name = city.display_name.split(",")[0];
    setManualLocation(name, "India", lat, lon);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleKeyDown = async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults.length > 0) {
        selectCity(searchResults[0]);
      } else if (searchQuery.trim().length > 1) {
        try {
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery.trim())}, India&format=json&limit=1`,
            { headers: { "Accept-Language": "en" } }
          );
          if (res.data && res.data.length > 0) {
            selectCity(res.data[0]);
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  return (
    <div className="app-container">
      <NotificationPromptModal />
      <EcoChatbot />
      <Sidebar />
      <main className="main-content">
        {/* Mobile-only Search Bar */}
        <div className="mobile-search-bar">
          <div className="mobile-search-input-wrap">
            <Search size={16} className="sidebar-search-icon" style={{ left: '12px' }} />
            <input
              type="text"
              placeholder="Search city..."
              value={searchQuery}
              onChange={handleSearch}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="sidebar-gps-btn"
              onClick={getGPS}
              style={{ right: '12px' }}
            >
              <MapPin size={16} color="#34A853" />
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="mobile-search-dropdown">
              {searchResults.map((res) => (
                <div
                  key={res.place_id}
                  className="mobile-search-dropdown-item"
                  onClick={() => selectCity(res)}
                >
                  {res.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        <Outlet />
      </main>
    </div>
  );
};

const Layout = () => {
  return (
    <LocationProvider>
      <LayoutContent />
    </LocationProvider>
  );
};

export default Layout;
