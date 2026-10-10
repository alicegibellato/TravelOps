import { Scheletro } from "../../../src/ui/Scheletro";

/** Mentre la bozza si prepara: lo scheletro di un giorno con le sue attività. */
export default function CaricamentoBozza() {
  return (
    <section className="bozza-stato" aria-label="Sto aprendo la tua bozza">
      <Scheletro righe={2} conImmagine={false} testo="Sto aprendo la tua bozza…" />
      <Scheletro righe={3} />
      <Scheletro righe={3} />
    </section>
  );
}
