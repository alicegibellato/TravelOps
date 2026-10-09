import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TravelOps", template: "%s · TravelOps" },
  description: "Consultazione dell'itinerario di viaggio: giorni, elementi, mappa e dettagli.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        <header className="testata">
          <Link href="/" className="marchio">
            TravelOps
          </Link>
          <span className="testata__sottotitolo">Consultazione dell&apos;itinerario</span>
        </header>
        <main className="contenuto">{children}</main>
      </body>
    </html>
  );
}
