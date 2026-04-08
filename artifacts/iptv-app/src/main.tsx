import { createRoot } from "react-dom/client";
import App from "./App";
import AdminPage from "./pages/AdminPage";
import "./index.css";

const path = window.location.pathname;
const isAdmin = path.endsWith("/admin") || path.endsWith("/admin/");

createRoot(document.getElementById("root")!).render(isAdmin ? <AdminPage /> : <App />);
