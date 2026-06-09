import "antd-mobile/es/global";
import "@/styles/reset.css";
import "@/styles/variables.css";
import "@/styles/global.css";
import "@/styles/utilities.css";

import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
