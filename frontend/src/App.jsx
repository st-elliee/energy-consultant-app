import { Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import NewContract from "./pages/NewContract";
import Contracts from "./pages/Contracts";
import Login from "./pages/Login";
import "./App.css";

// Τυλίγει routes που χρειάζονται σύνδεση -- αν δεν υπάρχει token, στέλνει στο login
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="app-layout">
      <nav className="navbar">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Πίνακας
        </NavLink>
        <NavLink to="/clients" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Πελάτες
        </NavLink>
        <NavLink to="/contracts" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Συμβόλαια
        </NavLink>
        <NavLink to="/new-contract" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Νέο Συμβόλαιο
        </NavLink>
        <button className="logout-btn" onClick={handleLogout}>Αποσύνδεση</button>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/new-contract" element={<NewContract />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;