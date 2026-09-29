import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios, { API_URL } from "../api";

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    axios
      .post(`${API_URL}/auth/login`, formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
      .then((response) => {
        localStorage.setItem("token", response.data.access_token);
        navigate("/");
      })
      .catch((err) => {
        console.error(err);
        setError("Λάθος όνομα χρήστη ή κωδικός.");
        setSubmitting(false);
      });
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Σύνδεση</h1>
        <p className="subtitle">Energy Consultant App</p>

        <input
          type="text"
          placeholder="Όνομα χρήστη"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoFocus
        />
        <input
          type="password"
          placeholder="Κωδικός"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="status-message error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Σύνδεση..." : "Σύνδεση"}
        </button>
      </form>
    </div>
  );
}

export default Login;