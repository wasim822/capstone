"use client";

import { ReactNode } from "react";
import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import theme from "@/theme/theme";


export default function ThemeRegistry({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <CssVarsProvider theme={theme} defaultMode="system">
      <CssBaseline />
      {children}
    </CssVarsProvider>
  );
}
