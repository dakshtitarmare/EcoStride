import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../apiConfig';
import { ArrowLeft, Save, MapPin } from 'lucide-react';

const CreateEcoDrive = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { idToken } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: 'Cleanup',
    motive: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    locationName: '',
    address: '',
    lat: '',
    lon: ''
  });

  useEffect(() => {
    if (id) {
      fetchEvent();
    }
  }, [id]);

  const fetchEvent = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/organizer/events/${id}`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      const ev = res.data.event;
      setForm({
        title: ev.title || '',
        type: ev.type || 'Cleanup',
        motive: ev.motive || '',
        description: ev.description || '',
        date: ev.date || '',
        startTime: ev.startTime || '',
        endTime: ev.endTime || '',
        locationName: ev.location?.name || '',
        address: ev.location?.address || '',
        lat: ev.location?.lat || '',
        lon: ev.location?.lon || ''
      });
    } catch (err) {
      alert('Failed to fetch event');
      navigate(-1);
    }
  };

  
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm(f => ({
          ...f,
          lat: position.coords.latitude.toFixed(6),
          lon: position.coords.longitude.toFixed(6)
        }));
      },
      (error) => {
        alert('Unable to retrieve your location');
      }
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Auto geocode if lat/lon is empty for demo purpose
    let payload = { ...form };
    if (!payload.lat || !payload.lon) {
      payload.lat = 18.5204;
      payload.lon = 73.8567;
    }

    try {
      if (id) {
        await axios.put(`${API_BASE_URL}/api/organizer/events/${id}`, payload, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/organizer/events`, payload, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
      }
      navigate('/dashboard/organizer');
    } catch (err) {
      alert('Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
        <ArrowLeft size={16} /> Back
      </button>
      
      <h2>{id ? 'Edit' : 'Create'} Environmental Drive</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Drive Name</label>
          <input required type="text" name="title" value={form.title} onChange={handleChange} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }} />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Activity Type</label>
          <select name="type" value={form.type} onChange={handleChange} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <option value="Cleanup">Cleanup</option>
            <option value="Tree Planting">Tree Planting</option>
            <option value="Awareness">Awareness</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Date</label>
            <input required type="date" name="date" value={form.date} onChange={handleChange} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Start Time</label>
            <input required type="time" name="startTime" value={form.startTime} onChange={handleChange} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>End Time</label>
            <input required type="time" name="endTime" value={form.endTime} onChange={handleChange} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Location Name (e.g., FC Road)</label>
          <input required type="text" name="locationName" value={form.locationName} onChange={handleChange} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }} />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h3 style={{ margin: 0, fontSize: 16 }}>Location Coordinates</h3>
           <button type="button" onClick={handleGetLocation} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>
             <MapPin size={14} /> Get Current Location
           </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: '-8px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Latitude</label>
            <input type="number" step="any" name="lat" value={form.lat} onChange={handleChange} placeholder="e.g. 18.5204" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Longitude</label>
            <input type="number" step="any" name="lon" value={form.lon} onChange={handleChange} placeholder="e.g. 73.8567" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Motive</label>
          <input required type="text" name="motive" value={form.motive} onChange={handleChange} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }} />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Description</label>
          <textarea required name="description" value={form.description} onChange={handleChange} rows="4" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }} />
        </div>
        
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: 12 }}>
          {loading ? 'Saving...' : <><Save size={16} style={{ marginRight: 8 }} /> Save Drive</>}
        </button>
      </form>
    </div>
  );
};

export default CreateEcoDrive;
