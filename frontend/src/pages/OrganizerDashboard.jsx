import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../apiConfig';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';

const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const { user, idToken } = useAuth();
  
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (idToken) {
      checkAndFetch();
    }
  }, [idToken]);

  const checkAndFetch = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/organizer/events`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      setIsOrganizer(true);
      setEvents(res.data.events || []);
    } catch (err) {
      if (err.response?.status === 403) {
        setIsOrganizer(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/organizer/apply`, { type: 'individual' }, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      setIsOrganizer(true);
      checkAndFetch();
    } catch (err) {
      alert('Failed to apply');
    }
  };

  const cancelEvent = async (id) => {
    if(!window.confirm('Are you sure you want to cancel this event?')) return;
    try {
      await axios.post(`${API_BASE_URL}/api/organizer/events/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      checkAndFetch();
    } catch (err) {
      alert('Failed to cancel event');
    }
  };

  if (loading) return <div className="card">Loading Organizer Portal...</div>;

  if (!isOrganizer) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <h2>Become an Environmental Organizer</h2>
        <p className="text-muted">Host drives, track participants, and make a real impact.</p>
        <button className="btn btn-primary" onClick={handleApply} style={{ marginTop: 20 }}>
          Apply to be an Organizer
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>My Environmental Drives</h2>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard/organizer/create')}>
          <Plus size={16} /> Create Drive
        </button>
      </div>

      {events.length === 0 ? (
        <p className="text-muted">You have not created any drives yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {events.map(ev => (
            <div key={ev.id} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px' }}>{ev.title}</h3>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {ev.date} | {ev.status} | {ev.participantCount || 0} Participants
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => navigate(`/dashboard/organizer/edit/${ev.id}`)}>
                  <Edit2 size={14} />
                </button>
                <button className="btn btn-secondary" onClick={() => cancelEvent(ev.id)} disabled={ev.status === 'cancelled'}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default OrganizerDashboard;
