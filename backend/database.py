import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Η σύνδεση βάσης δεδομένων διαβάζεται από το environment variable
# DATABASE_URL, ΟΧΙ hardcoded εδώ στον κώδικα (έτσι είναι ασφαλές να ανέβει
# δημόσια στο GitHub -- δεν εκθέτει κανέναν πραγματικό κωδικό).
#
# Αν δεν έχει οριστεί DATABASE_URL (π.χ. όταν τρέχεις τοπικά για δοκιμή του
# demo), χρησιμοποιείται αυτόματα μια τοπική SQLite βάση -- ένα απλό αρχείο
# (demo.db), χωρίς να χρειάζεται εγκατεστημένο MySQL server. Ιδανικό για
# demo/portfolio.
#
# Στο πραγματικό backend του συμβούλου, ορίζεται το environment variable:
#   DATABASE_URL=mysql+pymysql://root:<πραγματικός κωδικός>@localhost/energy_consultant_db

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./demo.db")

# Η SQLite χρειάζεται αυτή τη ρύθμιση για να δουλεύει σωστά με το FastAPI
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency που θα χρησιμοποιούν τα endpoints του FastAPI
    για να παίρνουν μια session προς τη βάση, και να την κλείνουν
    αυτόματα μετά το request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
