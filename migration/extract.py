"""
extract.py — MongoDB Atlas collection extractor.

Connects to the erp_radiance database via MONGO_URI env var and dumps
every collection to a list of raw documents. Called by migrate.py as
the first step of the ETL pipeline.

Environment variables (loaded from .env.migration):
  MONGO_URI — MongoDB Atlas SRV connection string

Usage (direct):
  python -c "from migration.extract import extract_all; data = extract_all()"
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load from .env.migration in the working directory.
# Running from the project root: python migration/migrate.py
# Running from migration/: python migrate.py
# Both cases are handled by dotenv searching upward if needed.
load_dotenv(".env.migration")

# Ordered list of all collections — order matters for id_map building
# and is used by migrate.py to iterate consistently.
COLLECTIONS = [
    "users",
    "companies",
    "contacts",
    "pipeline_stages",
    "deals",
    "tasks",
    "notes",
    "invoices",
    "invoice_items",
    "quotes",
    "payments",
    "accounts",
    "journal_entries",
    "journal_lines",
    "departments",
    "employees",
    "leave_requests",
    "payslips",
    "google_tokens",
    "audit_logs",
]


def extract_all() -> dict:
    """Connect to MongoDB Atlas and return all documents per collection.

    Returns:
        dict mapping collection_name -> list of raw pymongo documents.
        Each document is a plain Python dict with BSON types (ObjectId, datetime)
        preserved for the transform layer.

    Raises:
        KeyError: if MONGO_URI environment variable is not set.
        pymongo.errors.ServerSelectionTimeoutError: if connection fails.
    """
    uri = os.environ.get("MONGO_URI")
    if not uri:
        raise RuntimeError(
            "MONGO_URI environment variable is not set.\n"
            "Copy .env.migration.example to .env.migration and fill in credentials."
        )

    print(f"  Connecting to MongoDB Atlas...")
    client = MongoClient(uri, serverSelectionTimeoutMS=10000)

    # Ping to fail fast if credentials are wrong
    client.admin.command("ping")
    print(f"  Connected successfully.")

    db = client["erp_radiance"]
    data = {}

    for col in COLLECTIONS:
        docs = list(db[col].find({}))
        data[col] = docs
        print(f"  Extracted {len(docs):>6} docs from {col}")

    client.close()
    return data
