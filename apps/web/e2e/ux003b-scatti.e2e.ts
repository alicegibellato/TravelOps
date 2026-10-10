/** ST-UX-003B, evidenza visiva: gli screenshot delle schermate toccate a 1280 px (prima/dopo la story). */
import { flusso } from "./flussi";
import { creaBozzaDalPercorso } from "./supporto";
import { idBozza, scatta } from "./ux003b-supporto";

flusso("ST-UX-003B: screenshot di evidenza", async (f) => {
  const { pagina } = f;

  await f.passo("Home con i viaggi", async () => {
    await pagina.goto(f.url);
    await pagina.getByRole("heading", { name: "I miei viaggi" }).waitFor();
    await scatta(f, "cb4-home");
  });

  await f.passo("Demo", async () => {
    await pagina.goto(`${f.url}/demo`);
    await pagina.getByRole("heading", { name: "Modalità presentazione" }).waitFor();
    await scatta(f, "cb6-demo");
  });

  await f.passo("Oggi", async () => {
    await pagina.goto(`${f.url}/oggi`);
    await pagina.getByRole("heading", { name: "Adesso" }).waitFor();
    await scatta(f, "cb6-oggi");
  });

  await f.passo("Pianifica senza bozza", async () => {
    await pagina.goto(`${f.url}/pianifica`);
    await pagina.getByRole("heading", { name: "La tua bozza" }).waitFor();
    await scatta(f, "cb1-pianifica-vuota");
  });

  await f.passo("Pianifica con la bozza", async () => {
    await creaBozzaDalPercorso(f);
    await pagina.goto(`${f.url}/pianifica?viaggio=${encodeURIComponent(idBozza(pagina.url()))}`);
    await pagina.locator(".pianifica-bozza__giorno").first().waitFor();
    await scatta(f, "cb1-pianifica-bozza", false);
    await scatta(f, "cb1-pianifica-bozza-intera");
  });

  await f.passo("Destinazioni pronte", async () => {
    await pagina.goto(`${f.url}/pianifica`);
    await pagina.getByRole("heading", { name: "Destinazioni pronte" }).waitFor();
    await scatta(f, "cb2-destinazioni-pronte");
  });
});
