// Verifica il formato del testbook (REQ-QA-001 CA-1/CA-2).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const dir = process.argv[2] ?? "docs/testbook";
const campi = ["**Priorità** P", "**Modalità**", "**Automatizzabile**", "**Precondizioni**", "**Azioni**", "**Atteso**"];
const ids = new Map(); const errori = []; const aree = {};
for (const f of readdirSync(dir).filter((n) => n.endsWith(".md") && n !== "README.md")) {
  const blocchi = readFileSync(join(dir, f), "utf8").split(/^### /m).slice(1);
  for (const b of blocchi) {
    const id = b.split(" ")[0];
    if (!/^TB-[A-Z0-9]+-\d{3}$/.test(id)) errori.push(`${f}: ID non valido ${id}`);
    if (ids.has(id)) errori.push(`${f}: ID duplicato ${id}`); ids.set(id, f);
    for (const c of campi) if (!b.includes(c)) errori.push(`${id}: manca ${c}`);
    if (!/^\s+1\. /m.test(b)) errori.push(`${id}: azioni non numerate`);
    if (!/\*\*Priorità\*\* P[123]/.test(b)) errori.push(`${id}: priorità non P1/P2/P3`);
    const area = id.split("-")[1]; aree[area] = (aree[area] ?? 0) + 1;
  }
}
const richieste = ["PREF","PLAN","SURP","CHAT","TRIP","TODAY","VER","IMPR","MON","QUAL","DEMO","A11Y","XPAGE","REAL"];
for (const a of richieste) if (!aree[a]) errori.push(`area senza casi: ${a}`);
if (ids.size < 60) errori.push(`solo ${ids.size} casi`);
console.log(`casi: ${ids.size}`); console.log(`aree: ${JSON.stringify(aree)}`);
if (errori.length) { console.log(errori.join("\n")); console.log(`esito: fallito (${errori.length} errori)`); process.exit(1); }
console.log("esito: superato");
