import React from "react";
import { createRoot } from "react-dom/client";
import RMIScheduler from "./RMIScheduler.jsx";
import "./index.css"; // <-- tailwind

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RMIScheduler />
  </React.StrictMode>
);
