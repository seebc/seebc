import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

window.onerror = function(msg, _url, line) {
  console.error("ERROR:", msg, "line:", line);
  return false;
};

console.log('SEEBC Starting...');
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'configured' : 'MISSING');

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

console.log('SEEBC Rendered');