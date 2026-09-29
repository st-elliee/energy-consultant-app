import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios, { API_URL } from "../api";

const FILTERS = [
  { key: "all", label: "Όλα" },
  { key: "ενεργό", label: "Ενεργά" },
  { key: "προς_ανανέωση", label: "Προς Ανανέωση" },
  { key: "έληξε", label: "Ληγμένα" },
  { key: "ακυρώθηκε", label: "Ακυρωμένα" },
];

function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchContracts = () => {
    setLoading(true);
    axios
      .get(`${API_URL}/contracts`)
      .then((response) => {
        setContracts(response.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const statusClass = (status) => {
    if (status === "έληξε") return "status-badge status-expired";
    if (status === "προς_ανανέωση") return "status-badge status-warning";
    if (status === "ακυρώθηκε") return "status-badge status-cancelled";
    return "status-badge status-active";
  };

  const filteredContracts = contracts
    .filter((c) => activeFilter === "all" || c.status === activeFilter)
    .filter((c) => {
      const haystack = `${c.client_name} ${c.provider}`.toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    });

  const countFor = (key) =>
    key === "all" ? contracts.length : contracts.filter((c) => c.status === key).length;

  return (
    <div className="container">
      <h1>Συμβόλαια</h1>

      <div className="filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={activeFilter === f.key ? "filter-btn active" : "filter-btn"}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label} <span className="filter-count">{countFor(f.key)}</span>
          </button>
        ))}
      </div>

      <input
        type="text"
        className="search-bar"
        placeholder="🔍 Αναζήτηση με βάση πελάτη ή πάροχο..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {loading ? (
        <p className="status-message">Φόρτωση...</p>
      ) : filteredContracts.length === 0 ? (
        <p className="status-message">Δεν βρέθηκαν συμβόλαια.</p>
      ) : (
        <table className="clients-table">
          <thead>
            <tr>
              <th>Πελάτης</th>
              <th>Τύπος</th>
              <th>Πάροχος</th>
              <th>Διεύθυνση</th>
              <th>Τιμολόγιο</th>
              <th>Έναρξη</th>
              <th>Λήξη</th>
              <th>Κατάσταση</th>
            </tr>
          </thead>
          <tbody>
            {filteredContracts.map((c) => (
              <tr key={c.id}>
                <td><Link to={`/clients/${c.client_id}`} className="client-link">{c.client_name}</Link></td>
                <td>{c.contract_type}</td>
                <td>{c.provider}</td>
                <td>{c.address || "—"}</td>
                <td>{c.pricing_type || "—"}</td>
                <td>{c.start_date}</td>
                <td>{c.end_date}</td>
                <td><span className={statusClass(c.status)}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Contracts;