import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios, { API_URL } from "../api";

function Dashboard() {
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_URL}/contracts/upcoming?days=35`)
      .then((response) => {
        setUpcoming(response.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container">
      <h1>Επικείμενες Λήξεις</h1>
      <p className="subtitle">Συμβόλαια που λήγουν τις επόμενες 35 μέρες</p>

      {loading ? (
        <p className="status-message">Φόρτωση...</p>
      ) : upcoming.length === 0 ? (
        <p className="status-message">Καμία λήξη τις επόμενες 35 μέρες. 🎉</p>
      ) : (
        <table className="clients-table upcoming-table">
          <thead>
            <tr>
              <th>Πελάτης</th>
              <th>Τηλέφωνο</th>
              <th>Τύπος</th>
              <th>Πάροχος</th>
              <th>Λήξη</th>
              <th>Μέρες</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((c) => (
              <tr key={c.id} className={c.days_left <= 7 ? "row-urgent" : "row-warning"}>
                <td><Link to={`/clients/${c.client_id}`} className="client-link">{c.client_name}</Link></td>
                <td>{c.client_phone}</td>
                <td>{c.contract_type}</td>
                <td>{c.provider}</td>
                <td>{c.end_date}</td>
                <td>{c.days_left}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Dashboard;