# OncoRadar

Piattaforma di ricerca, informazione e monitoraggio della letteratura oncologica.
**Strumento informativo: non fornisce diagnosi, non prescrive terapie o integratori, non sostituisce il medico.**

App statica (PWA, HTML + JavaScript senza dipendenze, nessun costo): le API scientifiche pubbliche
vengono interrogate direttamente dal browser dell'utente.

## Avvio

```
npm start        # server locale su http://localhost:8080
npm test         # test dei connettori, della classificazione e della deduplicazione
```

## Cosa è operativo (Fasi 1–3 + parti delle 4–7)

| Area | Stato |
|---|---|
| Connettori reali | PubMed (E-utilities), Europe PMC (incl. preprint bioRxiv/medRxiv), OpenAlex, Crossref, ClinicalTrials.gov v2 |
| Radar | Scansione automatica all'apertura (max 1 ogni 24 h) + manuale, deduplica per DOI/PMID/titolo, stato per fonte, una fonte guasta non blocca le altre |
| Classificazione | Euristica a regole trasparenti: tipo di studio (in vitro, animale, fasi I–IV, RCT, meta-analisi, linee guida, preprint…) e livello di evidenza motivato |
| Confronto studi | Segnala possibili risultati discordanti tra studi clinici (parole chiave negli abstract) |
| Sezioni | Home, Studio della malattia, Atlante, Terapie, Medicina integrata, Scoperte, Studi clinici, Ricerca avanzata, Archivio, Preferiti/monitoraggio, Fonti |
| Lettura | Modalità semplice / scientifica, glossario, tema chiaro/scuro, mobile-first |
| Monitoraggio | Argomenti seguiti, notifiche in-app e del browser (con l'app aperta) |

## Limiti dichiarati (non sono nascosti nell'app)

- **Fonti non ancora collegate**: Cochrane, WHO ICTRP, CTIS, registri nazionali, Semantic Scholar/CORE/BASE/DOAJ, siti istituzionali (NCI, ESMO, ASCO, EMA, FDA, AIFA, AIOM…). Compaiono nel registro come "non ancora collegata".
- **Nessun modello generativo**: la "Risposta sintetica" è calcolata con regole sui metadati e non può inventare fonti. Un livello AI generativo richiede un servizio a pagamento e va valutato prima.
- **Scansione in background**: senza server non esistono notifiche push a app chiusa; la scansione parte all'apertura. Una GitHub Action pianificata che scriva un JSON statico è l'evoluzione gratuita prevista.
- **Schede dell'Atlante**: contengono descrizione breve e dati live; sottotipi, stadiazione e trattamenti standard vanno compilati dalle linee guida.
- L'archivio è locale al dispositivo (max 300 documenti).

## Struttura

```
index.html  css/style.css  sw.js  manifest.webmanifest  icon.svg
js/connectors.js   connettori alle API
js/classify.js     classificazione euristica delle evidenze
js/radar.js        scansione, deduplica, stato fonti
js/sources.js      registro fonti
js/content.js      contenuti editoriali e glossario
js/store.js        archivio locale
js/app.js          interfaccia e router
test/run.mjs       test (API simulate)
```
