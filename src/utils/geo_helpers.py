import math
import random
from typing import List, Dict, Any, Tuple

# Pre-defined Ward centroids and patrol route waypoints in Bengaluru (ULB-KA-BLR-01)
DEFAULT_MUNICIPAL_ROUTES: Dict[str, List[Tuple[float, float]]] = {
    "Ward-101": [
        (12.9716, 77.5946),
        (12.9730, 77.5970),
        (12.9755, 77.5995),
        (12.9780, 77.5960),
        (12.9760, 77.5920),
        (12.9735, 77.5910),
    ],
    "Ward-102": [
        (12.9650, 77.5850),
        (12.9680, 77.5875),
        (12.9700, 77.5890),
        (12.9690, 77.5820),
        (12.9660, 77.5800),
    ],
    "Ward-103": [
        (12.9800, 77.6050),
        (12.9830, 77.6080),
        (12.9860, 77.6100),
        (12.9840, 77.6140),
        (12.9810, 77.6110),
    ],
    "Ward-104": [
        (12.9550, 77.6200),
        (12.9580, 77.6230),
        (12.9610, 77.6260),
        (12.9590, 77.6290),
        (12.9560, 77.6240),
    ]
}

# Initial fleet vehicles
INITIAL_MUNICIPAL_VEHICLES = [
    {
        "vehicle_id": "KA-01-GA-1024",
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
        "vehicle_id": "KA-01-GA-2048",
        "driver_name": "Suresh Gowda",
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
        "vehicle_id": "KA-01-GA-3096",
        "driver_name": "Anil Basumatary",
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
        "vehicle_id": "KA-01-GA-4112",
        "driver_name": "Muniswamy R",
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
        "landmark": "Near Commercial Street Metro Gate A",
        "latitude": 12.9740,
        "longitude": 77.5960,
        "bin_types": [
            {"category": "Wet Waste", "color": "Green", "fill_level": 65},
            {"category": "Dry Waste", "color": "Blue", "fill_level": 40},
            {"category": "Hazardous/E-Waste", "color": "Black", "fill_level": 15}
        ]
    },
    {
        "bin_id": "BIN-W102-01",
        "ward_no": "Ward-102",
        "landmark": "City Market Vegetable Mandi Entrance",
        "latitude": 12.9670,
        "longitude": 77.5840,
        "bin_types": [
            {"category": "Wet Waste", "color": "Green", "fill_level": 92},
            {"category": "Dry Waste", "color": "Blue", "fill_level": 78},
            {"category": "Hazardous/E-Waste", "color": "Black", "fill_level": 30}
        ]
    },
    {
        "bin_id": "BIN-W103-01",
        "ward_no": "Ward-103",
        "landmark": "MG Road Brigade Junction",
        "latitude": 12.9820,
        "longitude": 77.6070,
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
            waypoints = DEFAULT_MUNICIPAL_ROUTES.get(ward, [(12.9716, 77.5946)])
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
