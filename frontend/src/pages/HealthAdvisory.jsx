import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Activity, AlertTriangle, HeartPulse, RefreshCw, Send, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { API_BASE_URL } from '../apiConfig';
import '../styles/HealthAdvisory.css';

const getAqiColor = (aqi) => {
  if (aqi <= 50) return 'var(--aqi-good)';
  if (aqi <= 100) return 'var(--aqi-moderate)';
  if (aqi <= 150) return 'var(--aqi-sensitive)';
  return 'var(--aqi-unhealthy)';
};

const cleanGeminiText = (text = '') => text
  .replace(/\*\*(.*?)\*\*/g, '$1')
  .replace(/__(.*?)__/g, '$1')
  .replace(/^\s*\*\s?/gm, '• ')
  .replace(/\*([^*\n]+)\*/g, '$1')
  .replace(/^\s*#+\s?/gm, '')
  .replace(/`([^`]+)`/g, '$1')
  .trim();

const HealthAdvisory = () => {
  const { user } = useAuth();
  const { location } = useLocation();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi! Ask me about your current air quality, health risk, or outdoor activities.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const loadAdvisory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API_BASE_URL}/api/health/advisory`, {
        profile: {
          age: user?.age,
          conditions: (user?.medical_conditions || []).join(', '),
          activity: user?.activity_level || 'Moderate',
          allergies: user?.allergies || '',
          location: location.city,
          lat: location.lat,
          lon: location.lon
        }
      });
      setResult(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load your health advisory right now.');
    } finally {
      setLoading(false);
    }
  };

  const askHealthAdvisor = async (event) => {
    event.preventDefault();
    const message = question.trim();
    if (!message || chatLoading) return;
    setChatLoading(true);
    setQuestion('');
    setChatMessages((messages) => [...messages, { role: 'user', content: message }]);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/health/chat`, {
        message,
        history: chatMessages.slice(-8),
        profile: {
          age: user?.age,
          conditions: (user?.medical_conditions || []).join(', '),
          activity: user?.activity_level || 'Moderate',
          allergies: user?.allergies || '',
          location: location.city,
          lat: location.lat,
          lon: location.lon
        }
      });
      setChatMessages((messages) => [...messages, { role: 'assistant', content: response.data.answer }]);
    } catch (requestError) {
      setChatMessages((messages) => [...messages, {
        role: 'assistant',
        content: requestError.response?.data?.message || 'I could not answer right now. Please try again.'
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (!location.loading && user) loadAdvisory();
  }, [location.loading, location.city, location.lat, location.lon, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const aqi = result?.current_aqi ?? 0;
  const pollutants = result?.pollutants || {};
  const profileConditions = user?.medical_conditions?.length
    ? user.medical_conditions.join(', ')
    : 'None reported';

  return (
    <div className="health-advisory-page">
      <header className="health-advisory-header">
        <div>
          <div className="health-advisory-eyebrow"><HeartPulse size={15} /> PERSONALIZED HEALTH</div>
          <h1>Health Advisory</h1>
          <p>Live guidance for {location.city}, based on your profile and current air quality.</p>
        </div>
        <button className="health-refresh-button" onClick={loadAdvisory} disabled={loading} title="Refresh advisory">
          <RefreshCw size={16} className={loading ? 'health-spin' : ''} />
          Refresh
        </button>
      </header>

      {error && <div className="health-error"><AlertTriangle size={18} /> {error}</div>}

      {loading && !result ? (
        <div className="card health-loading">Preparing your live advisory...</div>
      ) : result && (
        <>
          <section className="health-summary-grid">
            <div className="card health-aqi-card">
              <span className="health-card-label">CURRENT AQI</span>
              <strong style={{ color: getAqiColor(aqi) }}>{aqi}</strong>
              <span className="health-aqi-category">{result.aqi_category || 'Current reading'}</span>
              <span className="health-location">{location.city}</span>
            </div>
            <div className="card health-risk-card">
              <span className="health-card-label">PERSONAL RISK</span>
              <div className="health-risk-value">
                <strong>{result.risk_assessment?.level || 'Unknown'}</strong>
                <span>{result.risk_assessment?.score ?? '--'} / 100</span>
              </div>
              <div className="health-risk-bar"><span style={{ width: `${Math.min(result.risk_assessment?.score || 0, 100)}%` }} /></div>
              <span className="health-location">Adjusted for your health profile</span>
            </div>
          </section>

          <section className="health-content-grid">
            <article className="card health-advice-card">
              <div className="health-section-title"><Sparkles size={17} /> AI Health Guidance</div>
              <div className="health-advice-text">{cleanGeminiText(result.advisory)}</div>
              <p className="health-disclaimer">This is general guidance, not a medical diagnosis. Contact a healthcare professional for personal medical advice.</p>
            </article>

            <aside className="health-side-column">
              <div className="card health-profile-card">
                <div className="health-section-title"><Activity size={17} /> Your Profile</div>
                <div className="health-profile-row"><span>Age</span><strong>{user?.age || 'Not set'}</strong></div>
                <div className="health-profile-row"><span>Activity</span><strong>{user?.activity_level || 'Not set'}</strong></div>
                <div className="health-profile-row"><span>Conditions</span><strong>{profileConditions}</strong></div>
              </div>
              <div className="card health-pollutants-card">
                <div className="health-section-title">Live pollutants</div>
                {Object.entries(pollutants).map(([key, value]) => (
                  <div className="health-pollutant-row" key={key}><span>{key.replace('_', '.').toUpperCase()}</span><strong>{value ?? '--'}</strong></div>
                ))}
              </div>
            </aside>
          </section>

          <article className="card health-chat-card">
            <div className="health-section-title"><HeartPulse size={17} /> Ask about your advice</div>
            <div className="health-chat-messages" aria-live="polite">
              {chatMessages.map((chatMessage, index) => (
                <div className={`health-chat-message ${chatMessage.role}`} key={`${chatMessage.role}-${index}`}>
                  <span className="health-chat-role">{chatMessage.role === 'user' ? 'You' : 'EcoStride'}</span>
                  <div>{cleanGeminiText(chatMessage.content)}</div>
                </div>
              ))}
              {chatLoading && (
                <div className="health-chat-message assistant">
                  <span className="health-chat-role">EcoStride</span>
                  <div className="health-thinking"><span /> <span /> <span /> <em>EcoStride is thinking...</em></div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form className="health-chat-form" onSubmit={askHealthAdvisor}>
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Can I exercise outside today?"
                aria-label="Ask the health advisor"
              />
              <button type="submit" disabled={chatLoading || !question.trim()} aria-label="Ask health advisor">
                <Send size={16} />
              </button>
            </form>
          </article>
        </>
      )}
    </div>
  );
};

export default HealthAdvisory;