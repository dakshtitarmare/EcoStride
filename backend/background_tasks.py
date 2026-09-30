# background_tasks.py
import time
import threading
import schedule
from backend.models.forecasting import AQIForecaster
from backend.services.alert_service import AQIAlertService

def start_background_tasks():
    print("🚀 Initializing background tasks...")
    
    alert_service = AQIAlertService()
    
    # Check subscribed AQI alerts every six hours.
    schedule.every(6).hours.do(alert_service.check_and_send_alerts)
    
    def run_scheduler():
        while True:
            schedule.run_pending()
            time.sleep(60)
            
    thread = threading.Thread(target=run_scheduler, daemon=True)
    thread.start()
    print("🚀 Background tasks active and scheduling loop running!")
