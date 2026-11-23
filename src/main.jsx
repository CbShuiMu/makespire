import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { WorkshopProvider } from "./store";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <WorkshopProvider>
        <App />
      </WorkshopProvider>
    </HashRouter>
  </React.StrictMode>,
);
