import requests
import json
import smtplib
import os
from email.mime.text import MIMEText
try:
    from config import GROQ_API_KEY, GEMINI_API_KEY, USE_LOCAL_LLM, DATABASE_PATH
except ImportError:
    import sys
    import os
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from config import GROQ_API_KEY, GEMINI_API_KEY, USE_LOCAL_LLM, DATABASE_PATH

class HealthAdvisor:
    def __init__(self):
        self.db_path = DATABASE_PATH
        
    def get_db_connection(self):
        import sqlite3
        return sqlite3.connect(self.db_path)
    
    def calculate_risk_score(self, current_aqi, profile):
        """
        Calculate personalized risk score out of 100.
        """
        base_risk = min(current_aqi / 300.0 * 50, 50)  # Max base risk 50 from purely AQI > 300
        
        multiplier = 1.0
        # Age factors
        age = profile.get("age", 30)
        if age < 12 or age > 65:
            multiplier += 0.5
            
        # Health conditions
        conditions = profile.get("conditions", "").lower()
        if any(c in conditions for c in ["asthma", "copd", "respiratory", "cardiovascular"]):
            multiplier += 1.5
        elif any(c in conditions for c in ["allergy", "diabetes"]):
            multiplier += 0.5
            
        # Activity level
        activity = profile.get("activity", "moderate").lower()
        if activity == "high" or activity == "outdoor":
            multiplier += 0.3
            
        final_risk = min(base_risk * multiplier, 100)
        
        level = "Low"
        if final_risk > 33: level = "Moderate"
        if final_risk > 66: level = "High"
        if final_risk > 85: level = "Severe"
            
        return {
            "score": round(final_risk, 1),
            "level": level,
            "multiplier_applied": round(multiplier, 2)
        }

    def generate_advisory(self, profile, current_aqi):
        """Routes to either local Ollama or Groq API based on config"""
        
        # Determine strict structure for system prompt
        prompt = f"""
        Current AQI: {current_aqi}
        User Age: {profile.get('age', 'Unknown')}
        Health Conditions: {profile.get('conditions', 'None reported')}
        Activity Level: {profile.get('activity', 'Moderate')}
        
        Provide a very brief personalized health advisory containing:
        1. Health risk level (Low/Moderate/High)
        2. Specific precautions
        3. Activity recommendations
        4. Indoor air quality tips
        Be concise, use bullet points.
        """
        
        if USE_LOCAL_LLM:
            return self._generate_ollama_advisory(prompt)
        elif GROQ_API_KEY and GROQ_API_KEY != "your_free_key_here":
            return self._generate_groq_advisory(prompt)
        else:
            return self._generate_fallback_advisory(profile, current_aqi)

    def answer_chat_question(self, question, context):
        """Answer a user question using the current application data."""
        prompt = f"""
You are EcoStride's in-app assistant. Answer the user's question using the live application data below.
Be concise, practical, and honest. Do not invent measurements or claim to have performed actions.
If the question is unrelated to EcoStride, briefly say you can help with air quality, health, routes,
safe zones, forecasts, policies, alerts, and community reports.

Current application data:
{json.dumps(context, indent=2, default=str)}

User question: {question}
"""

        if USE_LOCAL_LLM:
            return self._generate_ollama_advisory(prompt)
        if GROQ_API_KEY and GROQ_API_KEY != "your_free_key_here":
            groq_answer = self._generate_groq_chat(prompt)
            if groq_answer:
                return groq_answer
        if GEMINI_API_KEY and GEMINI_API_KEY != "your_api_key_here":
            gemini_answer = self._generate_gemini_chat(prompt)
            if gemini_answer:
                return gemini_answer

        return self._generate_fallback_chat(question, context)

    def _generate_fallback_chat(self, question, context):
        """Answer common EcoStride questions without an external model."""
        question_lower = question.lower()
        city = context.get("city", "your area")
        aqi = context.get("aqi")
        category = context.get("category") or "the reported level"
        pollutants = context.get("pollutants", {})

        if any(word in question_lower for word in ("pollut", "pm2", "pm10", "no2", "ozone", "o3")):
            available = ", ".join(
                f"{name.upper()} {value}" for name, value in pollutants.items() if value is not None
            )
            return f"Pollutant readings for {city}: {available or 'detailed pollutant readings are unavailable right now'}."
        if any(word in question_lower for word in ("health", "safe", "breathe", "exercise", "outdoor", "mask", "precaution")):
            if aqi is None:
                return f"I cannot see a current AQI reading for {city}. Avoid prolonged heavy outdoor exercise until the reading is available."
            advice = "Normal outdoor activity is generally reasonable, but sensitive people should monitor symptoms." if aqi <= 100 else "Reduce prolonged outdoor activity, consider a well-fitting mask, and keep windows closed when pollution is high."
            return f"{city} is at AQI {aqi} ({category}). {advice}"
        if any(word in question_lower for word in ("route", "routing", "path", "travel", "commute")):
            return "Open Routing to compare an air-quality-aware route. Enter your start and destination and EcoStride will calculate the available options."
        if any(word in question_lower for word in ("forecast", "tomorrow", "later", "next", "predict")):
            return "Open Forecast for the 72-hour AQI outlook. The current reading is refreshed from the selected location."
        if any(word in question_lower for word in ("alert", "notification", "notify", "email")):
            return "Open Alerts to choose an AQI threshold and notification method. Email delivery requires valid SMTP credentials."
        if any(word in question_lower for word in ("where", "location", "city", "place")):
            return f"EcoStride is currently using {city} at {context.get('latitude')}, {context.get('longitude')}."
        if aqi is not None:
            return f"For {city}, the current AQI is {aqi} ({category}). Ask me about pollutants, health precautions, routes, forecasts, or alerts."
        return "I can help with air quality, pollutants, health precautions, routes, forecasts, safe zones, policies, and alerts."

    def _generate_groq_chat(self, prompt):
        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }
        try:
            response = requests.post(
                'https://api.groq.com/openai/v1/chat/completions',
                headers=headers,
                json={
                    'model': 'llama-3.3-70b-versatile',
                    'messages': [
                        {'role': 'system', 'content': 'You are the EcoStride environmental health assistant.'},
                        {'role': 'user', 'content': prompt}
                    ],
                    'temperature': 0.4,
                    'max_tokens': 450
                },
                timeout=20
            )
            if response.status_code == 200:
                return response.json()['choices'][0]['message']['content']
            print(f"Groq chat error: {response.status_code} - {response.text}")
        except Exception as error:
            print(f"Groq chat connection error: {error}")
        return None

    def _generate_gemini_chat(self, prompt):
        try:
            response = requests.post(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
                params={'key': GEMINI_API_KEY},
                json={
                    'contents': [{'parts': [{'text': prompt}]}],
                    'generationConfig': {'temperature': 0.4, 'maxOutputTokens': 450}
                },
                timeout=20
            )
            if response.status_code == 200:
                parts = response.json().get('candidates', [{}])[0].get('content', {}).get('parts', [])
                answer = ''.join(part.get('text', '') for part in parts).strip()
                return answer or None
            print(f"Gemini chat error: {response.status_code} - {response.text}")
        except Exception as error:
            print(f"Gemini chat connection error: {error}")
        return None

    def _generate_ollama_advisory(self, prompt):
        try:
            # Assumes llama2 or llama3 models pulled locally
            response = requests.post('http://localhost:11434/api/generate',
                json={
                    'model': 'llama3',  # Defaults
                    'prompt': prompt,
                    'stream': False
                }, timeout=10)
            if response.status_code == 200:
                return response.json().get('response', "Local Model Error.")
        except Exception as e:
            print(f"Ollama connection error (Is it running?): {e}")
            return "Ollama engine not reachable. Falling back to default advice.\n" + self._generate_fallback_advisory({}, 100)
    
    def _generate_groq_advisory(self, prompt):
        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.post(
                'https://api.groq.com/openai/v1/chat/completions',
                headers=headers,
                json={
                    'model': 'llama-3.3-70b-versatile',  # Updated to a more robust versatile model
                    'messages': [
                        {'role': 'system', 'content': 'You are a concise environmental health advisor. Provide clear, actionable advice based on AQI data.'},
                        {'role': 'user', 'content': prompt}
                    ],
                    'temperature': 0.6,
                    'max_tokens': 500
                }, timeout=15)
            
            if response.status_code == 200:
                return response.json()['choices'][0]['message']['content']
            else:
                print(f"Groq API Error: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Groq connection error: {e}")
            
        return "Groq generation failed. " + self._generate_fallback_advisory({}, 100)

    def _generate_fallback_advisory(self, profile, current_aqi):
        """Fallback when LLMs aren't configured or fail"""
        if current_aqi < 50:
            return "Risk Level: Low.\n- Air quality is great. Safe for outdoor activities."
        elif current_aqi < 100:
            return "Risk Level: Moderate.\n- Unusually sensitive people should consider reducing prolonged or heavy exertion."
        else:
            return "Risk Level: High.\n- Everyone may begin to experience health effects; sensitive groups may experience more serious effects. Avoid outdoor exertion."

    def send_email_alert(self, user_email, message):
        """Free SMTP Alert implementation"""
        sender = os.environ.get('SMTP_EMAIL', 'your_gmail@gmail.com')
        password = os.environ.get('SMTP_APP_PASSWORD', 'your_app_password')
        
        if password == 'your_app_password':
            print(f"Skipping email alert to {user_email}: SMTP credentials not configured.")
            return False
            
        try:
            msg = MIMEText(message)
            msg['Subject'] = "🚨 Team-X Air Quality Alert"
            msg['From'] = sender
            msg['To'] = user_email
            
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(sender, password)
                server.send_message(msg)
            return True
        except Exception as e:
            print(f"Failed sending email alert: {e}")
            return False
