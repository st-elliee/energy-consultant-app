import { useState, useEffect } from "react";
import axios, { API_URL } from "../api";

const STANDARD_PROVIDERS = [
  "ΔΕΗ",
  "Φυσικό Αέριο",
  "Zenith",
  "ΗΡΩΝ",
  "Protergia",
  "Enerwave",
  "NRG",
  "Volton",
  "ELIN",
];

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

// Μικρό reusable κομμάτι UI: κουμπί "+ Προσθήκη αρχείου" + λίστα επιλεγμένων
// αρχείων με δυνατότητα αφαίρεσης. Τα αρχεία προστίθενται σε κάθε νέα
// επιλογή αντί να αντικαθιστούν τα προηγούμενα.
function FilePicker({ label, inputId, files, onAddFiles, onRemoveFile, inputKey }) {
  return (
    <div style={{ width: "100%", marginBottom: "16px" }}>
      <p style={{ margin: "0 0 8px 0" }}>{label}</p>
      <label htmlFor={inputId} style={fileButtonStyle}>
        + Προσθήκη αρχείου
      </label>
      <input
        id={inputId}
        key={inputKey}
        type="file"
        multiple
        accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf"
        onChange={(e) => {
          onAddFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
        style={{ display: "none" }}
      />
      {files.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0 0" }}>
          {files.map((file, idx) => (
            <li key={`${file.name}-${file.size}-${idx}`} style={fileListItemStyle}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  const url = URL.createObjectURL(file);
                  window.open(url, "_blank");
                }}
                style={{ color: "#8b8bf5" }}
              >
                {file.name}
              </a>
              <button
                type="button"
                onClick={() => onRemoveFile(idx)}
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
  );
}

function NewContract() {
  const [clients, setClients] = useState([]);

  const [contractData, setContractData] = useState({
    client_id: "",
    contract_type: "ρεύμα",
    provider: "",
    address: "",
    tariff_name: "",
    pricing_type: "Σταθερό",
    start_date: "",
    end_date: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Πολλαπλά αρχεία που ανεβαίνουν μαζί με το συμβόλαιο — προστίθενται,
  // δεν αντικαθιστούν το ένα το άλλο
  const [leaseFiles, setLeaseFiles] = useState([]);
  const [billFiles, setBillFiles] = useState([]);
  // Αλλάζοντας αυτό το key ξαναχτίζουμε (remount) τα file inputs,
  // ώστε να αδειάζουν μετά την υποβολή.
  const [fileInputKey, setFileInputKey] = useState(0);

  // Τελευταία συμβόλαια
  const [recentContracts, setRecentContracts] = useState([]);
  const [editingContractId, setEditingContractId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState(null);
  const [editContractFiles, setEditContractFiles] = useState([]);
  const [editLeaseFile, setEditLeaseFile] = useState(null);
  const [editBillFile, setEditBillFile] = useState(null);
  const [editClientId, setEditClientId] = useState(null);

  const previewLocalFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, "_blank");
  };

  const fetchRecent = () => {
    axios
      .get(`${API_URL}/contracts/recent?limit=7`)
      .then((response) => setRecentContracts(response.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    axios
      .get(`${API_URL}/clients`)
      .then((response) => setClients(response.data))
      .catch((err) => console.error(err));
    fetchRecent();
  }, []);

  const handleChange = (e) => {
    setContractData({ ...contractData, [e.target.name]: e.target.value });
    setSuccess(false);
  };

  const addLeaseFiles = (newFiles) => {
    setLeaseFiles((prev) => {
      const combined = [...prev];
      newFiles.forEach((f) => {
        const alreadyThere = combined.some((x) => x.name === f.name && x.size === f.size);
        if (!alreadyThere) combined.push(f);
      });
      return combined;
    });
  };

  const addBillFiles = (newFiles) => {
    setBillFiles((prev) => {
      const combined = [...prev];
      newFiles.forEach((f) => {
        const alreadyThere = combined.some((x) => x.name === f.name && x.size === f.size);
        if (!alreadyThere) combined.push(f);
      });
      return combined;
    });
  };

  const removeLeaseFile = (index) => {
    setLeaseFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeBillFile = (index) => {
    setBillFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const { client_id, ...payload } = contractData;

    // Για Κυμαινόμενο, δεν στέλνουμε end_date -- το backend το υπολογίζει αυτόματα (+6 μήνες)
    if (payload.pricing_type === "Κυμαινόμενο") {
      delete payload.end_date;
    }

    axios
      .post(`${API_URL}/clients/${client_id}/contracts`, payload)
      .then((response) => {
        const newContractId = response.data.id;
        const uploadPromises = [];

        leaseFiles.forEach((file) => {
          const leaseFormData = new FormData();
          leaseFormData.append("file", file);
          leaseFormData.append("file_type", "μισθωτήριο");
          leaseFormData.append("contract_id", newContractId);
          uploadPromises.push(
            axios.post(`${API_URL}/clients/${client_id}/files`, leaseFormData, {
              headers: { "Content-Type": "multipart/form-data" },
            })
          );
        });

        billFiles.forEach((file) => {
          const billFormData = new FormData();
          billFormData.append("file", file);
          billFormData.append("file_type", "λογαριασμός");
          billFormData.append("contract_id", newContractId);
          uploadPromises.push(
            axios.post(`${API_URL}/clients/${client_id}/files`, billFormData, {
              headers: { "Content-Type": "multipart/form-data" },
            })
          );
        });

        return Promise.all(uploadPromises);
      })
      .then(() => {
        setContractData({
          client_id: "",
          contract_type: "ρεύμα",
          provider: "",
          address: "",
          tariff_name: "",
          pricing_type: "Σταθερό",
          start_date: "",
          end_date: "",
        });
        setLeaseFiles([]);
        setBillFiles([]);
        setFileInputKey((k) => k + 1); // καθαρίζει τα file inputs
        setSubmitting(false);
        setSuccess(true);
        fetchRecent();
      })
      .catch((err) => {
        console.error(err);
        setError("Κάτι πήγε στραβά. Έλεγξε ότι επέλεξες πελάτη και ημερομηνίες.");
        setSubmitting(false);
      });
  };

  const startEdit = (c) => {
    setEditForm({
      contract_type: c.contract_type,
      provider: c.provider,
      address: c.address || "",
      tariff_name: c.tariff_name || "",
      pricing_type: c.pricing_type || "Σταθερό",
      start_date: c.start_date,
      end_date: c.end_date,
    });
    setEditingContractId(c.id);
    setEditError(null);
    setEditClientId(c.client_id);

    axios
      .get(`${API_URL}/clients/${c.client_id}/files`)
      .then((response) => setEditContractFiles(response.data.filter((f) => f.contract_id === c.id)))
      .catch((err) => console.error(err));
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const saveEdit = (e, contractId) => {
    e.preventDefault();
    const payload = { ...editForm };
    if (payload.pricing_type === "Κυμαινόμενο") {
      delete payload.end_date;
    }

    axios
      .put(`${API_URL}/contracts/${contractId}`, payload)
      .then(() => {
        const uploads = [];
        if (editLeaseFile) {
          const fd = new FormData();
          fd.append("file", editLeaseFile);
          fd.append("file_type", "μισθωτήριο");
          fd.append("contract_id", contractId);
          uploads.push(axios.post(`${API_URL}/clients/${editClientId}/files`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          }));
        }
        if (editBillFile) {
          const fd = new FormData();
          fd.append("file", editBillFile);
          fd.append("file_type", "λογαριασμός");
          fd.append("contract_id", contractId);
          uploads.push(axios.post(`${API_URL}/clients/${editClientId}/files`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          }));
        }
        return Promise.all(uploads);
      })
      .then(() => {
        setEditingContractId(null);
        setEditLeaseFile(null);
        setEditBillFile(null);
        fetchRecent();
      })
      .catch((err) => {
        console.error(err);
        setEditError("Κάτι πήγε στραβά κατά την αποθήκευση.");
      });
  };


  // Κατεβάζει το αρχείο μέσω του ήδη-συνδεδεμένου axios (στέλνει το token
  // σύνδεσης) και το ανοίγει σε νέα καρτέλα ή το αποθηκεύει στη συσκευή.
  const downloadFile = (fileId, filename) => {
    axios
      .get(`${API_URL}/files/${fileId}/download`, { responseType: "blob" })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.download = filename || "file";
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error(err);
        alert("Δεν ήταν δυνατό το άνοιγμα του αρχείου.");
      });
  };

  const deleteFileById = (fileId, contractId) => {
    if (!window.confirm("Σίγουρα θέλεις να διαγράψεις αυτό το αρχείο;")) return;
    axios
      .delete(`${API_URL}/files/${fileId}`)
      .then(() => {
        setEditContractFiles(editContractFiles.filter((f) => f.id !== fileId));
      })
      .catch((err) => console.error(err));
  };

  const deleteRecentContract = (contractId) => {
    if (!window.confirm("Σίγουρα θέλεις να διαγράψεις αυτό το συμβόλαιο;")) return;

    axios
      .delete(`${API_URL}/contracts/${contractId}`)
      .then(() => fetchRecent())
      .catch((err) => console.error(err));
  };

  return (
    <div className="container">
      <h1>Νέο Συμβόλαιο</h1>

      <form className="client-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <select
            name="client_id"
            value={contractData.client_id}
            onChange={handleChange}
            required
          >
            <option value="">-- Επίλεξε πελάτη --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>

          <select name="contract_type" value={contractData.contract_type} onChange={handleChange}>
            <option value="ρεύμα">Ρεύμα</option>
            <option value="αέριο">Αέριο</option>
            <option value="ίντερνετ">Ίντερνετ</option>
          </select>
        </div>

        <div className="form-row">
          <select
            name="provider"
            value={contractData.provider}
            onChange={handleChange}
            required
          >
            <option value="">-- Επίλεξε πάροχο --</option>
            {STANDARD_PROVIDERS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <input
            type="text"
            name="tariff_name"
            placeholder="Πρόγραμμα"
            value={contractData.tariff_name}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <input
            type="text"
            name="address"
            placeholder="Διεύθυνση παροχής"
            value={contractData.address}
            onChange={handleChange}
          />

          <select name="pricing_type" value={contractData.pricing_type} onChange={handleChange}>
            <option value="Σταθερό">Σταθερό</option>
            <option value="Κυμαινόμενο">Κυμαινόμενο</option>
          </select>
        </div>

        <div className="form-row">
          <label className="date-label">
            Έναρξη
            <input
              type="date"
              name="start_date"
              value={contractData.start_date}
              onChange={handleChange}
              required
            />
          </label>

          {contractData.pricing_type === "Σταθερό" && (
            <label className="date-label">
              Λήξη
              <input
                type="date"
                name="end_date"
                value={contractData.end_date}
                onChange={handleChange}
                required
              />
            </label>
          )}
        </div>

        {contractData.pricing_type === "Κυμαινόμενο" && (
          <p className="status-message">
            ℹ️ Η λήξη υπολογίζεται αυτόματα στους 6 μήνες από την έναρξη. Θα ειδοποιηθείς κανονικά 35 μέρες πριν τη λήξη, όπως και στα Σταθερά.
          </p>
        )}

        <FilePicker
          label="Μισθωτήριο (jpg, jpeg, pdf)"
          inputId="lease-file-input"
          files={leaseFiles}
          onAddFiles={addLeaseFiles}
          onRemoveFile={removeLeaseFile}
          inputKey={`lease-${fileInputKey}`}
        />

        <FilePicker
          label="Λογαριασμός (jpg, jpeg, pdf)"
          inputId="bill-file-input"
          files={billFiles}
          onAddFiles={addBillFiles}
          onRemoveFile={removeBillFile}
          inputKey={`bill-${fileInputKey}`}
        />

        {error && <p className="status-message error">{error}</p>}
        {success && <p className="status-message success">Το συμβόλαιο προστέθηκε επιτυχώς!</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Αποθήκευση..." : "Προσθήκη Συμβολαίου"}
        </button>
      </form>

      <hr className="divider" />

      <h2>Τελευταία Συμβόλαια</h2>

      {recentContracts.length === 0 ? (
        <p className="status-message">Δεν υπάρχουν ακόμα συμβόλαια.</p>
      ) : (
        <table className="clients-table">
          <thead>
            <tr>
              <th>Πελάτης</th>
              <th>Τύπος</th>
              <th>Πάροχος</th>
              <th>Διεύθυνση</th>
              <th>Έναρξη</th>
              <th>Λήξη</th>
              <th>Κατάσταση</th>
              <th>Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {recentContracts.map((c) => (
              <>
                <tr key={c.id}>
                  <td>{c.client_name}</td>
                  <td>{c.contract_type}</td>
                  <td>{c.provider}</td>
                  <td>{c.address || "—"}</td>
                  <td>{c.start_date}</td>
                  <td>{c.end_date}</td>
                  <td>{c.status}</td>
                  <td>
                    <button className="icon-btn" onClick={() => startEdit(c)}>✏️</button>
                    <button className="icon-btn" onClick={() => deleteRecentContract(c.id)}>🗑</button>
                  </td>
                </tr>

                {editingContractId === c.id && (
                  <tr key={`${c.id}-edit`} className="files-row">
                    <td colSpan="8">
                      <form className="client-form" onSubmit={(e) => saveEdit(e, c.id)}>
                        <div className="form-row">
                          <select name="contract_type" value={editForm.contract_type} onChange={handleEditChange}>
                            <option value="ρεύμα">Ρεύμα</option>
                            <option value="αέριο">Αέριο</option>
                            <option value="ίντερνετ">Ίντερνετ</option>
                          </select>
                          <select name="provider" value={editForm.provider} onChange={handleEditChange}>
                            {STANDARD_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div className="form-row">
                          <input type="text" name="address" placeholder="Διεύθυνση" value={editForm.address} onChange={handleEditChange} />
                          <input type="text" name="tariff_name" placeholder="Πρόγραμμα" value={editForm.tariff_name} onChange={handleEditChange} />
                        </div>
                        <div className="form-row">
                          <select name="pricing_type" value={editForm.pricing_type} onChange={handleEditChange}>
                            <option value="Σταθερό">Σταθερό</option>
                            <option value="Κυμαινόμενο">Κυμαινόμενο</option>
                          </select>
                        </div>
                        <div className="form-row">
                          <label className="date-label">
                            Έναρξη
                            <input type="date" name="start_date" value={editForm.start_date} onChange={handleEditChange} required />
                          </label>
                          {editForm.pricing_type === "Σταθερό" && (
                            <label className="date-label">
                              Λήξη
                              <input type="date" name="end_date" value={editForm.end_date} onChange={handleEditChange} required />
                            </label>
                          )}
                        </div>

                        <div className="files-panel">
                          <p className="files-panel-title">Αρχεία συμβολαίου</p>
                          {editContractFiles.length === 0 ? (
                            <p className="status-message">Δεν υπάρχουν ακόμα αρχεία.</p>
                          ) : (
                            <ul className="file-list">
                              {editContractFiles.map((f) => (
                                <li key={f.id}>
                                  <a href="#" onClick={(e) => { e.preventDefault(); downloadFile(f.id, f.original_name); }}>
                      {f.original_name}
                    </a>
                                  <span className="file-type-tag">{f.file_type}</span>
                                  <button type="button" className="delete-btn" onClick={() => deleteFileById(f.id, c.id)}>Διαγραφή</button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="form-row">
                            <label className="date-label">
                              Προσθήκη/αντικατάσταση μισθωτηρίου
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf"
                                onChange={(e) => setEditLeaseFile(e.target.files[0])}
                              />
                            </label>
                            <label className="date-label">
                              Προσθήκη/αντικατάσταση λογαριασμού
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf"
                                onChange={(e) => setEditBillFile(e.target.files[0])}
                              />
                            </label>
                          </div>
                          {(editLeaseFile || editBillFile) && (
                            <p className="status-message">
                              {editLeaseFile && (
                                <>
                                  Μισθωτήριο:{" "}
                                  <a href="#" onClick={(e) => { e.preventDefault(); previewLocalFile(editLeaseFile); }}>
                                    {editLeaseFile.name}
                                  </a>{" "}
                                </>
                              )}
                              {editBillFile && (
                                <>
                                  Λογαριασμός:{" "}
                                  <a href="#" onClick={(e) => { e.preventDefault(); previewLocalFile(editBillFile); }}>
                                    {editBillFile.name}
                                  </a>
                                </>
                              )}
                            </p>
                          )}
                        </div>

                        {editError && <p className="status-message error">{editError}</p>}

                        <div className="card-actions">
                          <button type="submit">Αποθήκευση</button>
                          <button type="button" className="cancel-btn" onClick={() => setEditingContractId(null)}>Άκυρο</button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default NewContract;
