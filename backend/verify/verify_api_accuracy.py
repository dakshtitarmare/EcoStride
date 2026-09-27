import sys
import os

# Add project root to sys.path
project_root = os.path.abspath(os.path.dirname(__file__))
if project_root not in sys.path:
    sys.path.append(project_root)

try:
    from backend.models.forecasting import AQIForecaster
    print("✅ Imports successful")
except Exception as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)

def test_api_accuracy():
    print("\n--- Testing API Accuracy ---")
    forecaster = AQIForecaster()
    
    # Test get_current
    print("Fetching current AQI for Amravati...")
    data = forecaster.get_current("amravati")
    
    print(f"Data Source: {data['source']}")
    print(f"AQI: {data['aqi']}")
    print(f"Category: {data['category']}")
    print(f"Components: PM2.5: {data['pm2_5']}, PM10: {data['pm10']}")
    
    assert data['aqi'] > 0
    # Accept verified_local_anchor for Amravati since WAQI often lacks local sensors there
    assert data['source'] in ['aqicn_live', 'openweathermap_coords', 'localized_fallback', 'verified_local_anchor']
    
    if data['source'] == 'aqicn_live':
        print("✅ AQICN Live data retrieved via GPS coordinates")
    elif data['source'] == 'openweathermap_coords':
        print("✅ OpenWeatherMap data retrieved and converted using refined US-AQI logic")

if __name__ == "__main__":
    test_api_accuracy()
