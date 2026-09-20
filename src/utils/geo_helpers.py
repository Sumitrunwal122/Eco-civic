import math
import random
from typing import List, Dict, Any, Tuple

# Pre-defined Ward centroids and patrol route waypoints in Jodhpur (ULB-RJ-JDH-01)
DEFAULT_MUNICIPAL_ROUTES: Dict[str, List[Tuple[float, float]]] = {
    "Ward-101": [
        (26.2389, 73.0243),
        (26.2403, 73.0267),
        (26.2428, 73.0292),
        (26.2453, 73.0257),
        (26.2433, 73.0217),
        (26.2408, 73.0207),
    ],
    "Ward-102": [
        (26.2323, 73.0147),
        (26.2353, 73.0172),
        (26.2373, 73.0187),
        (26.2363, 73.0117),
        (26.2333, 73.0097),
    ],
    "Ward-103": [
        (26.2473, 73.0347),
        (26.2503, 73.0377),
        (26.2533, 73.0397),
        (26.2513, 73.0437),
        (26.2483, 73.0407),
    ],
    "Ward-104": [
        (26.2223, 73.0497),
        (26.2253, 73.0527),
        (26.2283, 73.0557),
        (26.2263, 73.0587),
        (26.2233, 73.0537),
    ]
}

# Initial fleet vehicles
INITIAL_MUNICIPAL_VEHICLES = [
    {
        "vehicle_id": "RJ-19-GA-1024",
        "driver_name": "Ramesh Kumar",
        "driver_phone": "+919876543210",
        "ward_no": "Ward-101",
        "vehicle_type": "Compactor Truck",
        "capacity_tons": 5.0,
        "current_load_tons": 2.8,
        "status": "Collecting",
        "speed_kmh": 22.5,
        "fuel_percent": 74
    },
    {
        "vehicle_id": "RJ-19-GA-2048",
        "driver_name": "Suresh Rathore",
        "driver_phone": "+919876543211",
        "ward_no": "Ward-102",
        "vehicle_type": "Tipper Auto",
        "capacity_tons": 1.5,
        "current_load_tons": 1.1,
        "status": "En Route to Segregation Plant",
        "speed_kmh": 34.0,
        "fuel_percent": 62
    },
    {
        "vehicle_id": "RJ-19-GA-3096",
        "driver_name": "Anil Choudhary",
        "driver_phone": "+919876543212",
        "ward_no": "Ward-103",
        "vehicle_type": "Compactor Truck",
        "capacity_tons": 5.0,
        "current_load_tons": 4.6,
        "status": "Heading to Landfill",
        "speed_kmh": 41.2,
        "fuel_percent": 48
    },
    {
        "vehicle_id": "RJ-19-GA-4112",
        "driver_name": "Mahendra Singh",
        "driver_phone": "+919876543213",
        "ward_no": "Ward-104",
        "vehicle_type": "Mini LCV",
        "capacity_tons": 2.5,
        "current_load_tons": 0.5,
        "status": "Collecting",
        "speed_kmh": 18.0,
        "fuel_percent": 88
    }
]

# Static public community waste bins following Swachh Bharat Abhiyan
INITIAL_COMMUNITY_BINS = [
    {
        "bin_id": "BIN-W101-01",
        "ward_no": "Ward-101",
        "landmark": "Near Sojati Gate Market",
        "latitude": 26.2413,
        "longitude": 73.0257,
        "bin_types": [
            {"category": "Wet Waste", "color": "Green", "fill_level": 65},
            {"category": "Dry Waste", "color": "Blue", "fill_level": 40},
            {"category": "Hazardous/E-Waste", "color": "Black", "fill_level": 15}
        ]
    },
    {
        "bin_id": "BIN-W102-01",
        "ward_no": "Ward-102",
        "landmark": "Sardarpura Vegetable Mandi Entrance",
        "latitude": 26.2343,
        "longitude": 73.0137,
        "bin_types": [
            {"category": "Wet Waste", "color": "Green", "fill_level": 92},
            {"category": "Dry Waste", "color": "Blue", "fill_level": 78},
            {"category": "Hazardous/E-Waste", "color": "Black", "fill_level": 30}
        ]
    },
    {
        "bin_id": "BIN-W103-01",
        "ward_no": "Ward-103",
        "landmark": "Ratanada Circle Junction",
        "latitude": 26.2493,
        "longitude": 73.0367,
        "bin_types": [
            {"category": "Wet Waste", "color": "Green", "fill_level": 45},
            {"category": "Dry Waste", "color": "Blue", "fill_level": 55},
            {"category": "Hazardous/E-Waste", "color": "Black", "fill_level": 10}
        ]
    }
]


