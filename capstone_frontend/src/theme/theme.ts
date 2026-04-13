import { extendTheme } from "@mui/joy/styles";

const theme = extendTheme({
  fontFamily: {
    body: `"IBM Plex Sans", sans-serif`,
    display: `"IBM Plex Sans", sans-serif`,
  },

  radius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
  },

  typography: {
    h1: {
      fontSize: "2rem",
      fontWeight: 600,
    },
    h2: {
      fontSize: "1.5rem",
      fontWeight: 600,
    },
    h3: {
      fontSize: "1.25rem",
      fontWeight: 600,
    },
    "body-md": {
      fontSize: "1rem",
    },
    "body-sm": {
      fontSize: "0.875rem",
    },
  },

  colorSchemes: {
    light: {
      palette: {
        primary: {
          500: "#1976d2",
        },
        background: {
          body: "#f5f6fa",
          surface: "#ffffff",
        },
        text: {
          primary: "#32383E",
        },
      },
    },

    dark: {
      palette: {
        primary: {
          500: "#4dabf7",
        },
        background: {
          body: "#0B0F14",
          surface: "#111827",
        },
      },
    },
  },
});

export default theme;
