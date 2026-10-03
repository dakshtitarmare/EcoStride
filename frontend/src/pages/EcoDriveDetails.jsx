import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../apiConfig';
import { MapPin, Calendar, Clock, User, ArrowLeft, Users } from 'lucide-react';

const EcoDriveDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, idToken } = useAuth();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinStatus, setJoinStatus] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    fetchEvent();
    if (idToken) checkJoinStatus();
  }, [id, idToken]);

  const fetchEvent = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/events/${id}`);
      setEvent(res.data.event);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkJoinStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/events/${id}/join-status`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      setJoinStatus(res.data.joined);
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoin = async () => {
    if (!idToken) {
      alert('Please log in to join the drive.');
      return;
    }
    setJoinLoading(true);
    try {
      if (joinStatus) {
        await axios.delete(`${API_BASE_URL}/api/events/${id}/join`, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        setJoinStatus(false);
        setEvent(e => ({ ...e, participantCount: Math.max(0, (e.participantCount || 0) - 1) }));
      } else {
        await axios.post(`${API_BASE_URL}/api/events/${id}/join`, {}, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        setJoinStatus(true);
        setEvent(e => ({ ...e, participantCount: (e.participantCount || 0) + 1 }));
      }
    } catch (err) {
      alert('Failed to process request');
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) return <div className="card">Loading...</div>;
  if (!event) return <div className="card">Event not found</div>;

  return (
    <div className="card" style={{ padding: '24px' }}>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
        <ArrowLeft size={16} /> Back
      </button>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', fontSize: 12 }}>
            {event.type}
          </span>
          <h1 style={{ margin: '8px 0 16px', fontSize: '2rem' }}>{event.title}</h1>
        </div>
        <span style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: 20, fontSize: 14 }}>
          {event.status}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24, padding: 16, background: 'var(--bg-surface)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={18} /> {event.date}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={18} /> {event.startTime} - {event.endTime}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={18} /> {event.location?.name || event.location?.address}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><User size={18} /> Org: {event.organizerName}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} /> {event.participantCount || 0} Joined</div>
      </div>

      <h3>Motive</h3>
      <p style={{ color: 'var(--text-secondary)' }}>{event.motive || 'No specific motive provided.'}</p>
      
      <h3>Description</h3>
      <p style={{ color: 'var(--text-secondary)' }}>{event.description || 'No description provided.'}</p>

      <div style={{ marginTop: 32 }}>
        <button 
          className={joinStatus ? 'btn btn-secondary' : 'btn btn-primary'} 
          onClick={handleJoin} 
          disabled={joinLoading || event.status === 'cancelled'}
          style={{ padding: '12px 24px', fontSize: 16 }}
        >
          {joinLoading ? 'Processing...' : joinStatus ? 'Cancel Request / Leave' : 'Request to Join'}
        </button>
      </div>
    </div>
  );
};
export default EcoDriveDetails;
