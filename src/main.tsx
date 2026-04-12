import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

console.log('SEEBC: Cargando aplicacion...');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
