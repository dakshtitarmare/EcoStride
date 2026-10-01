import requests
import datetime
import math
import hashlib

class PolicySimulator:
    def __init__(self):
        self.POLICY_TEMPLATES = {
            "industrial_emission_caps": {
                "name": "Industrial Emission Standards",
                "applicable_when": ["industrial", "factory", "plant", "manufacturing"],
                "impacts": {"pm25": -0.25, "pm10": -0.20, "so2": -0.45, "no2": -0.20},
                "description": "Enforce real-time stack emission monitoring on all industrial units within 15km. Mandate scrubbers and filters.",
                "difficulty_score": 9
            },
            "stubble_burning_ban": {
                "name": "Crop Residue Burning Ban",
                "applicable_when": ["farmland", "agricultural", "farm"],
                "impacts": {"pm2_5": -0.30, "pm10": -0.25, "co": -0.20},
                "description": "Prohibit open-field burning of crop residues. Provide subsidized bio-decomposers and Happy Seeder machines.",
                "difficulty_score": 7
            },
            "odd_even_vehicles": {
                "name": "Odd-Even Vehicle Scheme",
                "applicable_when": ["highway", "road", "traffic"],
                "impacts": {"pm25": -0.15, "no2": -0.30, "co": -0.25},
                "description": "Restricts vehicles based on odd/even license plates.",
                "difficulty_score": 6
            },
            "cng_mandate": {
                "name": "CNG/EV Mandate for Commercial Vehicles",
                "applicable_when": ["highway", "transport_hub", "traffic"],
                "impacts": {"pm25": -0.20, "no2": -0.35, "co": -0.40},
                "description": "Phase out diesel-powered buses, auto-rickshaws, and taxis. Mandate CNG or electric alternatives.",
                "difficulty_score": 8
            },
            "construction_dust_control": {
                "name": "Construction Dust Control",
                "applicable_when": ["construction", "development"],
                "impacts": {"pm10": -0.40, "pm25": -0.15},
                "description": "Halts all major construction activities or enforces strong anti-dust protections.",
                "difficulty_score": 8
            },
            "green_buffer_zones": {
                "name": "Urban Green Buffer Expansion",
                "applicable_when": ["urban", "residential", "neighbourhood", "suburb"],
                "impacts": {"pm25": -0.08, "pm10": -0.10, "o3": -0.05},
                "description": "Plant 10,000+ trees in strategic locations based on wind patterns. Create green corridors.",
                "difficulty_score": 3
            },
            "public_transport": {
                "name": "Public Transport Incentives",
                "applicable_when": ["urban", "traffic", "transport_hub"],
                "impacts": {"pm25": -0.05, "no2": -0.10, "co": -0.10},
                "description": "Subsidize bus and rail fares and improve last-mile connections to reduce private vehicle use.",
                "difficulty_score": 4
            },
            "electric_bus_transition": {
                "name": "Electric Bus Transition",
                "applicable_when": ["urban", "traffic", "transport_hub"],
                "impacts": {"pm25": -0.12, "no2": -0.22, "co": -0.25},
                "description": "Replace high-use diesel buses with electric vehicles on the busiest routes.",
                "difficulty_score": 7
            },
            "construction_dust_monitoring": {
                "name": "Construction Dust Monitoring",
                "applicable_when": ["construction", "development", "urban"],
                "impacts": {"pm10": -0.25, "pm25": -0.10},
                "description": "Require covered materials, wheel washing, and dust sensors at active construction sites.",
                "difficulty_score": 5
            },
            "clean_air_zones": {
                "name": "Clean Air School Zones",
                "applicable_when": ["urban", "residential", "neighbourhood"],
                "impacts": {"pm25": -0.06, "no2": -0.12},
                "description": "Create low-emission buffers around schools and restrict idling during pickup hours.",
                "difficulty_score": 4
            },
            "traffic_signal_optimization": {
                "name": "Smart Traffic Signal Coordination",
                "applicable_when": ["traffic", "highway", "urban"],
                "impacts": {"no2": -0.15, "co": -0.12, "pm25": -0.06},
                "description": "Coordinate signals on congested corridors to reduce idling and stop-and-go emissions.",
                "difficulty_score": 5
            },
            "freight_delivery_windows": {
                "name": "Low-Emission Freight Windows",
                "applicable_when": ["traffic", "highway", "industrial"],
                "impacts": {"no2": -0.12, "pm25": -0.10, "co": -0.10},
                "description": "Schedule freight deliveries outside peak congestion and prioritize cleaner commercial fleets.",
                "difficulty_score": 5
            },
            "industrial_fuel_switch": {
                "name": "Cleaner Industrial Fuel Switch",
                "applicable_when": ["industrial", "factory", "plant", "manufacturing"],
                "impacts": {"so2": -0.35, "pm25": -0.18, "no2": -0.12},
                "description": "Move industrial boilers and furnaces toward lower-emission fuels with compliance checks.",
                "difficulty_score": 8
            },
            "industrial_buffer_zones": {
                "name": "Industrial Green Buffer Zones",
                "applicable_when": ["industrial", "factory", "plant"],
                "impacts": {"pm25": -0.10, "pm10": -0.12},
                "description": "Expand vegetation buffers between industrial clusters and nearby homes.",
                "difficulty_score": 6
            },
            "waste_burning_enforcement": {
                "name": "Open Waste Burning Enforcement",
                "applicable_when": ["urban", "residential", "industrial"],
                "impacts": {"pm25": -0.14, "pm10": -0.15, "co": -0.18},
                "description": "Provide reliable waste collection and enforce a no-open-burning rule with local reporting.",
                "difficulty_score": 5
            },
            "rooftop_solar_incentives": {
                "name": "Rooftop Solar Incentives",
                "applicable_when": ["urban", "residential", "industrial"],
                "impacts": {"so2": -0.08, "no2": -0.06},
                "description": "Accelerate rooftop solar adoption to reduce pollution from fossil-fuel electricity generation.",
                "difficulty_score": 6
            },
            "clean_cooking_program": {
                "name": "Clean Cooking Energy Program",
                "applicable_when": ["residential", "neighbourhood", "suburb"],
                "impacts": {"pm25": -0.10, "co": -0.14},
                "description": "Support clean household cooking energy and ventilation improvements in vulnerable homes.",
                "difficulty_score": 5
            },
            "urban_cooling_corridors": {
                "name": "Urban Cooling Corridors",
                "applicable_when": ["urban", "residential", "suburb"],
                "impacts": {"o3": -0.08, "pm10": -0.06},
                "description": "Connect shaded streets, parks, and water-sensitive landscaping to improve local comfort and air flow.",
                "difficulty_score": 5
            },
            "roadside_green_barriers": {
                "name": "Roadside Green Barriers",
                "applicable_when": ["traffic", "highway", "urban"],
                "impacts": {"pm25": -0.09, "pm10": -0.12},
                "description": "Install suitable vegetation barriers along high-traffic roads without blocking ventilation.",
                "difficulty_score": 4
            },
            "air_quality_sensor_network": {
                "name": "Expanded Air Sensor Network",
                "applicable_when": ["urban", "industrial", "traffic"],
                "impacts": {"pm25": -0.03, "no2": -0.04},
                "description": "Deploy calibrated sensors near schools, traffic corridors, and industrial boundaries for enforcement.",
                "difficulty_score": 6
            },
            "crop_alternative_support": {
                "name": "Crop Residue Alternative Support",
                "applicable_when": ["farmland", "agricultural", "farm"],
                "impacts": {"pm25": -0.22, "pm10": -0.18, "co": -0.16},
                "description": "Fund residue collection, composting, and equipment that makes non-burning farm management practical.",
                "difficulty_score": 6
            },
            "water_spraying_routes": {
                "name": "Dust-Controlled Road Maintenance",
                "applicable_when": ["traffic", "highway", "construction", "development"],
                "impacts": {"pm10": -0.20, "pm25": -0.08},
                "description": "Use targeted road cleaning and dust suppression on unpaved shoulders and high-traffic corridors.",
                "difficulty_score": 4
            },
            "parking_demand_management": {
                "name": "Parking Demand Management",
                "applicable_when": ["urban", "traffic", "commercial"],
                "impacts": {"no2": -0.10, "co": -0.12, "pm25": -0.05},
                "description": "Price crowded parking areas fairly and use the revenue to improve public transport access.",
                "difficulty_score": 5
            },
            "cycling_walking_network": {
                "name": "Safe Walking and Cycling Network",
                "applicable_when": ["urban", "residential", "neighbourhood"],
                "impacts": {"no2": -0.08, "co": -0.08, "pm25": -0.04},
                "description": "Build connected, shaded active-mobility routes for short trips currently made by car or two-wheeler.",
                "difficulty_score": 6
            },
            "port_shipping_controls": {
                "name": "Port and Shipping Emission Controls",
                "applicable_when": ["port"],
                "impacts": {"so2": -0.28, "no2": -0.18, "pm25": -0.10},
                "description": "Require cleaner fuels and shore-side electricity for ships and cargo equipment near port areas.",
                "difficulty_score": 8
            },
            "festival_firework_controls": {
                "name": "Seasonal Firework Controls",
                "applicable_when": ["urban", "residential", "commercial"],
                "impacts": {"pm25": -0.12, "pm10": -0.10, "so2": -0.08},
                "description": "Use time, location, and low-emission limits for fireworks during seasonal pollution peaks.",
                "difficulty_score": 5
            }
        }

    def detect_city_industries(self, lat, lon, city_name, radius_km=15):
        """
        Use Overpass API to detect what exists near the user.
        """
        overpass_url = "https://overpass-api.de/api/interpreter"
        query = f"""
        [out:json][timeout:25];
        (
          node["landuse"="industrial"](around:{radius_km*1000},{lat},{lon});
          way["landuse"="industrial"](around:{radius_km*1000},{lat},{lon});
          node["industrial"~"factory|plant|kiln"](around:{radius_km*1000},{lat},{lon});
          way["highway"="primary"](around:{radius_km*1000},{lat},{lon});
          node["landuse"="farmland"](around:{radius_km*1000},{lat},{lon});
        );
        out body;
        """
        industries = []
        try:
            res = requests.post(overpass_url, data={'data': query}, timeout=10)
            if res.status_code == 200:
                data = res.json()
                for el in data.get('elements', []):
                    tags = el.get('tags', {})
                    if 'landuse' in tags and tags['landuse'] == 'industrial':
                        industries.append({"type": "industrial", "name": tags.get("name", "Industrial Zone")})
                    elif 'industrial' in tags:
                        industries.append({"type": "manufacturing", "name": tags.get("name", "Manufacturing Plant")})
                    elif 'landuse' in tags and tags['landuse'] == 'farmland':
                        industries.append({"type": "farmland", "name": tags.get("name", "Agricultural Area")})
                    elif 'highway' in tags and tags['highway'] == 'primary':
                        industries.append({"type": "traffic", "name": tags.get("name", "Primary Highway")})
                        
                # Dedup
                seen = set()
                unique_industries = []
                for ind in industries:
                    if ind['name'] not in seen:
                        seen.add(ind['name'])
                        unique_industries.append(ind)
                
                # Assign default if empty
                if not unique_industries:
                    return [{"type": "urban", "name": "Urban Traffic Zone"}, {"type": "residential", "name": "Residential Area"}]
                return unique_industries
        except Exception as e:
            print(f"Overpass industry error: {e}")
        return [{"type": "urban", "name": "Urban Traffic Zone"}, {"type": "residential", "name": "Residential Area"}]

    def generate_policies_for_city(self, lat, lon, city_name):
        industries = self.detect_city_industries(lat, lon, city_name)
        types = set([ind['type'] for ind in industries])
        types.add('urban') # always active
        
        applicable = {}
        for key, pol in self.POLICY_TEMPLATES.items():
            if any(t in pol['applicable_when'] for t in types):
                applicable[key] = pol
                
        # When map coverage is sparse, choose a stable city-specific mix from the full catalog.
        sparse_map = types.issubset({"urban", "residential"})
        if len(applicable) < 5 or sparse_map:
            if sparse_map:
                applicable = {
                    "green_buffer_zones": self.POLICY_TEMPLATES["green_buffer_zones"],
                    "public_transport": self.POLICY_TEMPLATES["public_transport"],
                }
            city_key = city_name.strip().lower()
            city_types = {
                "delhi": ["traffic", "construction", "industrial"],
                "mumbai": ["traffic", "industrial", "port"],
                "pune": ["traffic", "manufacturing", "construction"],
                "bengaluru": ["traffic", "construction", "commercial"],
                "hyderabad": ["traffic", "industrial", "construction"],
                "chennai": ["traffic", "industrial", "port"],
                "kolkata": ["traffic", "industrial", "port"],
                "ahmedabad": ["industrial", "traffic", "commercial"],
                "jaipur": ["traffic", "commercial", "residential"],
                "lucknow": ["traffic", "construction", "residential"],
            }
            city_profile_types = city_types.get(next((name for name in city_types if name in city_key), ""), [])
            types.update(city_profile_types)
            target_types = set(city_profile_types) or (types - {"urban", "residential"})
            if not target_types:
                target_types = types
            digest = hashlib.sha256(city_key.encode("utf-8")).digest()
            catalog_keys = list(self.POLICY_TEMPLATES)
            offset = int.from_bytes(digest[:2], "big") % len(catalog_keys)
            for index in range(len(catalog_keys)):
                key = catalog_keys[(offset + index) % len(catalog_keys)]
                policy = self.POLICY_TEMPLATES[key]
                if key not in applicable and set(policy["applicable_when"]) & target_types:
                    applicable[key] = policy
                if len(applicable) >= 6:
                    break
            
        return applicable

    def simulate_policy(self, current_data, selected_policies, city_name):
        baseline = {
            "pm25": current_data.get("pm2_5", 55.0),
            "pm10": current_data.get("pm10", 110.0),
            "no2": current_data.get("no2", 45.0),
            "so2": current_data.get("so2", 15.0),
            "co": current_data.get("co", 1.2),
            "o3": current_data.get("o3", 35.0),
            "aqi": current_data.get("aqi", 150)
        }
        
        simulated = baseline.copy()
        for p in selected_policies:
            if p in self.POLICY_TEMPLATES:
                impacts = self.POLICY_TEMPLATES[p]["impacts"]
                for pollutant, reduction in impacts.items():
                    # Handle naming inconsistency between model and template
                    p_key = pollutant.replace('pm2_5', 'pm25')
                    if p_key in simulated:
                        simulated[p_key] = max(simulated[p_key] * (1 + reduction), baseline[p_key] * 0.05)
                        
        pm_ratio = (simulated['pm25'] / baseline['pm25']) * 0.7 + (simulated['pm10'] / baseline['pm10']) * 0.3
        simulated['aqi'] = max(int(baseline['aqi'] * pm_ratio), 10)
        
        # Calculate reductions and benefits dynamically based on city scale heuristics
        return {
            "baseline": baseline,
            "simulated": simulated,
            "aqi_reduction": baseline['aqi'] - simulated['aqi'],
            "percent_improved": round((1 - pm_ratio) * 100, 1),
            "health_benefits_percent": round((1 - pm_ratio) * 100 * 0.15, 1)
        }
