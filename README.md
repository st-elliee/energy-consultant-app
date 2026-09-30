# Energy Consultant App

🔗 **[Live Demo](https://energy-consultant-app-dfam.vercel.app/)** — login: `demo` / `demo1234`

Full-stack εφαρμογή διαχείρισης πελατών, συμβολαίων (ρεύμα/αέριο/ίντερνετ)
και εγγράφων, φτιαγμένη για επαγγελματία ενεργειακό σύμβουλο ώστε να
αντικαταστήσει το χάρτινο σύστημα καταγραφής του.

**Stack:** FastAPI (Python) · SQLAlchemy · React (Vite) · JWT authentication

## Βασικά χαρακτηριστικά

- Καταχώρηση πελατών με στοιχεία επικοινωνίας και αρχείο ταυτότητας
- Παρακολούθηση συμβολαίων (ρεύμα, αέριο, ίντερνετ) με πάροχο, τιμολόγιο,
  ημερομηνίες έναρξης/λήξης
- Αυτόματος υπολογισμός κατάστασης συμβολαίου (ενεργό / προς ανανέωση /
  έληξε / ακυρώθηκε) με ειδοποίηση 35 ημέρες πριν τη λήξη
- Upload και οργάνωση εγγράφων (λογαριασμοί, μισθωτήρια, ταυτότητες)
- Αναζήτηση πελατών σε πραγματικό χρόνο
- JWT-based σύνδεση χρήστη

## Τοπική εκτέλεση (development)

**Backend:**
```
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed_demo_data.py   # δημιουργεί demo χρήστη + δείγματα δεδομένων
uvicorn main:app --reload
```

Χωρίς να οριστεί το environment variable `DATABASE_URL`, χρησιμοποιείται
αυτόματα μια τοπική SQLite βάση (`demo.db`) -- δεν χρειάζεται MySQL server
για να δοκιμάσεις την εφαρμογή.

**Frontend:**
```
cd frontend
npm install
npm run dev
```

Demo σύνδεση: `demo` / `demo1234`

## Σημείωση

Αυτό το repository περιέχει μόνο τον κώδικα και δείγματα (fake) δεδομένων.
Δεν περιέχει κανένα πραγματικό στοιχείο πελάτη.
