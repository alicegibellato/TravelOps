import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
// Caratteri dai file locali (OFL): nessuna richiesta a servizi esterni (REQ-WEB-001 CA-6, REQ-UX-001 §6.1).
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "leaflet/dist/leaflet.css";
import "../src/ui/token.css";
import "../src/ui/ui.css";
import "./globals.css";
import { Guscio } from "../src/ui/Guscio";
import { SCRIPT_TEMA } from "../src/ui/tema";

export const metadata: Metadata = {
  title: { default: "TravelOps", template: "%s · TravelOps" },
  description: "Il tuo assistente di viaggio: programma giorno per giorno, imprevisti, proposte e versioni.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    // Lo script del tema può impostare `data-tema` su <html> prima che React lo riprenda.
    <html lang="it" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        <Guscio>{children}</Guscio>
      </body>
    </html>
  );
}