class VehicleMovementSimulator:
    """
    Simulates real-time movements of municipal garbage trucks across ward routes.
    Adds slight realistic jitter and moves linearly along waypoint paths.
    """
    def __init__(self):
        self.state: Dict[str, Dict[str, Any]] = {}
        for v in INITIAL_MUNICIPAL_VEHICLES:
            ward = v["ward_no"]
            waypoints = DEFAULT_MUNICIPAL_ROUTES.get(ward, [(26.2389, 73.0243)])
            self.state[v["vehicle_id"]] = {
                **v,
                "current_waypoint_idx": 0,
                "latitude": waypoints[0][0],
                "longitude": waypoints[0][1],
                "progress_ratio": 0.0,
            }

    def step(self) -> List[Dict[str, Any]]:
        """Advances vehicle positions along their designated ward routes."""
        updated = []
        for v_id, data in self.state.items():
            ward = data["ward_no"]
            route = DEFAULT_MUNICIPAL_ROUTES.get(ward, [(data["latitude"], data["longitude"])])
            total_points = len(route)
            curr_idx = data["current_waypoint_idx"]
            next_idx = (curr_idx + 1) % total_points

            curr_pt = route[curr_idx]
            next_pt = route[next_idx]

            # Advance progress ratio (0.0 to 1.0)
            data["progress_ratio"] += random.uniform(0.08, 0.15)
            if data["progress_ratio"] >= 1.0:
                data["progress_ratio"] = 0.0
                data["current_waypoint_idx"] = next_idx
                curr_pt = next_pt
                next_idx = (next_idx + 1) % total_points
                next_pt = route[next_idx]

            # Linear interpolation with slight GPS drift
            ratio = data["progress_ratio"]
            jitter_lat = random.uniform(-0.0001, 0.0001)
            jitter_lng = random.uniform(-0.0001, 0.0001)
            new_lat = curr_pt[0] + ratio * (next_pt[0] - curr_pt[0]) + jitter_lat
            new_lng = curr_pt[1] + ratio * (next_pt[1] - curr_pt[1]) + jitter_lng

            data["latitude"] = round(new_lat, 6)
            data["longitude"] = round(new_lng, 6)
            data["speed_kmh"] = round(max(5.0, data["speed_kmh"] + random.uniform(-3, 3)), 1)
            data["fuel_percent"] = max(10, round(data["fuel_percent"] - random.uniform(0.01, 0.05), 1))

            updated.append({
                "vehicle_id": data["vehicle_id"],
                "driver_name": data["driver_name"],
                "driver_phone": data["driver_phone"],
                "ward_no": data["ward_no"],
                "vehicle_type": data["vehicle_type"],
                "capacity_tons": data["capacity_tons"],
                "current_load_tons": round(data["current_load_tons"], 2),
                "status": data["status"],
                "speed_kmh": data["speed_kmh"],
                "fuel_percent": data["fuel_percent"],
                "latitude": data["latitude"],
                "longitude": data["longitude"]
            })
        return updated


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in meters."""
    R = 6371000.0  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# Global singleton simulator
fleet_simulator = VehicleMovementSimulator()