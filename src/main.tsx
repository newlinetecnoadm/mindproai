import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Set dark mode as default
if (!localStorage.getItem("theme")) {
  document.documentElement.classList.add("dark");
  localStorage.setItem("theme", "dark");
} else if (localStorage.getItem("theme") === "dark") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
