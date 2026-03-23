import os
from .base import *  # noqa: F401, F403

DEBUG = True

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "bibliotheque"),
        "USER": os.environ.get("POSTGRES_USER", "ciberobs"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "ciberobs_secret"),
        "HOST": os.environ.get("DB_HOST", "db"),
        "PORT": os.environ.get("DB_PORT", "5432"),
    }
}

# Parse DATABASE_URL if provided (Docker Compose)
database_url = os.environ.get("DATABASE_URL")
if database_url:
    import re

    match = re.match(
        r"postgres://(?P<user>[^:]+):(?P<password>[^@]+)@(?P<host>[^:]+):(?P<port>\d+)/(?P<name>.+)",
        database_url,
    )
    if match:
        DATABASES["default"] = {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": match.group("name"),
            "USER": match.group("user"),
            "PASSWORD": match.group("password"),
            "HOST": match.group("host"),
            "PORT": match.group("port"),
        }
