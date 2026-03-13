import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Light theme is the default for the system
document.documentElement.classList.remove("dark");

createRoot(document.getElementById("root")!).render(<App />);
