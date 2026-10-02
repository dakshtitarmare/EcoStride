import React, { useState } from "react";
import { NavLink, useLocation as useRouterLocation, useNavigate } from "react-router-dom";
import { useLocation } from "../hooks/useLocation";
import { useAuth } from "../context/AuthContext";
import {
  CloudRain,
  LayoutDashboard,
  Route,
  Search,
  LogOut,
  User,
  Bell,
} from "lucide-react";
import axios from "axios";
import ThemeToggle from "./ThemeToggle";
import { NAV_ITEMS } from "../config/navigation";

const Sidebar = () => {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const { location, setManualLocation, getGPS } = useLocation();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(null);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length > 1) {
      try {
        const res = await axios.get(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query.trim())}, India&format=json&limit=6`,
          { headers: { "Accept-Language": "en" } }
        );
        setSearchResults(res.data || []);
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

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleProfileSetup = () => {
    navigate("/profile-setup");
  };

  const handleOpenNotifications = () => {
    navigate("/dashboard/alerts");
    setShowUserMenu(false);
  };

  const exploreItems = NAV_ITEMS.filter(({ to }) => ["/dashboard/forecast", "/dashboard/policy", "/dashboard/safe-zones", "/dashboard/health-advisory"].includes(to));
  const moreItems = NAV_ITEMS.filter(({ to }) => ["/dashboard/compare", "/dashboard/community", "/dashboard/alerts"].includes(to));
  const isRouteActive = (to) => routerLocation.pathname === to || routerLocation.pathname.startsWith(`${to}/`);
  const isExploreActive = exploreItems.some(({ to }) => isRouteActive(to));
  const isMoreActive = moreItems.some(({ to }) => isRouteActive(to));

  const renderMobileMenu = (items, title) => (
    <div className="mobile-nav-sheet" role="dialog" aria-label={title}>
      <div className="mobile-nav-sheet-header">
        <strong>{title}</strong>
        <button type="button" onClick={() => setMobileMenu(null)} aria-label={`Close ${title}`}><span aria-hidden="true">×</span></button>
      </div>
      <div className="mobile-nav-sheet-grid">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={`mobile-sheet-link${isRouteActive(item.to) ? " active" : ""}`}
            onClick={() => setMobileMenu(null)}
          >
            {React.createElement(item.icon, { size: 20 })}
            <span>{item.label}</span>
            <small>{item.sub}</small>
          </NavLink>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <header className="mobile-app-header">
        <div className="mobile-app-brand"><span className="sidebar-brand-icon">🌿</span>Eco<span>Stride</span></div>
        <button
          type="button"
          className="mobile-profile-button"
          onClick={() => setShowUserMenu((value) => !value)}
          aria-label="Open profile menu"
          title={user?.name || "Profile"}
        >
          <span>{user?.name?.charAt(0)?.toUpperCase() || <User size={18} />}</span>
        </button>
        {showUserMenu && (
          <div className="mobile-profile-menu">
            <strong>{user?.name || "EcoStride profile"}</strong>
            {user?.email && <small>{user.email}</small>}
            <button type="button" onClick={handleProfileSetup}><User size={16} /> Edit Profile</button>
            <button type="button" onClick={handleOpenNotifications}><Bell size={16} /> Notification Settings</button>
            <button type="button" onClick={handleLogout}><LogOut size={16} /> Sign Out</button>
          </div>
        )}
      </header>

      {/* ── Desktop sidebar ── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🌿</div>
          Eco<span>Stride</span>
        </div>

        {/* User Profile Section */}
        {user && (
          <div className="sidebar-user-section">
            <button
              className="user-profile-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              title={user.name}
            >
              <div className="user-avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</div>
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </button>

            {showUserMenu && (
              <div className="user-dropdown-menu">
                <button
                  className="user-dropdown-item"
                  onClick={() => {
                    handleProfileSetup();
                    setShowUserMenu(false);
                  }}
                >
                  <User size={16} />
                  <span>Edit Profile</span>
                </button>
                <button
                  className="user-dropdown-item"
                  onClick={handleOpenNotifications}
                >
                  <Bell size={16} />
                  <span>Notification Settings</span>
                </button>
                <div className="user-dropdown-divider"></div>
                <button
                  className="user-dropdown-item logout"
                  onClick={() => {
                    handleLogout();
                    setShowUserMenu(false);
                  }}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
                <div className="user-dropdown-divider"></div>
                <div style={{ padding: "8px 12px", display: "flex", justifyContent: "center" }}>
                  <ThemeToggle style={{ width: "100%", padding: "6px" }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live strip */}
        <div className="sidebar-live-strip">
          <span className="live-dot" />
          <span className="live-label">LIVE</span>
          <span className="live-city">{location.city || "Locating…"}</span>
        </div>

        {/* City search */}
        <div className="sidebar-search-wrap">
          <Search size={15} className="sidebar-search-icon" />
          <input
            type="text"
            placeholder="Search city..."
            value={searchQuery}
            onChange={handleSearch}
            onKeyDown={handleKeyDown}
            className="sidebar-city-search"
            aria-label="Search city"
          />
          <button
            type="button"
            className="sidebar-gps-btn"
            onClick={getGPS}
            title="My Location"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#34A853">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5z" />
            </svg>
          </button>
          {searchResults.length > 0 && (
            <div className="sidebar-dropdown">
              {searchResults.map((res) => (
                <div
                  key={res.place_id}
                  className="sidebar-dropdown-item"
                  onClick={() => selectCity(res)}
                >
                  {res.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `nav-item${isActive ? " active" : ""}`
              }
            >
              {React.createElement(item.icon, { size: 17, className: "nav-item-icon" })}
              <span className="nav-item-text">
                <span className="nav-item-label">{item.label}</span>
                <span className="nav-item-sub">{item.sub}</span>
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {mobileMenu === "explore" && renderMobileMenu(exploreItems, "Explore EcoStride")}
      {mobileMenu === "more" && renderMobileMenu(moreItems, "More EcoStride tools")}

      <nav className="mobile-bottom-nav">
        <NavLink to="/dashboard" end className={({ isActive }) => `mobile-nav-item${isActive ? " active" : ""}`}>
          <LayoutDashboard size={19} />
          <span>Home</span>
        </NavLink>
        <button type="button" className={`mobile-nav-item mobile-nav-menu-button${mobileMenu === "explore" || isExploreActive ? " active" : ""}`} onClick={() => setMobileMenu(mobileMenu === "explore" ? null : "explore")}>
          <CloudRain size={19} />
          <span>Explore</span>
        </button>
        <NavLink to="/dashboard/routing" className={({ isActive }) => `mobile-nav-route${isActive ? " active" : ""}`}>
          <span className="mobile-nav-route-icon"><Route size={23} /></span>
          <span>Route</span>
        </NavLink>
        <button type="button" className={`mobile-nav-item mobile-nav-menu-button${mobileMenu === "more" || isMoreActive ? " active" : ""}`} onClick={() => setMobileMenu(mobileMenu === "more" ? null : "more")}>
          <span className="mobile-nav-more-dots" aria-hidden="true">•••</span>
          <span>More</span>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;
