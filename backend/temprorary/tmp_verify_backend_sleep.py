import os
import sys
import time
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))
from backend.models.routing import RoutePlanner

router = RoutePlanner()

# Test Geocoding Indian Locations
locations = [
    ("Bandra", "Mumbai"),
    ("Rajiv Gandhi IT Park", "Pune"),
    ("Viman Nagar", "Pune"),
    ("New York", "USA"), # Should fail or return default
]

print("Testing Geocoding:")
for name, loc in locations:
    res = router.geocode(name, loc)
    print(f"{name}, {loc} -> {res}")
    time.sleep(1.5)

print("\nTesting Reverse Geocoding (City Detection):")
# Pune, India
print(f"Pune coords -> {router.reverse_geocode(18.5204, 73.8567)}")
time.sleep(1.5)
# Amravati, India
print(f"Amravati coords -> {router.reverse_geocode(20.9320, 77.7523)}")

print("\nTesting Route Calculation (Viman Nagar to Hinjewadi, Pune):")
routes = router.find_routes("Viman Nagar", "Hinjewadi", "Pune", 18.5665, 73.9122)
print(f"Found {len(routes)} routes.")
for r in routes:
    print(f"- {r['emoji']} {r['label']} (AQI: {r['aqi_exposure_score']}) | {r['distance_km']}km | {r['safety_reason']}")
