import axios from "axios";

// Σε production (π.χ. Vercel), ορίζεται το environment variable VITE_API_URL
// ώστε να δείχνει στο online backend (π.χ. Render). Τοπικά, αν δεν έχει
// οριστεί, μαντεύει αυτόματα βάσει hostname -- έτσι δουλεύει κανονικά και
// από localhost και από IP τοπικού δικτύου, όπως πριν.
export const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;

// Κάθε request παίρνει αυτόματα το token, αν υπάρχει αποθηκευμένο
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Αν ένα request γυρίσει 401 (μη έγκυρο/ληγμένο token), στέλνει αυτόματα στο login
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axios;
