"""
Script δημιουργίας δειγματικών (fake) δεδομένων για το demo.

Τρέξε το μία φορά (τοπικά ή στο Render μέσω Shell) για να γεμίσει η demo
βάση με ψεύτικους πελάτες/συμβόλαια -- έτσι το demo δείχνει ρεαλιστικό,
χωρίς κανένα πραγματικό στοιχείο πελάτη.

Δημιουργεί επίσης έναν demo χρήστη σύνδεσης:
    username: demo
    password: demo1234

Εκτέλεση: python seed_demo_data.py
"""
from datetime import date, timedelta

from database import engine, SessionLocal, Base
import models
import auth

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# --- Demo χρήστης σύνδεσης ---
if db.query(models.User).count() == 0:
    demo_user = models.User(
        username="demo",
        hashed_password=auth.get_password_hash("demo1234"),
    )
    db.add(demo_user)
    db.commit()
    print("Δημιουργήθηκε demo χρήστης σύνδεσης: demo / demo1234")
else:
    print("Υπάρχει ήδη χρήστης -- δεν δημιουργήθηκε νέος.")

# --- Δείγμα πελατών με συμβόλαια ---
if db.query(models.Client).count() == 0:
    today = date.today()

    sample_clients = [
        {
            "first_name": "Γιώργος", "last_name": "Παπαδόπουλος",
            "phone": "6912345678", "email": "g.papadopoulos@example.com",
            "contracts": [
                {"contract_type": "ρεύμα", "provider": "ΔΕΗ", "address": "Πατησίων 23, Αθήνα",
                 "tariff_name": "Οικιακό Απλό", "pricing_type": "Σταθερό",
                 "start_date": today - timedelta(days=200), "end_date": today + timedelta(days=20)},
                {"contract_type": "ίντερνετ", "provider": "Zenith", "address": "Πατησίων 23, Αθήνα",
                 "tariff_name": "Fiber 100", "pricing_type": "Σταθερό",
                 "start_date": today - timedelta(days=100), "end_date": today + timedelta(days=265)},
            ],
        },
        {
            "first_name": "Μαρία", "last_name": "Ιωάννου",
            "phone": "6944556677", "email": "m.ioannou@example.com",
            "contracts": [
                {"contract_type": "ρεύμα", "provider": "Protergia", "address": "Ερμού 10, Θεσσαλονίκη",
                 "tariff_name": "Green Power", "pricing_type": "Κυμαινόμενο",
                 "start_date": today - timedelta(days=60), "end_date": today + timedelta(days=120)},
                {"contract_type": "αέριο", "provider": "Φυσικό Αέριο", "address": "Ερμού 10, Θεσσαλονίκη",
                 "tariff_name": "Οικιακό", "pricing_type": "Σταθερό",
                 "start_date": today - timedelta(days=400), "end_date": today + timedelta(days=10)},
            ],
        },
        {
            "first_name": "Νίκος", "last_name": "Αντωνίου",
            "phone": "6977889900", "email": "n.antoniou@example.com",
            "contracts": [
                {"contract_type": "ρεύμα", "provider": "ΗΡΩΝ", "address": "Κύπρου 5, Πάτρα",
                 "tariff_name": "Value Plus", "pricing_type": "Σταθερό",
                 "start_date": today - timedelta(days=500), "end_date": today - timedelta(days=30)},
            ],
        },
    ]

    for c in sample_clients:
        client = models.Client(
            first_name=c["first_name"], last_name=c["last_name"],
            phone=c["phone"], email=c["email"],
        )
        db.add(client)
        db.commit()
        db.refresh(client)

        for ct in c["contracts"]:
            contract = models.Contract(
                client_id=client.id,
                contract_type=ct["contract_type"],
                provider=ct["provider"],
                address=ct["address"],
                tariff_name=ct["tariff_name"],
                pricing_type=ct["pricing_type"],
                start_date=ct["start_date"],
                end_date=ct["end_date"],
            )
            db.add(contract)
        db.commit()

    print(f"Δημιουργήθηκαν {len(sample_clients)} δείγματα πελατών με συμβόλαια.")
else:
    print("Υπάρχουν ήδη δεδομένα -- δεν προστέθηκε τίποτα.")

db.close()
