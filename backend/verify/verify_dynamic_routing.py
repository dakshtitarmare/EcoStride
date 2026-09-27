import sys
import os

# Add project root to sys.path
project_root = os.path.abspath(os.path.dirname(__file__))
if project_root not in sys.path:
    sys.path.append(project_root)

try:
    from backend.models.routing import RoutePlanner
    from backend.models.forecasting import AQIForecaster
    print("✅ Imports successful")
except Exception as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)

def test_dynamic_routing():
    print("\n--- Testing Dynamic Routing ---")
    planner = RoutePlanner()
    
    # Test _update_zones
    planner._update_zones()
    print(f"Zones updated. Green: {len(planner.current_zones['green'])}, "
          f"Moderate: {len(planner.current_zones['moderate'])}, "
          f"Red: {len(planner.current_zones['red'])}")
    
    assert len(planner.current_zones['green']) + len(planner.current_zones['moderate']) + len(planner.current_zones['red']) > 0
    print("✅ Zones populated dynamically")

    # Test find_routes
    start = "Rajapeth"
    end = "Camp"
    print(f"Finding routes from {start} to {end}...")
    routes = planner.find_routes(start, end)
    
    if not routes:
        print("❌ No routes found (Check internet connection for OSRM)")
        return

    print(f"Found {len(routes)} routes:")
    for r in routes:
        print(f"  - {r['label']}: Via {r['via']}, Distance: {r['distance_km']} km, AQI Exposure: {r['aqi_exposure_score']}")
        assert isinstance(r['aqi_exposure_score'], int)
        assert r['via'] != ""
        
    print("✅ find_routes functional and returning dynamic data structures")

    # Test get_hotspots
    print("\n--- Testing Hotspots ---")
    hotspots = planner.get_hotspots(None)
    print(f"Found {len(hotspots)} hotspots")
    if hotspots:
        print(f"  - First hotspot: {hotspots[0]['name']} (AQI Contribution: {hotspots[0]['aqi_contribution']})")
    assert len(hotspots) > 0
    print("✅ get_hotspots functional")

if __name__ == "__main__":
    test_dynamic_routing()
