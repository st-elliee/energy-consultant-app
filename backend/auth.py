import os
import secrets
from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt

# Το SECRET_KEY διαβάζεται από environment variable, ΟΧΙ hardcoded εδώ
# (έτσι είναι ασφαλές να ανέβει δημόσια στο GitHub). Αν δεν έχει οριστεί
# (π.χ. τοπική δοκιμή), δημιουργείται τυχαίο σε κάθε εκκίνηση -- εντάξει
# για demo, αλλά σε πραγματική χρήση πρέπει να οριστεί σταθερό (Render
# environment variable), αλλιώς όλοι αποσυνδέονται σε κάθε restart.
SECRET_KEY = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 μέρες - δεν χρειάζεται να ξαναμπαίνεις κάθε μέρα

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(username: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str | None:
    """Επιστρέφει το username αν το token είναι έγκυρο, αλλιώς None."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None
