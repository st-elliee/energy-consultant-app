from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta
import os
import uuid

from database import engine, get_db, Base
import models
import auth

# Δημιουργεί τους πίνακες αν δεν υπάρχουν ήδη (δεν πειράζει τους υπάρχοντες, απλά τσεκάρει)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Energy Consultant App")

# Επιτρέπει πρόσβαση από οποιαδήποτε συσκευή μέσα στο τοπικό δίκτυο (σπίτι) --
# ασφαλές γιατί δεν χρησιμοποιούμε cookies (μόνο Authorization header με token)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Φάκελος όπου θα αποθηκεύονται τα ανεβασμένα αρχεία (λογαριασμοί, ταυτότητες κτλ)
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ============================================================
# Authentication
# ============================================================

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> str:
    """Ελέγχει το JWT token σε κάθε προστατευμένο endpoint. Αν δεν είναι έγκυρο, μπλοκάρει."""
    username = auth.decode_access_token(token)
    if username is None:
        raise HTTPException(status_code=401, detail="Μη έγκυρα διαπιστευτήρια")

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Μη έγκυρα διαπιστευτήρια")

    return username


@app.post("/auth/register")
def register(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)),
):
    """Δημιουργεί νέο χρήστη.
    - Αν δεν υπάρχει ΚΑΝΕΝΑΣ χρήστης ακόμα: ανοιχτό σε όλους (πρώτη εγκατάσταση).
    - Αν υπάρχει ήδη έστω ένας: επιτρέπεται μόνο σε ήδη συνδεδεμένο χρήστη (χρειάζεται valid token),
      ώστε να μπορείς να προσθέτεις μελλοντικά συνεργάτες χωρίς να ξανανοίγεις την πόρτα σε όλους."""
    existing_users = db.query(models.User).count()

    if existing_users > 0:
        if not token or auth.decode_access_token(token) is None:
            raise HTTPException(status_code=401, detail="Χρειάζεται σύνδεση για να προστεθεί νέος χρήστης.")

    new_user = models.User(
        username=form_data.username,
        hashed_password=auth.get_password_hash(form_data.password),
    )
    db.add(new_user)
    db.commit()
    return {"message": "Ο χρήστης δημιουργήθηκε επιτυχώς."}


@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Λάθος όνομα χρήστη ή κωδικός.")

    token = auth.create_access_token(username=user.username)
    return {"access_token": token, "token_type": "bearer"}


# ============================================================
# Pydantic schemas (validation εισερχόμενων δεδομένων)
# ============================================================

class ClientCreate(BaseModel):
    first_name: str
    last_name: str
    phone: str
    email: Optional[str] = None
    afm: Optional[str] = None
    notes: Optional[str] = None


