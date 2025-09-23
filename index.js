import React from "react";
import { createRoot } from "react-dom/client";
import RMIScheduler from "./RMIScheduler";

// Mount our app into the #root div in index.html
const root = createRoot(document.getElementById("root"));
root.render(<RMIScheduler />);