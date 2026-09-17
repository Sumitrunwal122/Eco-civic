import asyncio
from typing import List, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from src.utils.geo_helpers import fleet_simulator, INITIAL_COMMUNITY_BINS
from src.utils.logger import get_logger

logger = get_logger("api.routes_fleet")
router = APIRouter(prefix="/api/fleet", tags=["Municipal Fleet Vehicles & Telemetry"])


class ConnectionManager:
    """Manages active WebSocket connections for real-time fleet GPS updates."""
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_fleet_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint broadcasting real-time municipal vehicle GPS telemetry
    every 2 seconds to connected dashboards and map components.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Generate simulated movement step for trucks
            fleet_data = fleet_simulator.step()
            payload = {
                "event_type": "FLEET_GPS_UPDATE",
                "timestamp": fleet_simulator.state["KA-01-GA-1024"]["latitude"],  # heartbeat marker
                "vehicles": fleet_data,
                "community_bins": INITIAL_COMMUNITY_BINS
            }
            await websocket.send_json(payload)
            await asyncio.sleep(2.0)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


@router.get("/trucks")
async def get_fleet_trucks_snapshot():
    """Returns current live location snapshot of all municipal waste trucks."""
    return {
        "status": "success",
        "vehicles": fleet_simulator.step(),
        "total_active_vehicles": len(fleet_simulator.state)
    }


@router.get("/bins")
async def get_community_bins_snapshot():
    """Returns Swachh Bharat community dustbin locations and fill levels."""
    return {
        "status": "success",
        "community_bins": INITIAL_COMMUNITY_BINS
    }
