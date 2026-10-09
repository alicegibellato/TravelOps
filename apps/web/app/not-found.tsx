import Link from "next/link";

export default function NonTrovata() {
  return (
    <section className="errori" role="alert">
      <h1>Pagina non trovata</h1>
      <p>
        Il viaggio, il giorno o l&apos;elemento richiesto non esiste. <Link href="/">Torna alla scelta del viaggio</Link>.
      </p>
    </section>
  );
}
