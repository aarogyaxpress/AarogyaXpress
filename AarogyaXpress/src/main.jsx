import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Offline app shell could not be cached:", error);
    });
  });
}

createRoot(document.getElementById("root")).render(
  <App />
);
