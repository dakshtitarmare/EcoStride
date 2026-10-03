import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../apiConfig";
import {
  ArrowRight,
  CalendarDays,
  Filter,
  MapPin,
  Plus,
  Sparkles,
  Trees,
  Users,
} from "lucide-react";

const DRIVE_CATEGORIES = ["All", "Cleanup", "Tree Planting", "Awareness", "Other"];

const EcoDrives = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrives();
  }, []);

  const fetchDrives = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/events?status=upcoming`);
      if (res.data.status === "success") {
        setDrives(res.data.events || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDrives = useMemo(() => {
    if (selectedCategory === "All") return drives;
    return drives.filter((drive) => drive.category === selectedCategory || drive.type === selectedCategory);
  }, [selectedCategory, drives]);

  const featuredDrive = filteredDrives[0] || drives[0];

  return (
    <div className="grid grid-cols-12" style={{ gap: "24px" }}>
      <div className="col-span-12 card" style={{ padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--accent)", fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              <Sparkles size={16} /> Eco Drives
            </div>
            <h1 style={{ margin: "10px 0 6px", fontSize: "2rem" }}>Volunteer for city-wide environmental action</h1>
            <p style={{ margin: 0, color: "var(--text-muted)", maxWidth: 740 }}>
              Join local cleanup initiatives, tree planting, and awareness programs focused on cleaner air,
              greener neighborhoods, and stronger community action.
            </p>
          </div>

          <button className="btn btn-primary" type="button" style={{ whiteSpace: "nowrap" }} onClick={() => navigate('/dashboard/organizer')}>
            <Plus size={16} /> Organizer Portal
          </button>
        </div>
      </div>

      <div className="col-span-8 card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 18 }}>
            <Filter size={18} /> Browse drives
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {DRIVE_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={selectedCategory === category ? "btn btn-primary" : "btn btn-secondary"}
                onClick={() => setSelectedCategory(category)}
                style={{ padding: "8px 12px", fontSize: 13 }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div>Loading drives...</div>
        ) : filteredDrives.length === 0 ? (
          <div className="text-muted">No drives found in this category.</div>
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            {filteredDrives.map((drive) => (
              <article
                key={drive.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 18,
                  padding: 18,
                  background: "linear-gradient(135deg, rgba(255,255,255,0.02), rgba(56,189,248,0.05))",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--accent)", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      <Trees size={14} /> {drive.type}
                    </div>
                    <h3 style={{ margin: "10px 0 8px", fontSize: "1.3rem" }}>{drive.title}</h3>
                  </div>
                  <span
                    style={{
                      borderRadius: 999,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                      border: `1px solid var(--accent)`,
                      color: "var(--accent)",
                      background: `rgba(56,189,248,0.1)`,
                    }}
                  >
                    {drive.status}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", color: "var(--text-secondary)", fontSize: 14, marginBottom: 12 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><MapPin size={14} /> {drive.location?.name || drive.location?.address}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><CalendarDays size={14} /> {drive.date}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Users size={14} /> {drive.participantCount || 0} volunteers</span>
                </div>

                <p style={{ color: "var(--text-muted)", margin: "0 0 16px" }}>{drive.motive}</p>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                    {drive.startTime} - {drive.endTime}
                  </div>
                  <button className="btn btn-primary" type="button" onClick={() => navigate(`/dashboard/eco-drives/${drive.id}`)}>
                    View Details <ArrowRight size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="col-span-4 card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Featured drive</h2>
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>Trending</span>
        </div>

        {featuredDrive ? (
          <>
            <div style={{ borderRadius: 18, background: "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(56,189,248,0.1))", padding: 20 }}>
              <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                {featuredDrive.type}
              </div>
              <h3 style={{ margin: "10px 0" }}>{featuredDrive.title}</h3>
              <p style={{ color: "var(--text-secondary)", margin: "0 0 14px" }}>{featuredDrive.motive}</p>

              <div style={{ display: "grid", gap: 10, color: "var(--text-primary)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Location</span><strong>{featuredDrive.location?.name || featuredDrive.location?.address}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Date</span><strong>{featuredDrive.date}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Volunteers</span><strong>{featuredDrive.participantCount || 0}</strong></div>
              </div>
            </div>

            <button className="btn btn-secondary" type="button" style={{ marginTop: 18, width: "100%" }} onClick={() => navigate(`/dashboard/eco-drives/${featuredDrive.id}`)}>
              View event details
            </button>
          </>
        ) : (
          <div className="text-muted">No featured drives.</div>
        )}
      </div>
    </div>
  );
};

export default EcoDrives;
