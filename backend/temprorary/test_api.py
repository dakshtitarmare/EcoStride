import requests

BASE_URL = "http://127.0.0.1:5000/api"

endpoints = [
    {"method": "GET", "url": f"{BASE_URL}/forecast/current?city=Pune&lat=18.5204&lon=73.8567"},
    {"method": "POST", "url": f"{BASE_URL}/forecast/predict", "json": {"city": "Pune", "lat": 18.5204, "lon": 73.8567}},
    {"method": "POST", "url": f"{BASE_URL}/route/calculate", "json": {"start_name": "Rajapeth", "end_name": "Camp", "city": "Amravati", "lat": 20.9343, "lon": 77.7489}},
    {"method": "GET", "url": f"{BASE_URL}/source/detect?city=Pune&lat=18.5204&lon=73.8567"},
    {"method": "GET", "url": f"{BASE_URL}/map/pins?city=Pune&lat=18.5204&lon=73.8567"},
    {"method": "POST", "url": f"{BASE_URL}/health/advisory", "json": {"profile": {"location": "Pune", "lat": 18.5204, "lon": 73.8567}}},
    {"method": "GET", "url": f"{BASE_URL}/policy/scenarios?city=Pune&lat=18.5204&lon=73.8567"},
    {"method": "POST", "url": f"{BASE_URL}/policy/simulate", "json": {"city": "Pune", "lat": 18.5204, "lon": 73.8567, "policies": ["industrial_emission_caps"]}},
]

for ep in endpoints:
    try:
        print(f"Testing {ep['method']} {ep['url']} ...")
        if ep["method"] == "GET":
            r = requests.get(ep["url"])
        else:
            r = requests.post(ep["url"], json=ep.get("json"))
        print(f"Status: {r.status_code}")
        if r.status_code != 200:
            print(f"Response: {r.text[:500]}")
        else:
            print("OK.")
    except Exception as e:
        print(f"Request failed: {e}")
