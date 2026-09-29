import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios, { API_URL } from "../api";

const STANDARD_PROVIDERS = [
  "ΔΕΗ", "Φυσικό Αέριο", "Zenith", "ΗΡΩΝ", "Protergia", "Enerwave", "NRG", "Volton", "ELIN",
];

function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [expandedContractId, setExpandedContractId] = useState(null);

  // Επεξεργασία πελάτη
  const [editingClient, setEditingClient] = useState(false);
  const [clientForm, setClientForm] = useState({});
  const [clientSaveError, setClientSaveError] = useState(null);
  const [newIdFile, setNewIdFile] = useState(null);

  // Επεξεργασία συμβολαίου
  const [editingContractId, setEditingContractId] = useState(null);
  const [contractForm, setContractForm] = useState({});
  const [contractSaveError, setContractSaveError] = useState(null);
  const [newLeaseFile, setNewLeaseFile] = useState(null);
  const [newBillFile, setNewBillFile] = useState(null);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_URL}/clients/${id}`),
      axios.get(`${API_URL}/clients/${id}/contracts`),
      axios.get(`${API_URL}/clients/${id}/files`),
    ])
      .then(([clientRes, contractsRes, filesRes]) => {
        setClient(clientRes.data);
        setContracts(contractsRes.data);
        setFiles(filesRes.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Δεν ήταν δυνατή η φόρτωση στοιχείων πελάτη.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const statusClass = (status) => {
    if (status === "έληξε") return "status-badge status-expired";
    if (status === "προς_ανανέωση") return "status-badge status-warning";
    if (status === "ακυρώθηκε") return "status-badge status-cancelled";
    return "status-badge status-active";
  };

  const toggleExpand = (contractId) => {
    setExpandedContractId(expandedContractId === contractId ? null : contractId);
  };

  const filesForContract = (contractId) => files.filter((f) => f.contract_id === contractId);
  const clientOnlyFiles = () => files.filter((f) => !f.contract_id);


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

  const deleteFileById = (fileId) => {
    if (!window.confirm("Σίγουρα θέλεις να διαγράψεις αυτό το αρχείο;")) return;
    axios
      .delete(`${API_URL}/files/${fileId}`)
      .then(() => fetchAll())
      .catch((err) => console.error(err));
  };

  // ---------- Πελάτης: επεξεργασία / διαγραφή ----------

  const startEditClient = () => {
    setClientForm({
      first_name: client.first_name,
      last_name: client.last_name,
      phone: client.phone,
      email: client.email || "",
      notes: client.notes || "",
    });
    setEditingClient(true);
    setClientSaveError(null);
  };

  const handleClientFormChange = (e) => {
    setClientForm({ ...clientForm, [e.target.name]: e.target.value });
  };

  const saveClient = (e) => {
    e.preventDefault();

    axios
      .put(`${API_URL}/clients/${id}`, clientForm)
      .then(() => {
        if (newIdFile) {
          const fd = new FormData();
          fd.append("file", newIdFile);
          fd.append("file_type", "ταυτότητα");
          return axios.post(`${API_URL}/clients/${id}/files`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      })
      .then(() => {
        setEditingClient(false);
        setNewIdFile(null);
        fetchAll();
      })
      .catch((err) => {
        console.error(err);
        setClientSaveError("Κάτι πήγε στραβά κατά την αποθήκευση.");
      });
  };

  const deleteClient = () => {
    if (!window.confirm(`Σίγουρα θέλεις να διαγράψεις τον πελάτη "${client.first_name} ${client.last_name}"; Θα διαγραφούν και όλα τα συμβόλαια/αρχεία του.`)) return;

    axios
      .delete(`${API_URL}/clients/${id}`)
      .then(() => navigate("/clients"))
      .catch((err) => console.error(err));
  };

  // ---------- Αρχείο που μόλις επιλέχθηκε (πριν την αποθήκευση): άνοιγμα για προεπισκόπηση ----------
  const previewSelectedFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, "_blank");
  };

  // ---------- Συμβόλαιο: επεξεργασία / διαγραφή ----------

  const startEditContract = (contract) => {
    setContractForm({
      contract_type: contract.contract_type,
      provider: contract.provider,
      address: contract.address || "",
      tariff_name: contract.tariff_name || "",
      pricing_type: contract.pricing_type || "Σταθερό",
      start_date: contract.start_date,
      end_date: contract.end_date,
    });
    setEditingContractId(contract.id);
    setExpandedContractId(null);
    setContractSaveError(null);
  };

  const handleContractFormChange = (e) => {
    setContractForm({ ...contractForm, [e.target.name]: e.target.value });
  };

  const saveContract = (e, contractId) => {
    e.preventDefault();
    const payload = { ...contractForm };
    if (payload.pricing_type === "Κυμαινόμενο") {
      delete payload.end_date;
    }

    axios
      .put(`${API_URL}/contracts/${contractId}`, payload)
      .then(() => {
        const uploads = [];
        if (newLeaseFile) {
          const fd = new FormData();
          fd.append("file", newLeaseFile);
          fd.append("file_type", "μισθωτήριο");
          fd.append("contract_id", contractId);
          uploads.push(axios.post(`${API_URL}/clients/${id}/files`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          }));
        }
        if (newBillFile) {
          const fd = new FormData();
          fd.append("file", newBillFile);
          fd.append("file_type", "λογαριασμός");
          fd.append("contract_id", contractId);
          uploads.push(axios.post(`${API_URL}/clients/${id}/files`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          }));
        }
        return Promise.all(uploads);
      })
      .then(() => {
        setEditingContractId(null);
        setNewLeaseFile(null);
        setNewBillFile(null);
        fetchAll();
      })
      .catch((err) => {
        console.error(err);
        setContractSaveError("Κάτι πήγε στραβά κατά την αποθήκευση.");
      });
  };

  const deleteContract = (contractId) => {
    if (!window.confirm("Σίγουρα θέλεις να διαγράψεις αυτό το συμβόλαιο;")) return;

    axios
      .delete(`${API_URL}/contracts/${contractId}`)
      .then(() => fetchAll())
      .catch((err) => console.error(err));
  };

  if (loading) return <div className="container"><p className="status-message">Φόρτωση...</p></div>;
  if (error) return <div className="container"><p className="status-message error">{error}</p></div>;

  return (
    <div className="container">
      <Link to="/clients" className="back-link">← Πίσω στη λίστα πελατών</Link>

      <h1>{client.first_name} {client.last_name}</h1>

      {!editingClient ? (
        <div className="client-info-card">
          <p><strong>Τηλέφωνο:</strong> {client.phone}</p>
          <p><strong>Email:</strong> {client.email || "—"}</p>
          {client.notes && <p><strong>Σημειώσεις:</strong> {client.notes}</p>}

          {/* Τα αρχεία ταυτότητας φαίνονται κατευθείαν εδώ, χωρίς να χρειάζεται Επεξεργασία */}
          <div className="files-panel">
            <p className="files-panel-title">Αρχεία ταυτότητας</p>
            {clientOnlyFiles().length === 0 ? (
              <p className="status-message">Δεν υπάρχει ακόμα αρχείο.</p>
            ) : (
              <ul className="file-list">
                {clientOnlyFiles().map((f) => (
                  <li key={f.id}>
                    <a href="#" onClick={(e) => { e.preventDefault(); downloadFile(f.id, f.original_name); }}>
                      {f.original_name}
                    </a>
                    <span className="file-type-tag">{f.file_type}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card-actions">
            <button className="edit-btn" onClick={startEditClient}>✏️ Επεξεργασία</button>
            <button className="delete-btn" onClick={deleteClient}>🗑 Διαγραφή Πελάτη</button>
          </div>
        </div>
      ) : (
        <form className="client-form" onSubmit={saveClient}>
          <div className="form-row">
            <input type="text" name="first_name" placeholder="Όνομα" value={clientForm.first_name} onChange={handleClientFormChange} required />
            <input type="text" name="last_name" placeholder="Επώνυμο" value={clientForm.last_name} onChange={handleClientFormChange} required />
          </div>
          <div className="form-row">
            <input type="text" name="phone" placeholder="Τηλέφωνο" value={clientForm.phone} onChange={handleClientFormChange} required />
            <input type="email" name="email" placeholder="Email" value={clientForm.email} onChange={handleClientFormChange} />
          </div>
          <div className="form-row">
            <input type="text" name="notes" placeholder="Σημειώσεις" value={clientForm.notes} onChange={handleClientFormChange} />
          </div>

          <div className="files-panel">
            <p className="files-panel-title">Αρχεία ταυτότητας</p>
            {clientOnlyFiles().length === 0 ? (
              <p className="status-message">Δεν υπάρχει ακόμα αρχείο.</p>
            ) : (
              <ul className="file-list">
                {clientOnlyFiles().map((f) => (
                  <li key={f.id}>
                    <a href="#" onClick={(e) => { e.preventDefault(); downloadFile(f.id, f.original_name); }}>
                      {f.original_name}
                    </a>
                    <span className="file-type-tag">{f.file_type}</span>
                    <button type="button" className="delete-btn" onClick={() => deleteFileById(f.id)}>Διαγραφή</button>
                  </li>
                ))}
              </ul>
            )}
            <label className="date-label">
              Προσθήκη/αντικατάσταση ταυτότητας
              <input
                type="file"
                accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf"
                onChange={(e) => setNewIdFile(e.target.files[0])}
              />
            </label>
            {newIdFile && (
              <p className="status-message">
                Επιλέχθηκε:{" "}
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); previewSelectedFile(newIdFile); }}
                >
                  {newIdFile.name}
                </a>{" "}
                (θα ανέβει μόλις πατήσεις Αποθήκευση)
              </p>
            )}
          </div>

          {clientSaveError && <p className="status-message error">{clientSaveError}</p>}

          <div className="card-actions">
            <button type="submit">Αποθήκευση</button>
            <button type="button" className="cancel-btn" onClick={() => setEditingClient(false)}>Άκυρο</button>
          </div>
        </form>
      )}

      <h2>Συμβόλαια</h2>

      {contracts.length === 0 ? (
        <p className="status-message">Δεν υπάρχουν καταχωρημένα συμβόλαια.</p>
      ) : (
        <table className="clients-table">
          <thead>
            <tr>
              <th>Τύπος</th>
              <th>Πάροχος</th>
              <th>Διεύθυνση</th>
              <th>Πρόγραμμα</th>
              <th>Έναρξη</th>
              <th>Λήξη</th>
              <th>Κατάσταση</th>
              <th>Αρχεία</th>
              <th>Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => {
              const contractFiles = filesForContract(c.id);
              const isExpanded = expandedContractId === c.id;
              const isEditing = editingContractId === c.id;

              return (
                <>
                  <tr key={c.id}>
                    <td>{c.contract_type}</td>
                    <td>{c.provider}</td>
                    <td>{c.address || "—"}</td>
                    <td>{c.tariff_name || "—"}</td>
                    <td>{c.start_date}</td>
                    <td>{c.end_date}</td>
                    <td><span className={statusClass(c.status)}>{c.status}</span></td>
                    <td>
                      <button className="files-toggle-btn" onClick={() => toggleExpand(c.id)}>
                        📎 {contractFiles.length} {isExpanded ? "▲" : "▼"}
                      </button>
                    </td>
                    <td>
                      <button className="icon-btn" onClick={() => startEditContract(c)}>✏️</button>
                      <button className="icon-btn" onClick={() => deleteContract(c.id)}>🗑</button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr key={`${c.id}-files`} className="files-row">
                      <td colSpan="9">
                        <div className="files-panel">
                          {contractFiles.length === 0 ? (
                            <p className="status-message">Δεν υπάρχουν αρχεία για αυτό το συμβόλαιο.</p>
                          ) : (
                            <ul className="file-list">
                              {contractFiles.map((f) => (
                                <li key={f.id}>
                                  <a href="#" onClick={(e) => { e.preventDefault(); downloadFile(f.id, f.original_name); }}>
                      {f.original_name}
                    </a>
                                  <span className="file-type-tag">{f.file_type}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {isEditing && (
                    <tr key={`${c.id}-edit`} className="files-row">
                      <td colSpan="9">
                        <form className="client-form" onSubmit={(e) => saveContract(e, c.id)}>
                          <div className="form-row">
                            <select name="contract_type" value={contractForm.contract_type} onChange={handleContractFormChange}>
                              <option value="ρεύμα">Ρεύμα</option>
                              <option value="αέριο">Αέριο</option>
                              <option value="ίντερνετ">Ίντερνετ</option>
                            </select>
                            <select name="provider" value={contractForm.provider} onChange={handleContractFormChange}>
                              {STANDARD_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                          <div className="form-row">
                            <input type="text" name="address" placeholder="Διεύθυνση" value={contractForm.address} onChange={handleContractFormChange} />
                            <input type="text" name="tariff_name" placeholder="Πρόγραμμα" value={contractForm.tariff_name} onChange={handleContractFormChange} />
                          </div>
                          <div className="form-row">
                            <select name="pricing_type" value={contractForm.pricing_type} onChange={handleContractFormChange}>
                              <option value="Σταθερό">Σταθερό</option>
                              <option value="Κυμαινόμενο">Κυμαινόμενο</option>
                            </select>
                          </div>
                          <div className="form-row">
                            <label className="date-label">
                              Έναρξη
                              <input type="date" name="start_date" value={contractForm.start_date} onChange={handleContractFormChange} required />
                            </label>
                            {contractForm.pricing_type === "Σταθερό" && (
                              <label className="date-label">
                                Λήξη
                                <input type="date" name="end_date" value={contractForm.end_date} onChange={handleContractFormChange} required />
                              </label>
                            )}
                          </div>

                          <div className="files-panel">
                            <p className="files-panel-title">Αρχεία συμβολαίου</p>
                            {filesForContract(c.id).length === 0 ? (
                              <p className="status-message">Δεν υπάρχουν ακόμα αρχεία.</p>
                            ) : (
                              <ul className="file-list">
                                {filesForContract(c.id).map((f) => (
                                  <li key={f.id}>
                                    <a href="#" onClick={(e) => { e.preventDefault(); downloadFile(f.id, f.original_name); }}>
                      {f.original_name}
                    </a>
                                    <span className="file-type-tag">{f.file_type}</span>
                                    <button type="button" className="delete-btn" onClick={() => deleteFileById(f.id)}>Διαγραφή</button>
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
                                  onChange={(e) => setNewLeaseFile(e.target.files[0])}
                                />
                              </label>
                              <label className="date-label">
                                Προσθήκη/αντικατάσταση λογαριασμού
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf"
                                  onChange={(e) => setNewBillFile(e.target.files[0])}
                                />
                              </label>
                            </div>
                            {(newLeaseFile || newBillFile) && (
                              <p className="status-message">
                                {newLeaseFile && (
                                  <>
                                    Μισθωτήριο:{" "}
                                    <a href="#" onClick={(e) => { e.preventDefault(); previewSelectedFile(newLeaseFile); }}>
                                      {newLeaseFile.name}
                                    </a>{" "}
                                  </>
                                )}
                                {newBillFile && (
                                  <>
                                    Λογαριασμός:{" "}
                                    <a href="#" onClick={(e) => { e.preventDefault(); previewSelectedFile(newBillFile); }}>
                                      {newBillFile.name}
                                    </a>
                                  </>
                                )}
                              </p>
                            )}
                          </div>

                          {contractSaveError && <p className="status-message error">{contractSaveError}</p>}

                          <div className="card-actions">
                            <button type="submit">Αποθήκευση</button>
                            <button type="button" className="cancel-btn" onClick={() => setEditingContractId(null)}>Άκυρο</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ClientDetail;
