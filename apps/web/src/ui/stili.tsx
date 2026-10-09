/**
 * Stili di viaggio e mezzi: icona Lucide ed etichetta. Il colore di ogni stile è nei token
 * (`--colore-stile-<stile>` e `--colore-stile-<stile>-tenue`) e si sceglie con l'attributo `data-stile`.
 */
import type { Mezzo } from "@travelops/engine";
import {
  Bus,
  Car,
  Compass,
  Footprints,
  Heart,
  Landmark,
  Mountain,
  Plane,
  TrainFront,
  TreePalm,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
// Solo il tipo: questo modulo entra anche nei componenti del browser, che non devono caricare il motore.
import type { StileViaggio } from "../testi";

export const STILI_VIAGGIO: readonly StileViaggio[] = ["relax", "cultura", "natura", "avventura", "gastronomia", "romantico", "famiglia"];

/** Il nome di ogni stile di viaggio. */
export const TESTI_STILI: Readonly<Record<StileViaggio, string>> = {
  relax: "Relax",
  cultura: "Cultura",
  natura: "Natura",
  avventura: "Avventura",
  gastronomia: "Gastronomia",
  romantico: "Romantico",
  famiglia: "Famiglia",
};

export const ICONE_STILI: Readonly<Record<StileViaggio, LucideIcon>> = {
  relax: TreePalm,
  cultura: Landmark,
  natura: Mountain,
  avventura: Compass,
  gastronomia: UtensilsCrossed,
  romantico: Heart,
  famiglia: Users,
};

export const ICONE_MEZZI: Readonly<Record<Mezzo, LucideIcon>> = {
  piedi: Footprints,
  mezzi_pubblici: Bus,
  treno: TrainFront,
  auto: Car,
  volo: Plane,
};
