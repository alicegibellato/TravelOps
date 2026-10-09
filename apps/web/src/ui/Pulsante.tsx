import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type VariantePulsante = "primario" | "secondario" | "testo";

interface Aspetto {
  variante?: VariantePulsante | undefined;
  /** `grande` per l'azione principale di una pagina. */
  dimensione?: "media" | "grande" | undefined;
  /** Icona Lucide a sinistra del testo (decorativa: il testo resta l'etichetta). */
  icona?: ReactNode;
}

/** Le classi di un pulsante: le usano anche i pulsanti dei moduli esistenti. */
export function classiPulsante({ variante = "primario", dimensione = "media" }: Aspetto = {}, altre?: string): string {
  return ["ui-pulsante", `ui-pulsante--${variante}`, dimensione === "grande" ? "ui-pulsante--grande" : "", altre ?? ""]
    .filter((c) => c !== "")
    .join(" ");
}

function Contenuto({ icona, children }: { icona?: ReactNode; children: ReactNode }) {
  return (
    <>
      {icona !== undefined && (
        <span className="ui-pulsante__icona" aria-hidden="true">
          {icona}
        </span>
      )}
      <span>{children}</span>
    </>
  );
}

/** Pulsante primario, secondario o testo: sempre almeno 44×44 px, con focus visibile. */
export function Pulsante({
  variante,
  dimensione,
  icona,
  className,
  type = "button",
  children,
  ...resto
}: Aspetto & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={classiPulsante({ variante, dimensione }, className)} {...resto}>
      <Contenuto icona={icona}>{children}</Contenuto>
    </button>
  );
}

/** Un link con l'aspetto di un pulsante (porta a un'altra pagina). */
export function PulsanteLink({
  variante,
  dimensione,
  icona,
  className,
  href,
  children,
}: Aspetto & { href: string; className?: string | undefined; children: ReactNode }) {
  return (
    <Link href={href} className={classiPulsante({ variante, dimensione }, className)}>
      <Contenuto icona={icona}>{children}</Contenuto>
    </Link>
  );
}
