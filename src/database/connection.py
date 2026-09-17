import asyncio
from typing import Optional, Dict, Any, List
import motor.motor_asyncio
from pymongo import ASCENDING, GEOSPHERE
from config.settings import settings
from src.utils.logger import get_logger

logger = get_logger("database.connection")


class InMemoryFallbackCollection:
    """
    In-memory async mock collection for seamless local development, testing,
    and demo runs when external MongoDB daemon is not actively started.
    """
    def __init__(self, name: str):
        self.name = name
        self._data: Dict[str, Dict[str, Any]] = {}

    async def find_one(self, filter_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for doc in self._data.values():
            match = True
            for k, v in filter_dict.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                return dict(doc)
        return None

    def find(self, filter_dict: Optional[Dict[str, Any]] = None):
        filter_dict = filter_dict or {}
        results = []
        for doc in self._data.values():
            match = True
            for k, v in filter_dict.items():
                if isinstance(v, dict) and "$in" in v:
                    if doc.get(k) not in v["$in"]:
                        match = False
                        break
                elif doc.get(k) != v:
                    match = False
                    break
            if match:
                results.append(dict(doc))

        class AsyncCursor:
            def __init__(self, items: List[Dict[str, Any]]):
                self._items = items

            def sort(self, key, direction=1):
                # Reverse if direction is -1
                rev = (direction == -1 or direction == ASCENDING)
                try:
                    self._items.sort(key=lambda x: str(x.get(key, "")), reverse=rev)
                except Exception:
                    pass
                return self

            def limit(self, n: int):
                self._items = self._items[:n]
                return self

            async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
                if length is not None:
                    return self._items[:length]
                return self._items

            def __aiter__(self):
                self._iter = iter(self._items)
                return self

            async def __anext__(self):
                try:
                    return next(self._iter)
                except StopIteration:
                    raise StopAsyncIteration

        return AsyncCursor(results)

    async def insert_one(self, doc: Dict[str, Any]):
        doc_id = str(doc.get("_id", len(self._data) + 1))
        doc["_id"] = doc_id
        self._data[doc_id] = dict(doc)
        
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertResult(doc_id)

    async def update_one(self, filter_dict: Dict[str, Any], update_dict: Dict[str, Any]):
        doc = await self.find_one(filter_dict)
        if doc:
            doc_id = str(doc["_id"])
            if "$set" in update_dict:
                self._data[doc_id].update(update_dict["$set"])
            else:
                self._data[doc_id].update(update_dict)
            class UpdateResult:
                modified_count = 1
            return UpdateResult()
        class UpdateResult:
            modified_count = 0
        return UpdateResult()

    async def count_documents(self, filter_dict: Optional[Dict[str, Any]] = None) -> int:
        res = await self.find(filter_dict).to_list()
        return len(res)

    async def create_index(self, *args, **kwargs):
        return "index_mock_ok"


class InMemoryFallbackDatabase:
    """In-memory fallback database for local tests or when MongoDB is unreachable."""
    def __init__(self, name: str):
        self.name = name
        self._collections: Dict[str, InMemoryFallbackCollection] = {}

    def __getitem__(self, item: str) -> InMemoryFallbackCollection:
        if item not in self._collections:
            self._collections[item] = InMemoryFallbackCollection(item)
        return self._collections[item]

    def get_collection(self, item: str) -> InMemoryFallbackCollection:
        return self[item]


class DatabaseManager:
    """Manages Async Motor MongoDB connection with indexes and graceful fallback."""
    def __init__(self):
        self.client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
        self.db: Any = None
        self.is_connected: bool = False
        self.is_fallback: bool = False

    async def connect(self):
        """Initializes connection to MongoDB with timeout check."""
        try:
            logger.info("Connecting to MongoDB...", extra={"endpoint": "db_connect", "url": settings.MONGODB_URL})
            # Connect with a 2-second timeout to quickly detect availability
            self.client = motor.motor_asyncio.AsyncIOMotorClient(
                settings.MONGODB_URL,
                serverSelectionTimeoutMS=2000
            )
            # Ping database
            await self.client.admin.command('ping')
            self.db = self.client[settings.DATABASE_NAME]
            self.is_connected = True
            self.is_fallback = False
            logger.info("Successfully connected to MongoDB", extra={"database": settings.DATABASE_NAME})
            await self.create_indexes()
        except Exception as e:
            logger.warning(
                f"MongoDB connection failed ({e}). Activating in-memory persistence fallback for offline/development run.",
                extra={"fallback_mode": True}
            )
            self.db = InMemoryFallbackDatabase(settings.DATABASE_NAME)
            self.is_connected = True
            self.is_fallback = True

    async def create_indexes(self):
        """Creates unique and geospatial indexes."""
        if self.is_fallback:
            return
        try:
            # Users indexes
            users_col = self.db.users
            await users_col.create_index([("phone", ASCENDING)], unique=True)
            await users_col.create_index([("email", ASCENDING)], sparse=True)
            await users_col.create_index([("role", ASCENDING)])
            await users_col.create_index([("ward_no", ASCENDING)])

            # Complaints indexes
            complaints_col = self.db.complaints
            await complaints_col.create_index([("location", GEOSPHERE)])
            await complaints_col.create_index([("ward_no", ASCENDING)])
            await complaints_col.create_index([("status", ASCENDING)])
            await complaints_col.create_index([("citizen_id", ASCENDING)])
            await complaints_col.create_index([("created_at", ASCENDING)])

            # Attendance indexes
            attendance_col = self.db.attendance
            await attendance_col.create_index([("staff_id", ASCENDING)])
            await attendance_col.create_index([("date_str", ASCENDING)])
            await attendance_col.create_index([("ward_no", ASCENDING)])

            # Community Bins
            bins_col = self.db.bins
            await bins_col.create_index([("location", GEOSPHERE)])
            await bins_col.create_index([("ward_no", ASCENDING)])

            logger.info("Database indexes successfully verified and initialized.")
        except Exception as e:
            logger.error(f"Error creating database indexes: {e}")

    async def disconnect(self):
        """Closes the MongoDB connection."""
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("MongoDB connection closed.")


db_manager = DatabaseManager()


def get_db():
    """Dependency provider for database instance."""
    return db_manager.db
