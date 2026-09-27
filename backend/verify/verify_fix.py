import sys
import os

def verify():
    print(f"Python Version: {sys.version}")
    print(f"Executable: {sys.executable}")
    print("-" * 30)
    
    try:
        import requests
        print(f"✅ requests imported successfully (version: {requests.__version__})")
    except ImportError:
        print("❌ requests NOT found")
        
    try:
        from config import OPENWEATHER_API_KEY
        print("✅ config imported successfully")
    except ImportError:
        print("❌ config NOT found (Make sure you are running from project root)")

if __name__ == "__main__":
    verify()
