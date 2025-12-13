from os import environ

DATETIME_FORMAT: str = environ.get("DATETIME_FORMAT", "%Y-%m-%d %H:%M")

PG_HOST = environ.get("PG_HOST", "db")
PG_PORT = environ.get("PG_PORT", "5432")
PG_NAME = environ.get("PG_NAME", "postgres")
PG_USER = environ.get("PG_USER", "postgres")
PG_PASSWORD = environ.get("PG_PASSWORD", "postgres")

TESTING = environ.get("TEST", "0")
DEVELOPMENT = environ.get("DEVELOPMENT", "0")

DATETIME_FORMAT = "%Y-%m-%d %H:%M"
API_VERSION = 2
API_PREFIX = f"/api/v{API_VERSION}"
