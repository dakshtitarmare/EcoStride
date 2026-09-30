import sqlite3
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import datetime
import requests
import os

try:
    from config import SMTP_EMAIL, SMTP_APP_PASSWORD, FAST2SMS_API_KEY, AUTHORITY_EMAIL
except ImportError:
    SMTP_EMAIL = ""
    SMTP_APP_PASSWORD = ""
    FAST2SMS_API_KEY = ""
    AUTHORITY_EMAIL = ""

class AQIAlertService:
    def __init__(self):
        self.db_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'teamx.db')
        self._create_tables()
    
    def _create_tables(self):
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
        CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY,
            contact TEXT NOT NULL,
            contact_type TEXT NOT NULL,
            city TEXT NOT NULL,
            lat REAL, lon REAL,
            threshold INTEGER DEFAULT 100,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        c.execute('''
        CREATE TABLE IF NOT EXISTS alert_logs (
            id INTEGER PRIMARY KEY,
            subscriber_id INTEGER,
            city TEXT,
            aqi INTEGER,
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        c.execute('''
        CREATE TABLE IF NOT EXISTS community_reports (
            id INTEGER PRIMARY KEY,
            report_type TEXT NOT NULL,
            description TEXT,
            city TEXT,
            lat REAL,
            lon REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        conn.commit()
        conn.close()
        
    def _dispatch_email(self, to_email, subject, html_content):
        """
        Robust email dispatcher that attempts TLS (587) and SSL (465) with Gmail SMTP,
        strips password spaces, and logs email locally if SMTP fails.
        Returns: (success: bool, status_msg: str)
        """
        # Save to local log file first so no email is lost
        try:
            log_dir = os.path.join(os.path.dirname(__file__), '..', 'local_storage')
            os.makedirs(log_dir, exist_ok=True)
            log_file = os.path.join(log_dir, 'sent_emails.json')
            import json
            existing_logs = []
            if os.path.exists(log_file):
                try:
                    with open(log_file, 'r', encoding='utf-8') as f:
                        existing_logs = json.load(f)
                except Exception:
                    existing_logs = []
            existing_logs.append({
                "to": to_email,
                "subject": subject,
                "timestamp": datetime.datetime.now().isoformat(),
            })
            with open(log_file, 'w', encoding='utf-8') as f:
                json.dump(existing_logs, f, indent=2)
        except Exception as log_e:
            print(f"Failed to log email locally: {log_e}")

        if not SMTP_EMAIL or not SMTP_APP_PASSWORD:
            msg = "SMTP credentials missing in .env file"
            print(msg)
            return False, msg

        clean_pass = SMTP_APP_PASSWORD.replace(" ", "").strip()
        msg_obj = MIMEMultipart('alternative')
        msg_obj['Subject'] = subject
        msg_obj['From']    = SMTP_EMAIL
        msg_obj['To']      = to_email
        msg_obj.attach(MIMEText(html_content, 'html'))

        # Strategy 1: Try TLS on port 587
        try:
            server = smtplib.SMTP('smtp.gmail.com', 587, timeout=10)
            server.starttls()
            server.login(SMTP_EMAIL, clean_pass)
            server.send_message(msg_obj)
            server.quit()
            print(f"Email sent successfully to {to_email} via TLS 587")
            return True, "Email sent successfully"
        except Exception as e1:
            print(f"TLS 587 email dispatch failed: {e1}")

        # Strategy 2: Try SSL on port 465
        try:
            server = smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=10)
            server.login(SMTP_EMAIL, clean_pass)
            server.send_message(msg_obj)
            server.quit()
            print(f"Email sent successfully to {to_email} via SSL 465")
            return True, "Email sent successfully"
        except Exception as e2:
            err_msg = f"SMTP Authentication Error: {str(e2)}"
            print(f"SSL 465 email dispatch failed: {e2}")
            return False, err_msg

    def subscribe(self, contact, contact_type, city, lat, lon, threshold=100):
        # Remove existing subscription for this contact
        self.unsubscribe(contact)

        # Save new subscription to DB
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
        INSERT INTO subscribers (contact, contact_type, city, lat, lon, threshold)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (contact, contact_type, city, lat, lon, threshold))
        conn.commit()
        conn.close()

        email_sent = False
        email_status = ""

        # Send confirmation immediately on subscribe
        if contact_type == 'email':
            email_sent, email_status = self._send_subscription_confirmation(contact, city, threshold)
        elif contact_type == 'sms':
            self._send_sms_confirmation(contact, city, threshold)

        # Check current AQI for this city/location immediately
        alert_triggered = False
        current_aqi = None
        try:
            try:
                from backend.models.forecasting import AQIForecaster
            except ImportError:
                from models.forecasting import AQIForecaster
            forecaster = AQIForecaster()
            current = forecaster.get_current(location=city, lat=lat, lon=lon)
            current_aqi = current.get('aqi')
            if current_aqi is not None and current_aqi > threshold:
                alert_triggered = True
                if contact_type == 'email':
                    al_sent, al_status = self.send_email_alert(contact, city, current_aqi, "")
                    email_sent = email_sent or al_sent
                    if not email_sent:
                        email_status = al_status
                else:
                    self.send_sms_alert(contact, city, current_aqi, "")
                
                # Log immediate alert
                try:
                    conn = sqlite3.connect(self.db_path)
                    c = conn.cursor()
                    c.execute('SELECT id FROM subscribers WHERE contact=? AND active=1', (contact,))
                    row = c.fetchone()
                    if row:
                        c.execute('INSERT INTO alert_logs (subscriber_id, city, aqi) VALUES (?, ?, ?)', (row[0], city, current_aqi))
                        conn.commit()
                    conn.close()
                except Exception as log_err:
                    print(f"Error logging initial alert: {log_err}")
        except Exception as e:
            print(f"Notice: Error checking initial AQI alert for {city}: {e}")

        return {
            "current_aqi": current_aqi,
            "alert_triggered": alert_triggered,
            "threshold": threshold,
            "city": city,
            "email_sent": email_sent,
            "email_status": email_status
        }

    def _send_subscription_confirmation(self, email_addr, city, threshold):
        """Send a confirmation email immediately when user subscribes."""
        html = f"""
        <html><body style="font-family:Arial;background:#0d1117;color:#fff;padding:20px">
          <div style="max-width:600px;margin:auto;background:#161b22;border-radius:16px;padding:24px;border:1px solid #30363d">

            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
              <span style="font-size:2rem">🌿</span>
              <h2 style="margin:0;color:#00e5a0;font-family:Arial">EcoStride</h2>
            </div>

            <h3 style="color:#e8f0f2;margin-bottom:8px">✅ You're subscribed to AQI Alerts!</h3>
            <p style="color:#7a9ba8;margin-bottom:20px">
              You'll receive an alert email whenever the Air Quality Index in 
              <strong style="color:#e8f0f2">{city}</strong> exceeds 
              <strong style="color:#f5c542">AQI {threshold}</strong>.
            </p>

            <div style="background:#0d1518;border:1px solid #30363d;border-radius:12px;padding:16px;margin-bottom:20px">
              <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                <span style="color:#7a9ba8;font-size:0.85rem">📍 City</span>
                <span style="color:#e8f0f2;font-weight:bold">{city}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                <span style="color:#7a9ba8;font-size:0.85rem">⚠️ Alert Threshold</span>
                <span style="color:#f5c542;font-weight:bold">AQI &gt; {threshold}</span>
              </div>
              <div style="display:flex;justify-content:space-between">
                <span style="color:#7a9ba8;font-size:0.85rem">📧 Subscribed Email</span>
                <span style="color:#e8f0f2">{email_addr}</span>
              </div>
            </div>

            <p style="color:#7a9ba8;font-size:0.85rem;margin-bottom:20px">
              When AQI crosses your threshold, we'll send you health recommendations 
              and safe routing suggestions instantly.
            </p>

            <a href="http://localhost:5173" 
               style="background:#00e5a0;color:#080d0f;padding:12px 24px;border-radius:8px;
                      text-decoration:none;display:inline-block;font-weight:bold;font-size:0.9rem">
              🗺️ View Live AQI Dashboard
            </a>

            <hr style="border:none;border-top:1px solid #30363d;margin:24px 0">
            <p style="color:#3d5a64;font-size:0.75rem;text-align:center">
              EcoStride — Environmental Health & Safe Routing Platform<br>
              To unsubscribe, visit your account settings on EcoStride.
            </p>
          </div>
        </body></html>"""

        subject = f"✅ EcoStride Alert Subscription Confirmed — {city}"
        return self._dispatch_email(email_addr, subject, html)

    def _send_sms_confirmation(self, phone, city, threshold):
        """Send confirmation SMS immediately when user subscribes."""
        if not FAST2SMS_API_KEY:
            print("SMS confirmation not sent: Fast2SMS API key missing")
            return
        msg = f"EcoStride: You're subscribed to AQI alerts for {city}. You'll be notified when AQI exceeds {threshold}. Reply STOP to unsubscribe."
        url = "https://www.fast2sms.com/dev/bulkV2"
        payload = {
            "route": "q",
            "message": msg,
            "language": "english",
            "flash": 0,
            "numbers": phone.replace('+91', '').strip()
        }
        headers = {
            "authorization": FAST2SMS_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded"
        }
        try:
            requests.post(url, data=payload, headers=headers)
            print(f"Confirmation SMS sent to {phone}")
        except Exception as e:
            print(f"Failed to send confirmation SMS: {e}")

    def unsubscribe(self, contact):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('DELETE FROM subscribers WHERE contact = ?', (contact,))
        conn.commit()
        conn.close()

    def get_subscription(self, contact):
        try:
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute('SELECT id, contact, contact_type, city, lat, lon, threshold, active, created_at FROM subscribers WHERE contact = ? AND active = 1 ORDER BY id DESC LIMIT 1', (contact,))
            row = c.fetchone()
            conn.close()
            if row:
                return {
                    "id": row[0],
                    "contact": row[1],
                    "contact_type": row[2],
                    "city": row[3],
                    "lat": row[4],
                    "lon": row[5],
                    "threshold": row[6],
                    "active": bool(row[7]),
                    "created_at": row[8],
                    "subscribed": True
                }
        except Exception as e:
            print(f"Error fetching subscription for {contact}: {e}")
        return {"subscribed": False}
        
    def send_email_alert(self, email_addr, city, aqi, message):
        html = f"""
        <html><body style="font-family:Arial;background:#0d1117;color:#fff;padding:20px">
          <div style="max-width:600px;margin:auto;background:#161b22;border-radius:16px;padding:24px;border:1px solid #30363d">

            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
              <span style="font-size:2rem">🌿</span>
              <h2 style="margin:0;color:#00e5a0">EcoStride</h2>
            </div>

            <h2 style="color:#ff4f6b;margin-bottom:8px">⚠️ AQI Health Alert — {city}</h2>

            <div style="background:#ff4f6b22;border:1px solid #ff4f6b44;border-radius:12px;
                        padding:20px;text-align:center;margin-bottom:20px">
              <div style="font-size:56px;font-weight:bold;color:#ff4f6b;line-height:1">{aqi}</div>
              <div style="color:#7a9ba8;font-size:0.85rem;margin-top:4px">Current AQI Level</div>
            </div>

            <p style="color:#e8f0f2">
              Air quality in <strong>{city}</strong> has reached 
              <strong style="color:#ff4f6b">AQI {aqi}</strong> — above your alert threshold.
            </p>

            <div style="background:#0d1518;border:1px solid #30363d;border-radius:12px;padding:16px;margin:16px 0">
              <p style="color:#f5c542;font-weight:bold;margin-bottom:8px">🛡️ Health Recommendations:</p>
              <ul style="color:#7a9ba8;margin:0;padding-left:20px;line-height:1.8">
                <li>Stay indoors and keep windows closed</li>
                <li>Use air purifiers if available</li>
                <li>Wear N95 mask if going outside is unavoidable</li>
                <li>Avoid exercise and outdoor activities</li>
                <li>Keep children and elderly indoors</li>
              </ul>
            </div>

            <a href="http://localhost:5173" 
               style="background:#00e5a0;color:#080d0f;padding:12px 24px;border-radius:8px;
                      text-decoration:none;display:inline-block;font-weight:bold;font-size:0.9rem">
              🗺️ View Safe Routes on EcoStride
            </a>

            <hr style="border:none;border-top:1px solid #30363d;margin:24px 0">
            <p style="color:#3d5a64;font-size:0.75rem;text-align:center">
              EcoStride — Environmental Health & Safe Routing Platform<br>
              To unsubscribe, visit your account settings on EcoStride.
            </p>
          </div>
        </body></html>"""
        
        subject = f"⚠️ AQI Alert: {city} is at {aqi} — Stay Safe"
        return self._dispatch_email(email_addr, subject, html)

    def send_authority_report(self, report_type, description, city, lat, lon):
        if not SMTP_EMAIL or not SMTP_APP_PASSWORD or not AUTHORITY_EMAIL:
            print("Authority report not sent: Missing credentials or authority email")
            return False

        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
        INSERT INTO community_reports (report_type, description, city, lat, lon)
        VALUES (?, ?, ?, ?, ?)
        ''', (report_type, description, city, lat, lon))
        conn.commit()
        conn.close()

        subject = f"🚨 COMMUNITY REPORT: {report_type.upper()} in {city}"
        body = f"""
        <html><body style="font-family:Arial;background:#f8f9fa;padding:20px">
          <div style="max-width:600px;margin:auto;background:#fff;border:1px solid #ddd;border-radius:8px;padding:24px">
            <h2 style="color:#d32f2f">Community Pollution Report</h2>
            <hr>
            <p><strong>Type:</strong> {report_type}</p>
            <p><strong>City:</strong> {city}</p>
            <p><strong>Location:</strong> {lat}, {lon}</p>
            <p><strong>Description:</strong> {description or 'No description provided'}</p>
            <p><strong>Timestamp:</strong> {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <hr>
            <p style="font-size:0.8rem;color:#666">This is an automated report from EcoStride.</p>
          </div>
        </body></html>
        """
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From']    = SMTP_EMAIL
        msg['To']      = AUTHORITY_EMAIL
        msg.attach(MIMEText(body, 'html'))

        try:
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
            server.send_message(msg)
            server.quit()
            return True
        except Exception as e:
            print(f"Failed to send authority report: {e}")
            return False
        
    def send_sms_alert(self, phone, city, aqi, message):
        if not FAST2SMS_API_KEY:
            print("SMS not sent: Fast2SMS API key missing")
            return
            
        msg = f"ALERT: AQI in {city} is {aqi}. Stay indoors. Avoid outdoor activities. Visit EcoStride for safe routes. Reply STOP to unsubscribe."
        url = "https://www.fast2sms.com/dev/bulkV2"
        payload = {
            "route": "q",
            "message": msg,
            "language": "english",
            "flash": 0,
            "numbers": phone.replace('+91', '').strip()
        }
        headers = {
            "authorization": FAST2SMS_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded"
        }
        try:
            requests.post(url, data=payload, headers=headers)
        except Exception as e:
            print(f"Failed to send SMS: {e}")
        
    def check_and_send_alerts(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT id, contact, contact_type, city, lat, lon, threshold FROM subscribers WHERE active=1')
        subscribers = c.fetchall()
        conn.close()
        
        from backend.models.forecasting import AQIForecaster
        forecaster = AQIForecaster()
        
        for sub in subscribers:
            sid, contact, ctype, city, lat, lon, threshold = sub
            try:
                current = forecaster.get_current(location=city, lat=lat, lon=lon)
                aqi = current.get('aqi', 0)
                if aqi > threshold:
                    conn = sqlite3.connect(self.db_path)
                    c = conn.cursor()
                    c.execute('SELECT sent_at FROM alert_logs WHERE subscriber_id=? ORDER BY sent_at DESC LIMIT 1', (sid,))
                    row = c.fetchone()
                    
                    can_send = True
                    if row:
                        last_sent = datetime.datetime.strptime(row[0], '%Y-%m-%d %H:%M:%S')
                        if (datetime.datetime.now() - last_sent).total_seconds() < 6 * 3600:
                            can_send = False
                            
                    if can_send:
                        if ctype == 'email':
                            self.send_email_alert(contact, city, aqi, "")
                        else:
                            self.send_sms_alert(contact, city, aqi, "")
                            
                        c.execute('INSERT INTO alert_logs (subscriber_id, city, aqi) VALUES (?, ?, ?)', (sid, city, aqi))
                        conn.commit()
                    conn.close()
            except Exception as e:
                print(f"Error processing subscriber {sid}: {e}")