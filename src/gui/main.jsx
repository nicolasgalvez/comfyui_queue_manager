import React from "react";
import ReactDOM from "react-dom/client";

import Home from "./app/index.jsx";

import "./styles/tailwind.css";

import "./styles/styles.scss";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme} disableTransitionOnChange>
      <Home />
    </ThemeProvider>
  </React.StrictMode>
);
