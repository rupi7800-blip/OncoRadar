# OncoRadar

Piattaforma di ricerca, informazione e monitoraggio della letteratura oncologica.
**Strumento informativo: non fornisce diagnosi, non prescrive terapie o integratori, non sostituisce il medico.**

App statica (PWA, HTML + JavaScript senza dipendenze, nessun costo): le API scientifiche pubbliche
vengono interrogate direttamente dal browser dell'utente.

## Avvio

```
npm start        # server locale su http://localhost:8080
npm test         # test dei connettori, della classificazione, della deduplicazione e del feed
npm run scan     # scansione completa che scrive data/radar.json
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

## Messa online e scansione giornaliera

1. **Unisci il branch in `main`** (oppure fai una pull request): le Action partono dal branch predefinito.
2. **Abilita GitHub Pages**: Settings → Pages → Source: *GitHub Actions*. L'app sarà su `https://<utente>.github.io/OncoRadar/`.
3. **Scansione giornaliera**: il workflow *Scansione giornaliera* (04:17 UTC, avviabile a mano da Actions) interroga le fonti, classifica, deduplica e salva `data/radar.json`; il sito si ripubblica da solo. Se nessuna fonte è raggiungibile il feed non viene toccato e l'esecuzione risulta fallita (visibile in Actions).
4. L'app, all'apertura, importa il feed nell'archivio locale e mostra l'ora dell'ultima scansione.

Scansione a mano: `npm run scan`.

## Limiti dichiarati (non sono nascosti nell'app)

- **Fonti non ancora collegate**: Cochrane, WHO ICTRP, CTIS, registri nazionali, Semantic Scholar/CORE/BASE/DOAJ, siti istituzionali (NCI, ESMO, ASCO, EMA, FDA, AIFA, AIOM…). Compaiono nel registro come "non ancora collegata".
- **Nessun modello generativo**: la "Risposta sintetica" è calcolata con regole sui metadati e non può inventare fonti. Un livello AI generativo richiede un servizio a pagamento e va valutato prima.
- **Notifiche push a app chiusa**: non esistono senza un server dedicato; le notifiche arrivano con l'app aperta. La scansione quotidiana però è automatica (vedi sotto).
- **Schede dell'Atlante**: sono schede di orientamento educative e prudenti (organo, sottotipi, rischi, biomarcatori, diagnosi, stadiazione, modalità di trattamento) da validare con un oncologo; prognosi ed epidemiologia rimandano a AIOM/IARC/SEER perché i numeri cambiano nel tempo.
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
js/atlas-data.js   schede dell'Atlante
js/feed.js         unione e import del feed giornaliero
scripts/scan.mjs   scansione eseguita dalla GitHub Action
.github/workflows  scansione giornaliera + pubblicazione su Pages
js/app.js          interfaccia e router
test/*.mjs         test (API simulate)
```
