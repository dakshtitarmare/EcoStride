import requests

BASE_URL = "http://127.0.0.1:5000/api"

def test_routing_variety():
    print("Testing Routing Variety...")
    payload = {
        "start_name": "Rajapeth",
        "end_name": "Camp",
        "city": "Amravati",
        "lat": 20.9450,
        "lon": 77.7600
    }
    try:
        r = requests.post(f"{BASE_URL}/route/calculate", json=payload)
        data = r.json()
        routes = data.get("routes", [])
        print(f"Found {len(routes)} routes.")
        for i, route in enumerate(routes):
            print(f"Route {i+1}: {route['label']} (via {route['via']}) - {route['distance_km']}km, {route['duration_min']}min")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_routing_variety()