class ClientUpdate(BaseModel):
    """Ίδιο με το ClientCreate αλλά όλα προαιρετικά, για partial updates."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    afm: Optional[str] = None
    notes: Optional[str] = None


class ContractCreate(BaseModel):
    contract_type: str        # "ρεύμα", "αέριο" ή "ίντερνετ"
    provider: str
    address: Optional[str] = None    # διεύθυνση παροχής αυτού του συμβολαίου
    tariff_name: Optional[str] = None
    pricing_type: str          # "Σταθερό" ή "Κυμαινόμενο"
    start_date: date
    end_date: Optional[date] = None  # υποχρεωτικό μόνο για Σταθερό· για Κυμαινόμενο υπολογίζεται αυτόματα (+6 μήνες)
    notes: Optional[str] = None


class ContractUpdate(BaseModel):
    contract_type: Optional[str] = None
    provider: Optional[str] = None
    address: Optional[str] = None
    tariff_name: Optional[str] = None
    pricing_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None
    status: Optional[str] = None   # επιτρέπει και χειροκίνητη αλλαγή (πχ "ακυρώθηκε")


# ============================================================
# Βοηθητική λογική: αυτόματος υπολογισμός status συμβολαίου
# βάσει ημερομηνίας λήξης, εκτός αν έχει μπει χειροκίνητα "ακυρώθηκε"
# ============================================================

def add_months(d: date, months: int) -> date:
    """Προσθέτει μήνες σε μια ημερομηνία, χωρίς εξωτερικές βιβλιοθήκες."""
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    days_in_month = [31, 29 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 28,
                      31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    day = min(d.day, days_in_month[month - 1])
    return date(year, month, day)


def refresh_contract_status(contract: models.Contract, db: Session) -> models.Contract:
    if contract.status == "ακυρώθηκε":
        return contract  # ποτέ μην αγγίξεις χειροκίνητη ακύρωση

    today = date.today()
    if contract.end_date < today:
        new_status = "έληξε"
    elif (contract.end_date - today).days <= 35:
        new_status = "προς_ανανέωση"
    else:
        new_status = "ενεργό"

    if contract.status != new_status:
        contract.status = new_status
        db.commit()
        db.refresh(contract)

    return contract


# ============================================================
# Root
# ============================================================

@app.get("/")
def root():
    return {"message": "Energy Consultant API is running"}


# ============================================================
# Clients
# ============================================================

@app.get("/clients")
def get_clients(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Επιστρέφει λίστα με όλους τους πελάτες."""
    clients = db.query(models.Client).all()
    return [
        {
            "id": c.id,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "phone": c.phone,
            "email": c.email,
            "afm": c.afm,
        }
        for c in clients
    ]


