"""Curated Pune locations shared by AQI mapping and routing search."""

PUNE_LOCALITIES = [
    # Physical monitoring station locations. Their AQI remains modeled unless
    # a live official_aqi value is supplied by a government station response.
    {"name": "Shivajinagar CAAQMS (IITM)", "lat": 18.5296, "lon": 73.8496, "category": "Official Station", "location_type": "official_station", "factor": 1.18, "pm_extra": 10, "no2_extra": 8, "aliases": ["shivajinagar caaqms"]},
    {"name": "Katraj CAAQMS (MPCB)", "lat": 18.4599, "lon": 73.8523, "category": "Official Station", "location_type": "official_station", "factor": 0.90, "pm_extra": -4, "no2_extra": -3, "aliases": ["katraj caaqms"]},
    {"name": "Pashan CAAQMS (IITM)", "lat": 18.5364, "lon": 73.8055, "category": "Official Station", "location_type": "official_station", "factor": 0.82, "pm_extra": -8, "no2_extra": -5, "aliases": ["pashan caaqms"]},
    {"name": "Lohegaon CAAQMS (IITM)", "lat": 18.5779, "lon": 73.9081, "category": "Official Station", "location_type": "official_station", "factor": 1.10, "pm_extra": 6, "no2_extra": 4, "aliases": ["lohegaon caaqms"]},
    {"name": "Karve Road CAAQMS (MPCB)", "lat": 18.4975, "lon": 73.8135, "category": "Official Station", "location_type": "official_station", "factor": 1.05, "pm_extra": 4, "no2_extra": 3, "aliases": ["karve road caaqms"]},
    {"name": "Hadapsar CAAQMS (IITM)", "lat": 18.5022, "lon": 73.9275, "category": "Official Station", "location_type": "official_station", "factor": 1.25, "pm_extra": 14, "no2_extra": 10, "aliases": ["hadapsar caaqms"]},
    {"name": "Nigdi CAAQMS (MPCB)", "lat": 18.6617, "lon": 73.7623, "category": "Official Station", "location_type": "official_station", "factor": 1.20, "pm_extra": 12, "no2_extra": 8, "aliases": ["nigdi caaqms"]},
    {"name": "Alandi CAAQMS (MPCB)", "lat": 18.6737, "lon": 73.8915, "category": "Official Station", "location_type": "official_station", "factor": 1.15, "pm_extra": 8, "no2_extra": 6, "aliases": ["alandi caaqms"]},
    {"name": "Bhosari CAAQMS (MPCB)", "lat": 18.6421, "lon": 73.8491, "category": "Official Station", "location_type": "official_station", "factor": 1.35, "pm_extra": 18, "no2_extra": 12, "aliases": ["bhosari caaqms"]},
    {"name": "Bhumkar Chowk (Wakad)", "lat": 18.6062, "lon": 73.7500, "category": "Official Station", "location_type": "official_station", "factor": 1.12, "pm_extra": 6, "no2_extra": 5, "aliases": ["bhumkar chowk"]},
    # Hackathon corridor and East Pune
    {"name": "G.H. Raisoni Engineering, Wagholi", "lat": 18.5734111, "lon": 73.9800994, "category": "College / University", "factor": 1.08, "pm_extra": 4, "no2_extra": 3, "aliases": ["gh raisoni engineering", "rais engineering", "rais. engineering", "wagholi raisoni"]},
    {"name": "G.H. Raisoni Skill Tech University, Yerawada", "lat": 18.5547055, "lon": 73.8917909, "category": "College / University", "factor": 1.08, "pm_extra": 4, "no2_extra": 3, "aliases": ["gh raisoni skill tech", "rais skill tech", "skill tech", "rais university"]},
    {"name": "Wagholi", "lat": 18.5806299, "lon": 73.9833099, "category": "Residential Suburb", "factor": 1.10, "pm_extra": 5, "no2_extra": 4, "aliases": ["wagholi pune"]},
    {"name": "Kharadi", "lat": 18.5513, "lon": 73.9417, "category": "IT / Residential", "factor": 1.05, "pm_extra": 3, "no2_extra": 2, "aliases": ["kharadi pune"]},
    {"name": "Viman Nagar", "lat": 18.5704, "lon": 73.9133, "category": "Residential Suburb", "factor": 1.08, "pm_extra": 5, "no2_extra": 3, "aliases": ["viman nagar pune", "viman"]},
    {"name": "Yerawada", "lat": 18.5587, "lon": 73.8955, "category": "Urban Suburb", "factor": 1.08, "pm_extra": 5, "no2_extra": 4, "aliases": ["yerwada"]},
    {"name": "Kalyani Nagar", "lat": 18.5463, "lon": 73.9034, "category": "Residential Suburb", "factor": 1.02, "pm_extra": 2, "no2_extra": 2, "aliases": ["kalyani nagar pune"]},
    {"name": "Koregaon Park", "lat": 18.5362, "lon": 73.8940, "category": "Green / Residential", "factor": 0.85, "pm_extra": -8, "no2_extra": -5, "aliases": ["koregaon park pune", "kp pune"]},
    {"name": "Bund Garden", "lat": 18.5417, "lon": 73.8847, "category": "Urban Park", "factor": 0.92, "pm_extra": -3, "no2_extra": -2, "aliases": ["bund garden pune"]},
    {"name": "Mundhwa", "lat": 18.5298, "lon": 73.9367, "category": "Urban Suburb", "factor": 1.12, "pm_extra": 6, "no2_extra": 4, "aliases": ["mundhwa pune"]},
    {"name": "Keshav Nagar", "lat": 18.5368, "lon": 73.9316, "category": "Residential Suburb", "factor": 1.06, "pm_extra": 3, "no2_extra": 2, "aliases": ["keshav nagar pune"]},
    {"name": "Hadapsar", "lat": 18.5089, "lon": 73.9260, "category": "Urban Suburb", "factor": 1.20, "pm_extra": 12, "no2_extra": 9, "aliases": ["hadapsar pune"]},
    {"name": "Magarpatta City", "lat": 18.5135, "lon": 73.9314, "category": "Tech Park", "factor": 0.94, "pm_extra": -3, "no2_extra": -2, "aliases": ["magarpatta", "magarpatta city pune"]},
    {"name": "Dhanori", "lat": 18.5907, "lon": 73.8913, "category": "Residential Suburb", "factor": 1.04, "pm_extra": 3, "no2_extra": 2, "aliases": ["dhanori pune"]},
    {"name": "Vishrantwadi", "lat": 18.5726, "lon": 73.8783, "category": "Residential Suburb", "factor": 1.06, "pm_extra": 4, "no2_extra": 3, "aliases": ["vishrantwadi pune"]},
    {"name": "Pune Airport", "lat": 18.5821, "lon": 73.9197, "category": "Transport Hub", "factor": 1.12, "pm_extra": 7, "no2_extra": 5, "aliases": ["pune international airport", "lohegaon airport"]},
    {"name": "Pune Railway Station", "lat": 18.5286, "lon": 73.8743, "category": "Transport Hub", "factor": 1.18, "pm_extra": 10, "no2_extra": 7, "aliases": ["pune station", "pune railway"]},
    # Central Pune
    {"name": "Shivajinagar", "lat": 18.5308, "lon": 73.8475, "category": "Urban Center", "factor": 1.18, "pm_extra": 10, "no2_extra": 8, "aliases": ["shivaji nagar", "shivajinagar pune"]},
    {"name": "Deccan Gymkhana", "lat": 18.5167, "lon": 73.8417, "category": "Commercial Center", "factor": 1.06, "pm_extra": 4, "no2_extra": 3, "aliases": ["deccan", "deccan gymkhana pune"]},
    {"name": "Pune Camp", "lat": 18.5186, "lon": 73.8786, "category": "Commercial Center", "factor": 1.18, "pm_extra": 10, "no2_extra": 7, "aliases": ["camp pune", "pune cantonment"]},
    {"name": "MG Road, Pune", "lat": 18.5158, "lon": 73.8793, "category": "Commercial Center", "factor": 1.20, "pm_extra": 12, "no2_extra": 8, "aliases": ["mg road pune", "mahatma gandhi road pune"]},
    {"name": "Swargate", "lat": 18.5018, "lon": 73.8586, "category": "Transit Hub", "factor": 1.28, "pm_extra": 16, "no2_extra": 11, "aliases": ["swargate pune"]},
    {"name": "Sadashiv Peth", "lat": 18.5134, "lon": 73.8497, "category": "Urban Neighborhood", "factor": 1.08, "pm_extra": 5, "no2_extra": 3, "aliases": ["sadashiv peth pune"]},
    {"name": "Shaniwar Peth", "lat": 18.5200, "lon": 73.8530, "category": "Urban Neighborhood", "factor": 1.10, "pm_extra": 6, "no2_extra": 4, "aliases": ["shaniwar peth pune"]},
    {"name": "Narayan Peth", "lat": 18.5183, "lon": 73.8512, "category": "Urban Neighborhood", "factor": 1.10, "pm_extra": 6, "no2_extra": 4, "aliases": ["narayan peth pune"]},
    {"name": "Kasba Peth", "lat": 18.5236, "lon": 73.8567, "category": "Urban Neighborhood", "factor": 1.14, "pm_extra": 8, "no2_extra": 5, "aliases": ["kasba peth pune"]},
    {"name": "Shaniwar Wada", "lat": 18.5195, "lon": 73.8553, "category": "Landmark", "factor": 1.08, "pm_extra": 5, "no2_extra": 3, "aliases": ["shaniwar wada pune"]},
    {"name": "Model Colony", "lat": 18.5333, "lon": 73.8366, "category": "Residential Suburb", "factor": 0.96, "pm_extra": -2, "no2_extra": -1, "aliases": ["model colony pune"]},
    {"name": "Erandwane", "lat": 18.5035, "lon": 73.8318, "category": "Residential Suburb", "factor": 0.96, "pm_extra": -2, "no2_extra": -1, "aliases": ["erandwane pune"]},
    {"name": "Prabhat Road", "lat": 18.5103, "lon": 73.8310, "category": "Residential Suburb", "factor": 0.92, "pm_extra": -3, "no2_extra": -2, "aliases": ["prabhat road pune"]},
    # West Pune
    {"name": "Kothrud", "lat": 18.5074, "lon": 73.8077, "category": "Residential Suburb", "factor": 0.95, "pm_extra": -2, "no2_extra": -2, "aliases": ["kothrud pune"]},
    {"name": "Karve Nagar", "lat": 18.4829, "lon": 73.8214, "category": "Residential Suburb", "factor": 0.98, "pm_extra": 0, "no2_extra": 1, "aliases": ["karvenagar", "karve nagar pune"]},
    {"name": "Aundh", "lat": 18.5580, "lon": 73.8075, "category": "Residential Suburb", "factor": 0.96, "pm_extra": -2, "no2_extra": -1, "aliases": ["aundh pune"]},
    {"name": "Baner", "lat": 18.5590, "lon": 73.7868, "category": "Residential Suburb", "factor": 1.02, "pm_extra": 2, "no2_extra": 2, "aliases": ["baner pune"]},
    {"name": "Balewadi", "lat": 18.5767, "lon": 73.7683, "category": "Residential Suburb", "factor": 1.02, "pm_extra": 2, "no2_extra": 2, "aliases": ["balewadi pune"]},
    {"name": "Pashan", "lat": 18.5364, "lon": 73.8055, "category": "Residential Suburb", "factor": 0.82, "pm_extra": -8, "no2_extra": -5, "aliases": ["pashan pune"]},
    {"name": "Wakad", "lat": 18.5987, "lon": 73.7660, "category": "Residential Suburb", "factor": 1.00, "pm_extra": 1, "no2_extra": 1, "aliases": ["wakad pune"]},
    {"name": "Hinjawadi", "lat": 18.5913, "lon": 73.7389, "category": "Tech Hub", "factor": 1.22, "pm_extra": 12, "no2_extra": 8, "aliases": ["hinjewadi", "hinjawadi pune"]},
    {"name": "Bavdhan", "lat": 18.5086, "lon": 73.7786, "category": "Residential Suburb", "factor": 0.96, "pm_extra": -1, "no2_extra": -1, "aliases": ["bavdhan pune"]},
    {"name": "Pimple Saudagar", "lat": 18.5986, "lon": 73.7997, "category": "Residential Suburb", "factor": 1.04, "pm_extra": 3, "no2_extra": 2, "aliases": ["pimple saudagar pune"]},
    # South Pune
    {"name": "Katraj", "lat": 18.4599, "lon": 73.8523, "category": "Urban Suburb", "factor": 0.90, "pm_extra": -4, "no2_extra": -3, "aliases": ["katraj pune"]},
    {"name": "Dhankawadi", "lat": 18.4663, "lon": 73.8493, "category": "Residential Suburb", "factor": 1.02, "pm_extra": 2, "no2_extra": 2, "aliases": ["dhankawadi pune"]},
    {"name": "Bibwewadi", "lat": 18.4772, "lon": 73.8615, "category": "Residential Suburb", "factor": 1.06, "pm_extra": 4, "no2_extra": 3, "aliases": ["bibwewadi pune"]},
    {"name": "Kondhwa", "lat": 18.4626, "lon": 73.8956, "category": "Residential Suburb", "factor": 1.12, "pm_extra": 7, "no2_extra": 5, "aliases": ["kondhwa pune"]},
    {"name": "Wanowrie", "lat": 18.4861, "lon": 73.8987, "category": "Residential Suburb", "factor": 1.08, "pm_extra": 5, "no2_extra": 4, "aliases": ["wanowrie pune"]},
    {"name": "NIBM", "lat": 18.4745, "lon": 73.9077, "category": "Residential Suburb", "factor": 1.04, "pm_extra": 3, "no2_extra": 2, "aliases": ["nibm pune"]},
    {"name": "Undri", "lat": 18.4539, "lon": 73.9125, "category": "Residential Suburb", "factor": 1.06, "pm_extra": 4, "no2_extra": 3, "aliases": ["undri pune"]},
    {"name": "Parvati", "lat": 18.4896, "lon": 73.8563, "category": "Urban Neighborhood", "factor": 1.02, "pm_extra": 2, "no2_extra": 2, "aliases": ["parvati pune"]},
    # PCMC
    {"name": "Pimpri", "lat": 18.6298, "lon": 73.7997, "category": "Urban Suburb", "factor": 1.18, "pm_extra": 9, "no2_extra": 6, "aliases": ["pimpri pune"]},
    {"name": "Chinchwad", "lat": 18.6279, "lon": 73.7813, "category": "Urban Suburb", "factor": 1.16, "pm_extra": 8, "no2_extra": 6, "aliases": ["chinchwad pune"]},
    {"name": "Akurdi", "lat": 18.6507, "lon": 73.7647, "category": "Urban Suburb", "factor": 1.08, "pm_extra": 5, "no2_extra": 4, "aliases": ["akurdi pune"]},
    {"name": "Nigdi", "lat": 18.6617, "lon": 73.7623, "category": "Urban Suburb", "factor": 1.20, "pm_extra": 12, "no2_extra": 8, "aliases": ["nigdi pune"]},
    {"name": "Bhosari", "lat": 18.6421, "lon": 73.8491, "category": "Industrial Suburb", "factor": 1.35, "pm_extra": 18, "no2_extra": 12, "aliases": ["bhosari pune"]},
    {"name": "PCMC Bhavan", "lat": 18.6291, "lon": 73.7997, "category": "Civic Center", "factor": 1.12, "pm_extra": 6, "no2_extra": 4, "aliases": ["pcmc", "pcmc headquarters", "pcmc office"]},
    {"name": "Pimple Gurav", "lat": 18.6038, "lon": 73.8211, "category": "Residential Suburb", "factor": 1.06, "pm_extra": 4, "no2_extra": 3, "aliases": ["pimple gurav pune"]},
    {"name": "Moshi", "lat": 18.6645, "lon": 73.8428, "category": "Residential Suburb", "factor": 1.08, "pm_extra": 5, "no2_extra": 4, "aliases": ["moshi pune"]},
    {"name": "Dapodi", "lat": 18.5813, "lon": 73.8310, "category": "Urban Suburb", "factor": 1.10, "pm_extra": 6, "no2_extra": 4, "aliases": ["dapodi pune"]},
    {"name": "Sangvi", "lat": 18.5794, "lon": 73.8234, "category": "Residential Suburb", "factor": 1.04, "pm_extra": 3, "no2_extra": 2, "aliases": ["sangvi pune"]},
    {"name": "Thergaon", "lat": 18.6065, "lon": 73.7586, "category": "Residential Suburb", "factor": 1.05, "pm_extra": 3, "no2_extra": 2, "aliases": ["thergaon pune"]},
]


def _normalize(value):
    return " ".join(str(value or "").lower().replace(".", " ").split())


def find_pune_locations(query):
    normalized = _normalize(query)
    if not normalized:
        return []
    matches = []
    for location in PUNE_LOCALITIES:
        terms = [location["name"], *location.get("aliases", [])]
        if any(normalized in _normalize(term) for term in terms):
            matches.append(location)
    return matches


def find_pune_location_in_text(text):
    normalized = _normalize(text)
    if not normalized:
        return None
    for location in PUNE_LOCALITIES:
        terms = [location["name"], *location.get("aliases", [])]
        if any(_normalize(term) in normalized for term in terms):
            return location
    return None
