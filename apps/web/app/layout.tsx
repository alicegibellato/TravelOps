import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import { PERCORSO_DEMO, PERCORSO_ITINERARIO, PERCORSO_VERSIONI } from "../src/percorsi";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TravelOps", template: "%s · TravelOps" },
  description: "Itinerario di viaggio: consultazione, imprevisti, proposte e versioni.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        <header className="testata">
          <Link href="/" className="marchio">
            TravelOps
          </Link>
          <nav className="testata__navigazione" aria-label="Sezioni">
            <Link href="/">Viaggi di riferimento</Link>
            <Link href={PERCORSO_DEMO}>Demo</Link>
            <Link href={PERCORSO_ITINERARIO}>Itinerario corrente</Link>
            <Link href={PERCORSO_VERSIONI}>Versioni</Link>
          </nav>
        </header>
        <main className="contenuto">{children}</main>
      </body>
    </html>
  );
}
