import requests
import json
import smtplib
import os
from email.mime.text import MIMEText
try:
    from backend.config import GEMINI_API_KEY, DATABASE_PATH
except ImportError:
    import sys
    import os
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from config import GEMINI_API_KEY, DATABASE_PATH
import time

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
        """Generate Health Advisory guidance with Gemini only."""
        
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
        
        if GEMINI_API_KEY and GEMINI_API_KEY != "your_api_key_here":
            gemini_answer = self._generate_gemini_chat(prompt)
            if gemini_answer:
                return gemini_answer
            return self._generate_fallback_advisory(profile, current_aqi)
        return self._generate_fallback_advisory(profile, current_aqi)

    def answer_gemini_question(self, question, context, history=None):
        """Answer every Health Advisory question using Gemini and live app context."""
        conversation = history or []
        prompt = f"""
You are EcoStride's helpful health and air-quality assistant. Answer every user question directly,
including questions about health precautions, AQI, pollutants, exercise, indoor air, the user's
profile, forecasts, routes, or any other topic. Use the live application context below whenever
the question relates to EcoStride. If a fact is not present in the context, say that clearly rather
than inventing live measurements. Be concise, practical, and clear.

Never diagnose illness, prescribe medication, or replace a doctor. For urgent or severe symptoms,
recommend immediate professional medical care. For general non-medical questions, answer helpfully
and distinguish general knowledge from live EcoStride data.
    Return a complete answer in 3-5 short sentences or bullet points. Include the reason and the
    practical recommendation. Never end with an unfinished sentence, colon, or lead-in such as
    "Here is why".

Health Advisory context:
{json.dumps(context, indent=2, default=str)}

Recent conversation:
{json.dumps(conversation, indent=2, default=str)}

User question: {question}
"""
        if GEMINI_API_KEY and GEMINI_API_KEY != "your_api_key_here":
            answer = self._generate_gemini_chat(prompt)
            if answer:
                return answer
        return self._generate_fallback_chat(question, context)

    def answer_chat_question(self, question, context):
        """Answer a user question using the current application data."""
        location_name = context.get("location_name")
        if location_name and any(word in question.lower() for word in ("aqi", "air quality", "pollution")):
            aqi = context.get("aqi")
            category = context.get("category") or "the reported level"
            if aqi is not None:
                return f"The current AQI for {location_name} is {aqi} ({category})."

        prompt = f"""
You are EcoStride's in-app assistant. Answer the user's question using the live application data below.
Be concise, practical, and honest. Do not invent measurements or claim to have performed actions.
If the question is unrelated to EcoStride, briefly say you can help with air quality, health, routes,
safe zones, forecasts, policies, alerts, and community reports.

Current application data:
{json.dumps(context, indent=2, default=str)}

User question: {question}
"""

        if GEMINI_API_KEY and GEMINI_API_KEY != "your_api_key_here":
            gemini_answer = self._generate_gemini_chat(prompt)
            if gemini_answer:
                return gemini_answer

        return self._generate_fallback_chat(question, context)

    def _generate_fallback_chat(self, question, context):
        """Answer common EcoStride questions without an external model."""
        question_lower = question.lower()
        city = context.get("city", "your area")
        location_name = context.get("location_name", city)
        aqi = context.get("aqi")
        category = context.get("category") or "the reported level"
        pollutants = context.get("pollutants", {})

        if location_name != city and any(word in question_lower for word in ("aqi", "air quality", "pollution")):
            if aqi is None:
                return f"I cannot see a current AQI reading for {location_name} right now."
            return f"The current AQI for {location_name} is {aqi} ({category})."

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

    def _generate_fallback_advisory(self, profile, current_aqi):
        """Provide useful guidance when Gemini is unavailable."""
        conditions = str(profile.get("conditions", "")).lower()
        sensitive = any(term in conditions for term in ("asthma", "copd", "respiratory", "cardiovascular", "allergy"))
        activity = str(profile.get("activity", "moderate")).lower()

        if current_aqi <= 50:
            level = "Low"
            precautions = "Normal outdoor activity is generally reasonable."
        elif current_aqi <= 100:
            level = "Moderate"
            precautions = "Sensitive people should monitor symptoms and reduce prolonged heavy exertion if needed."
        elif current_aqi <= 150:
            level = "High"
            precautions = "Reduce prolonged outdoor activity and consider a well-fitting mask outdoors."
        else:
            level = "Severe"
            precautions = "Avoid outdoor exertion, keep windows closed, and use filtered indoor air where possible."

        if sensitive:
            precautions += " Your reported health conditions may increase sensitivity to pollution."
        if activity in ("high", "outdoor") and current_aqi > 100:
            precautions += " Choose a lighter indoor activity until air quality improves."

        return (
            f"Risk Level: {level}.\n"
            f"- Precautions: {precautions}\n"
            "- Indoor air: Keep doors and windows closed during pollution peaks and avoid indoor smoke.\n"
            "- Medical note: Seek professional care for severe or worsening breathing symptoms."
        )


    def _generate_gemini_chat(self, prompt):
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.4,
                 "maxOutputTokens": 1024
            }
        }

        max_retries = 3

        for attempt in range(max_retries):
            try:
                response = requests.post(
                    url,
                    params={"key": GEMINI_API_KEY},
                    json=payload,
                    timeout=30
                )

                if response.status_code == 200:
                    parts = (
                        response.json()
                        .get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [])
                    )

                    answer = "".join(
                        part.get("text", "")
                        for part in parts
                    ).strip()

                    return answer or None

                if response.status_code in (429, 500, 502, 503, 504):
                    wait_time = 2 ** attempt

                    print(
                        f"Gemini temporary error {response.status_code}. "
                        f"Retrying in {wait_time}s... "
                        f"(attempt {attempt + 1}/{max_retries})"
                    )

                    time.sleep(wait_time)
                    continue

                print(
                    f"Gemini chat error: "
                    f"{response.status_code} - {response.text}"
                )
                return None

            except requests.exceptions.Timeout:
                print(
                    f"Gemini request timed out. "
                    f"Retrying... (attempt {attempt + 1}/{max_retries})"
                )

                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue

            except requests.exceptions.RequestException as error:
                print(f"Gemini connection error: {error}")

                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue

        print("Gemini request failed after all retries.")
        return None