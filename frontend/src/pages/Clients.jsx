import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios, { API_URL } from "../api";

const NEW_CLIENT_DRAFT_KEY = "newClientDraft";

const fileButtonStyle = {
  display: "inline-block",
  padding: "8px 16px",
  background: "#2a2a3d",
  border: "1px solid #4a4a5e",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px",
  color: "#e0e0f0",
};

const fileListItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#1e1e2e",
  padding: "6px 10px",
  borderRadius: "4px",
  marginBottom: "4px",
  fontSize: "13px",
};

const removeButtonStyle = {
  background: "transparent",
  border: "none",
  color: "#ff6b6b",
  cursor: "pointer",
  fontSize: "14px",
  padding: "0 4px",
};

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Αναζήτηση πελατών (real-time, client-side filter)
  const [searchTerm, setSearchTerm] = useState("");

  // Η φόρμα "Νέος Πελάτης" φορτώνει ό,τι είχε μείνει μισοσυμπληρωμένο
  // (localStorage), ώστε να μην χάνεται αν ο χρήστης φύγει σε άλλη καρτέλα.
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(NEW_CLIENT_DRAFT_KEY);
    return saved
      ? JSON.parse(saved)
      : { first_name: "", last_name: "", phone: "", email: "" };
  });

  // Πολλαπλά αρχεία ταυτότητας — προστίθενται, δεν αντικαθιστούν το ένα το άλλο
  const [idFiles, setIdFiles] = useState([]);
  // Αλλάζοντας αυτό το key ξαναχτίζουμε (remount) το <input type="file">,
  // που είναι ο μόνος αξιόπιστος τρόπος να "αδειάσει" μετά την υποβολή.
  const [fileInputKey, setFileInputKey] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchClients = () => {
    setLoading(true);
    axios
      .get(`${API_URL}/clients`)
      .then((response) => {
        setClients(response.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Δεν ήταν δυνατή η φόρτωση πελατών. Έλεγξε αν τρέχει το backend.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleChange = (e) => {
    const updated = { ...formData, [e.target.name]: e.target.value };
    setFormData(updated);
    localStorage.setItem(NEW_CLIENT_DRAFT_KEY, JSON.stringify(updated));
  };

  // Κάθε φορά που ο χρήστης επιλέγει αρχεία (είτε πολλά μαζί, είτε ένα-ένα
  // πατώντας ξανά "Choose Files"), τα προσθέτουμε στη λίστα αντί να τη
  // σβήνουμε. Αγνοούμε διπλότυπα (ίδιο όνομα + μέγεθος).
  const handleIdFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setIdFiles((prev) => {
      const combined = [...prev];
      newFiles.forEach((f) => {
        const alreadyThere = combined.some(
          (existing) => existing.name === f.name && existing.size === f.size
        );
        if (!alreadyThere) combined.push(f);
      });
      return combined;
    });
    // Καθαρίζουμε το native input ώστε να μπορεί να ξανανοίξει άδειο
    // την επόμενη φορά (αλλιώς ο browser δεν ξαναπυροδοτεί onChange
    // αν επιλέξεις ξανά τα ίδια αρχεία).
    e.target.value = "";
  };

  const removeIdFile = (index) => {
    setIdFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Ανοίγει το επιλεγμένο (μη ανεβασμένο ακόμα) αρχείο σε νέα καρτέλα, ώστε
  // να μπορεί να το ελέγξει ο χρήστης πριν πατήσει "Προσθήκη Πελάτη"
  const previewSelectedFile = (file) => {
    const url = URL.createObjectURL(file);
    window.open(url, "_blank");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    axios
      .post(`${API_URL}/clients`, formData)
      .then((response) => {
        const newClientId = response.data.id;

        // Ανεβάζουμε ένα-ένα όλα τα επιλεγμένα αρχεία ταυτότητας
        const uploadPromises = idFiles.map((file) => {
          const fileFormData = new FormData();
          fileFormData.append("file", file);
          fileFormData.append("file_type", "ταυτότητα");
          return axios.post(`${API_URL}/clients/${newClientId}/files`, fileFormData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        });

        return Promise.all(uploadPromises);
      })
      .then(() => {
        const emptyForm = { first_name: "", last_name: "", phone: "", email: "" };
        setFormData(emptyForm);
        localStorage.removeItem(NEW_CLIENT_DRAFT_KEY);
        setIdFiles([]);
        setFileInputKey((k) => k + 1); // καθαρίζει το file input
        setSubmitting(false);
        fetchClients();
      })
      .catch((err) => {
        console.error(err);
        setFormError("Κάτι πήγε στραβά. Έλεγξε τα στοιχεία και ξαναδοκίμασε.");
        setSubmitting(false);
      });
  };

  const filteredClients = clients.filter((c) => {
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="container">
      <h1>Πελάτες</h1>

      <form className="client-form" onSubmit={handleSubmit}>
        <h2>Νέος Πελάτης</h2>

        <div className="form-row">
          <input
            type="text"
            name="first_name"
            placeholder="Όνομα *"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="last_name"
            placeholder="Επώνυμο *"
            value={formData.last_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-row">
          <input
            type="text"
            name="phone"
            placeholder="Τηλέφωνο *"
            value={formData.phone}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div style={{ width: "100%", marginBottom: "16px" }}>
          <p style={{ margin: "0 0 8px 0" }}>Ταυτότητα (jpg, jpeg, pdf)</p>
          <label htmlFor="id-file-input" style={fileButtonStyle}>
            + Προσθήκη αρχείου
          </label>
          <input
            id="id-file-input"
            key={fileInputKey}
            type="file"
            multiple
            accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf"
            onChange={handleIdFileChange}
            style={{ display: "none" }}
          />

          {idFiles.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0 0" }}>
              {idFiles.map((file, idx) => (
                <li key={`${file.name}-${file.size}-${idx}`} style={fileListItemStyle}>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); previewSelectedFile(file); }}
                    style={{ color: "#8b8bf5" }}
                  >
                    {file.name}
                  </a>
                  <button
                    type="button"
                    onClick={() => removeIdFile(idx)}
                    style={removeButtonStyle}
                    title="Αφαίρεση"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {formError && <p className="status-message error">{formError}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Αποθήκευση..." : "Προσθήκη Πελάτη"}
        </button>
      </form>

      <hr className="divider" />

      <input
        type="text"
        className="search-bar"
        placeholder="🔍 Αναζήτηση πελάτη με βάση το όνομα..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {loading ? (
        <p className="status-message">Φόρτωση...</p>
      ) : error ? (
        <p className="status-message error">{error}</p>
      ) : filteredClients.length === 0 ? (
        <p className="status-message">
          {searchTerm ? "Κανένας πελάτης δεν ταιριάζει." : "Δεν υπάρχουν ακόμα πελάτες."}
        </p>
      ) : (
        <table className="clients-table">
          <thead>
            <tr>
              <th>Όνομα</th>
              <th>Επώνυμο</th>
              <th>Τηλέφωνο</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => (
              <tr key={client.id} className="clickable-row">
                <td><Link to={`/clients/${client.id}`} className="client-link">{client.first_name}</Link></td>
                <td>{client.last_name}</td>
                <td>{client.phone}</td>
                <td>{client.email || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Clients;