@app.get("/clients/{client_id}")
def get_client(client_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Επιστρέφει στοιχεία ενός συγκεκριμένου πελάτη."""
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return {
        "id": client.id,
        "first_name": client.first_name,
        "last_name": client.last_name,
        "phone": client.phone,
        "email": client.email,
        "afm": client.afm,
        "notes": client.notes,
    }


@app.post("/clients")
def create_client(client: ClientCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Δημιουργεί νέο πελάτη στη βάση."""
    new_client = models.Client(
        first_name=client.first_name,
        last_name=client.last_name,
        phone=client.phone,
        email=client.email,
        afm=client.afm,
        notes=client.notes,
    )
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    return {
        "id": new_client.id,
        "first_name": new_client.first_name,
        "last_name": new_client.last_name,
        "phone": new_client.phone,
        "email": new_client.email,
    }


@app.put("/clients/{client_id}")
def update_client(client_id: int, updates: ClientUpdate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Ενημερώνει στοιχεία πελάτη (μόνο τα πεδία που στέλνεις)."""
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    update_data = updates.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    return {
        "id": client.id,
        "first_name": client.first_name,
        "last_name": client.last_name,
        "phone": client.phone,
        "email": client.email,
        "afm": client.afm,
        "notes": client.notes,
    }


@app.delete("/clients/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Διαγράφει πελάτη (και αυτόματα όλα τα συμβόλαια/αρχεία του, λόγω cascade)."""
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Διαγράφουμε πρώτα τα φυσικά αρχεία από το disk
    for f in client.files:
        if os.path.exists(f.file_path):
            os.remove(f.file_path)

    db.delete(client)
    db.commit()
    return {"message": f"Client {client_id} deleted"}


# ============================================================
# Contracts
# ============================================================

@app.post("/clients/{client_id}/contracts")
def create_contract(client_id: int, contract: ContractCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Δημιουργεί νέο συμβόλαιο για συγκεκριμένο πελάτη."""
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Για Κυμαινόμενο τιμολόγιο, η λήξη υπολογίζεται αυτόματα (+6 μήνες), εκτός αν στάλθηκε ρητά
    end_date = contract.end_date
    if contract.pricing_type == "Κυμαινόμενο" and end_date is None:
        end_date = add_months(contract.start_date, 6)
    elif end_date is None:
        raise HTTPException(status_code=400, detail="end_date is required for Σταθερό pricing_type")

    new_contract = models.Contract(
        client_id=client_id,
        contract_type=contract.contract_type,
        provider=contract.provider,
        address=contract.address,
        tariff_name=contract.tariff_name,
        pricing_type=contract.pricing_type,
        start_date=contract.start_date,
        end_date=end_date,
        notes=contract.notes,
    )
    db.add(new_contract)
    db.commit()
    db.refresh(new_contract)
    refresh_contract_status(new_contract, db)

    return {
        "id": new_contract.id,
        "client_id": new_contract.client_id,
        "contract_type": new_contract.contract_type,
        "provider": new_contract.provider,
        "address": new_contract.address,
        "end_date": new_contract.end_date,
        "status": new_contract.status,
    }


@app.get("/clients/{client_id}/contracts")
def get_client_contracts(client_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Επιστρέφει όλα τα συμβόλαια ενός συγκεκριμένου πελάτη."""
    contracts = db.query(models.Contract).filter(models.Contract.client_id == client_id).all()

    result = []
    for c in contracts:
        refresh_contract_status(c, db)
        result.append({
            "id": c.id,
            "contract_type": c.contract_type,
            "provider": c.provider,
            "address": c.address,
            "tariff_name": c.tariff_name,
            "pricing_type": c.pricing_type,
            "start_date": c.start_date,
            "end_date": c.end_date,
            "status": c.status,
        })
    return result


@app.put("/contracts/{contract_id}")
def update_contract(contract_id: int, updates: ContractUpdate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Ενημερώνει στοιχεία συμβολαίου (μόνο τα πεδία που στέλνεις).
    Αν αλλάζεις πάροχο/τιμολόγιο, καταγράφεται αυτόματα στο ιστορικό."""
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    update_data = updates.dict(exclude_unset=True)

    # Αν αλλάζει πάροχος ή τιμολόγιο, κρατάμε "στιγμιότυπο" στο ιστορικό πριν το update
    if "provider" in update_data or "tariff_name" in update_data:
        history_entry = models.ContractHistory(
            contract_id=contract.id,
            previous_provider=contract.provider,
            previous_tariff=contract.tariff_name,
            previous_end_date=contract.end_date,
            change_reason="Ενημέρωση στοιχείων συμβολαίου",
        )
        db.add(history_entry)

    for field, value in update_data.items():
        setattr(contract, field, value)

    db.commit()
    db.refresh(contract)
    refresh_contract_status(contract, db)

    return {
        "id": contract.id,
        "contract_type": contract.contract_type,
        "provider": contract.provider,
        "address": contract.address,
        "tariff_name": contract.tariff_name,
        "end_date": contract.end_date,
        "status": contract.status,
    }


@app.delete("/contracts/{contract_id}")
def delete_contract(contract_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Διαγράφει συμβόλαιο (και το ιστορικό του, λόγω cascade)."""
    contract = db.query(models.Contract).filter(models.Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    db.delete(contract)
    db.commit()
    return {"message": f"Contract {contract_id} deleted"}


@app.get("/contracts/upcoming")
def get_upcoming_contracts(days: int = 35, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Επιστρέφει όλα τα συμβόλαια (όλων των πελατών, Σταθερά και Κυμαινόμενα) που λήγουν
    μέσα στις επόμενες `days` μέρες (default 35)."""
    today = date.today()
    limit_date = today + timedelta(days=days)

    contracts = (
        db.query(models.Contract)
        .filter(models.Contract.end_date <= limit_date)
        .filter(models.Contract.end_date >= today)
        .all()
    )

    result = []
    for c in contracts:
        refresh_contract_status(c, db)
        result.append({
            "id": c.id,
            "client_id": c.client_id,
            "client_name": f"{c.client.first_name} {c.client.last_name}",
            "client_phone": c.client.phone,
            "contract_type": c.contract_type,
            "provider": c.provider,
            "address": c.address,
            "end_date": c.end_date,
            "status": c.status,
            "days_left": (c.end_date - today).days,
        })
    return result


@app.get("/contracts/recent")
def get_recent_contracts(limit: int = 7, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Επιστρέφει τα πιο πρόσφατα δημιουργημένα συμβόλαια (όλων των πελατών)."""
    contracts = (
        db.query(models.Contract)
        .order_by(models.Contract.created_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for c in contracts:
        refresh_contract_status(c, db)
        result.append({
            "id": c.id,
            "client_id": c.client_id,
            "client_name": f"{c.client.first_name} {c.client.last_name}",
            "contract_type": c.contract_type,
            "provider": c.provider,
            "address": c.address,
            "tariff_name": c.tariff_name,
            "pricing_type": c.pricing_type,
            "start_date": c.start_date,
            "end_date": c.end_date,
            "status": c.status,
        })
    return result


@app.get("/contracts")
def get_all_contracts(status: Optional[str] = None, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Επιστρέφει όλα τα συμβόλαια όλων των πελατών, ταξινομημένα κατά ημερομηνία λήξης.
    Αν δοθεί `status` (πχ ενεργό / προς_ανανέωση / έληξε / ακυρώθηκε), φιλτράρει σε αυτό."""
    contracts = db.query(models.Contract).order_by(models.Contract.end_date.asc()).all()

    result = []
    for c in contracts:
        refresh_contract_status(c, db)
        if status and c.status != status:
            continue
        result.append({
            "id": c.id,
            "client_id": c.client_id,
            "client_name": f"{c.client.first_name} {c.client.last_name}",
            "contract_type": c.contract_type,
            "provider": c.provider,
            "address": c.address,
            "tariff_name": c.tariff_name,
            "pricing_type": c.pricing_type,
            "start_date": c.start_date,
            "end_date": c.end_date,
            "status": c.status,
        })
    return result


# ============================================================
# Files
# ============================================================

@app.post("/clients/{client_id}/files")
def upload_file(
    client_id: int,
    file_type: str = Form(...),                # "λογαριασμός", "ταυτότητα", "εξουσιοδότηση", "άλλο"
    contract_id: Optional[int] = Form(None),    # προαιρετικό: σε ποιο συμβόλαιο ανήκει
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Ανεβάζει ένα αρχείο (λογαριασμός, ταυτότητα κτλ) και το συνδέει με πελάτη
    (και προαιρετικά με συγκεκριμένο συμβόλαιο)."""

    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Μοναδικό όνομα αρχείου ώστε να μην γίνονται overwrite μεταξύ τους
    file_extension = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4().hex}{file_extension}"
    saved_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(saved_path, "wb") as f:
        content = file.file.read()
        f.write(content)

    new_file = models.FileRecord(
        client_id=client_id,
        contract_id=contract_id,
        file_type=file_type,
        file_path=saved_path,
        original_name=file.filename,
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)

    return {
        "id": new_file.id,
        "client_id": new_file.client_id,
        "contract_id": new_file.contract_id,
        "file_type": new_file.file_type,
        "original_name": new_file.original_name,
    }


@app.get("/clients/{client_id}/files")
def get_client_files(client_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Επιστρέφει όλα τα αρχεία ενός πελάτη."""
    files = db.query(models.FileRecord).filter(models.FileRecord.client_id == client_id).all()
    return [
        {
            "id": f.id,
            "contract_id": f.contract_id,
            "file_type": f.file_type,
            "original_name": f.original_name,
            "uploaded_at": f.uploaded_at,
        }
        for f in files
    ]


@app.get("/files/{file_id}/download")
def download_file(file_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Επιστρέφει το πραγματικό αρχείο, ώστε να ανοίγει/κατεβαίνει στον browser."""
    file_record = db.query(models.FileRecord).filter(models.FileRecord.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    if not os.path.exists(file_record.file_path):
        raise HTTPException(status_code=404, detail="File missing on disk")

    return FileResponse(file_record.file_path, filename=file_record.original_name)


@app.delete("/files/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Διαγράφει ένα αρχείο, τόσο από τη βάση όσο και από το disk."""
    file_record = db.query(models.FileRecord).filter(models.FileRecord.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    if os.path.exists(file_record.file_path):
        os.remove(file_record.file_path)

    db.delete(file_record)
    db.commit()
    return {"message": f"File {file_id} deleted"}