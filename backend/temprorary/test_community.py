import requests

BASE_URL = "http://127.0.0.1:5000/api"

def test_community_report():
    print("Testing Community Report...")
    payload = {
        "type": "smoke",
        "description": "Thick black smoke from factory chimney",
        "city": "Amravati",
        "lat": 20.9343,
        "lon": 77.7489
    }
    try:
        r = requests.post(f"{BASE_URL}/community/report", json=payload)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.json()}")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_community_report()
