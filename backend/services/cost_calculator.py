import math

class CostCalculatorService:
    def __init__(self):
        # Configurable Defaults (can be overridden by environment or config later)
        self.prices = {
            "petrol": 105.0,      # INR per L
            "diesel": 92.0,       # INR per L
            "electricity": 10.0   # INR per kWh
        }
        
        self.vehicles = {
            "petrol_car": {
                "name": "Petrol Car",
                "fuel_type": "petrol",
                "efficiency": 15.0, # km/L
                "unit": "L"
            },
            "diesel_car": {
                "name": "Diesel Car",
                "fuel_type": "diesel",
                "efficiency": 20.0, # km/L
                "unit": "L"
            },
            "petrol_bike": {
                "name": "Petrol Bike",
                "fuel_type": "petrol",
                "efficiency": 45.0, # km/L
                "unit": "L"
            },
            "ev": {
                "name": "Electric Vehicle",
                "fuel_type": "electricity",
                "efficiency": 7.0,  # km/kWh
                "unit": "kWh"
            }
        }

    def get_vehicle_options(self):
        return [{"id": k, "name": v["name"]} for k, v in self.vehicles.items()]

    def calculate_route_cost(self, distance_km, duration_min, vehicle_id):
        if not distance_km or vehicle_id not in self.vehicles:
            return None
            
        vehicle = self.vehicles[vehicle_id]
        fuel_type = vehicle["fuel_type"]
        efficiency = vehicle["efficiency"]
        unit = vehicle["unit"]
        price_per_unit = self.prices.get(fuel_type, 0.0)
        
        if efficiency <= 0:
            return None
            
        energy_used = distance_km / efficiency
        estimated_cost = energy_used * price_per_unit
        
        return {
            "currency": "INR",
            "estimated": round(estimated_cost),
            "energyUsed": round(energy_used, 2),
            "energyUnit": unit,
            "vehicleName": vehicle["name"]
        }

    def compare_routes(self, routes, vehicle_id):
        """
        Takes a list of route objects and adds cost, impact, and tradeoff metrics.
        """
        if not routes:
            return routes
            
        # First pass: calculate individual costs and find baseline values
        valid_costs = []
        valid_times = []
        valid_aqis = []
        
        for r in routes:
            dist = r.get("distance_km", 0)
            dur = r.get("duration_min", 0)
            aqi = r.get("aqi_exposure_score", 70)
            
            cost_info = self.calculate_route_cost(dist, dur, vehicle_id)
            r["cost"] = cost_info
            
            if cost_info:
                valid_costs.append(cost_info["estimated"])
            if dur:
                valid_times.append(dur)
            if aqi:
                valid_aqis.append(aqi)
                
        # Find minimums for tradeoffs
        min_cost = min(valid_costs) if valid_costs else 0
        min_time = min(valid_times) if valid_times else 0
        min_aqi = min(valid_aqis) if valid_aqis else 0
        
        # Second pass: calculate tradeoffs
        for r in routes:
            r["tradeoff"] = None
            r["impact"] = {
                "aqiExposure": r.get("aqi_exposure_score", 0),
                "pollutionLevel": self._get_pollution_level(r.get("aqi_exposure_score", 0))
            }
            
            cost_val = r.get("cost", {}).get("estimated") if r.get("cost") else None
            time_val = r.get("duration_min")
            aqi_val = r.get("aqi_exposure_score")
            
            if cost_val is not None and time_val is not None:
                cost_diff = cost_val - min_cost
                time_diff = time_val - min_time
                aqi_diff = aqi_val - min_aqi if aqi_val else 0
                
                r["tradeoff"] = {
                    "costDifference": cost_diff,
                    "timeDifferenceMinutes": round(time_diff),
                    "pollutionDifference": aqi_diff
                }
                
        return routes

    def _get_pollution_level(self, aqi):
        if aqi <= 50: return "LOW"
        if aqi <= 100: return "MODERATE"
        if aqi <= 150: return "HIGH"
        return "SEVERE"
