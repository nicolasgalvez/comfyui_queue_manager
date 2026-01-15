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
import { GlobalStyles } from '@mui/material';

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme} disableTransitionOnChange>
      <GlobalStyles
        styles={(theme) => ({
          ':root': {
            '--color-neutral-900': theme.palette.grey[900],
            '--color-neutral-800': theme.palette.grey[800],
            '--color-neutral-700': theme.palette.grey[700],
            '--color-neutral-600': theme.palette.grey[600],
            '--color-neutral-500': theme.palette.grey[500],
            '--color-neutral-400': theme.palette.grey[400],
            '--color-neutral-300': theme.palette.grey[300],
            '--color-neutral-200': theme.palette.grey[200],
            '--color-neutral-100': theme.palette.grey[100],
          },
        })}
      />
      <Home />
    </ThemeProvider>
  </React.StrictMode>
);
