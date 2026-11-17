// Classificazione EURISTICA, basata su regole trasparenti, di tipo di studio e solidità delle evidenze.
// Non usa generazione di testo: ogni esito riporta i motivi che lo hanno prodotto.
// È un ausilio alla lettura, non una valutazione metodologica esperta.

export const LEVELS = {
  consolidata: { label: 'Evidenza consolidata', rank: 6, hint: 'Sintesi di più studi clinici o linee guida. Va comunque letta nel contesto.' },
  clinica_significativa: { label: 'Evidenza clinica significativa', rank: 5, hint: 'Studio clinico controllato o sintesi di studi sull’uomo.' },
  clinica_preliminare: { label: 'Evidenza clinica preliminare', rank: 4, hint: 'Dati sull’uomo ma di tipo osservazionale, iniziale o non controllato.' },
  preclinica: { label: 'Evidenza preclinica promettente', rank: 3, hint: 'Solo laboratorio o animali: NON dimostra un beneficio nell’essere umano.' },
  ipotesi: { label: 'Ipotesi scientifica', rank: 2, hint: 'Proposta teorica o articolo non sperimentale.' },
  insufficiente: { label: 'Evidenza insufficiente', rank: 1, hint: 'Dati disponibili troppo scarsi per classificare con sicurezza.' },
  contraddittori: { label: 'Risultati contraddittori', rank: 0, hint: 'Studi sullo stesso tema con esiti discordanti.' },
};

const has = (text, re) => re.test(text);

export function classify(rec) {
  const types = (rec.pubTypes || []).join(' | ').toLowerCase();
  const text = `${rec.title || ''} ${rec.abstract || ''}`.toLowerCase();
  const reasons = [];
  const flags = [];
  let design = 'Non determinato';
  let level = 'insufficiente';

  // La fase si riconosce solo dai tipi di pubblicazione o da "phase X" seguito da trial/study
  // (evita falsi positivi come "phase II enzymes" negli studi di laboratorio).
  const phaseRe = /phase\s*(iv|iii|ii|i|[1-4])(?![\w])/i;
  const phaseTextRe = /phase\s*(iv|iii|ii|i|[1-4])(?:\s*\/\s*(?:iv|iii|ii|i|[1-4]))?(?:\s+\w+){0,2}\s+(?:trial|trials|study|studies|clinical)/i;
  const phase = types.match(phaseRe) || text.match(phaseTextRe);
  const phaseNum = phase ? { iv: 4, iii: 3, ii: 2, i: 1 }[phase[1].toLowerCase()] || Number(phase[1]) : null;

  const animal = has(text, /\b(mice|mouse|murine|xenograft|rats?|zebrafish|in vivo)\b/);
  const vitro = has(text, /\b(in vitro|cell lines?|cultured cells|organoids?)\b/);
  const human = has(text, /\b(patients?|participants|human subjects|cohort of)\b/);
  const enrolledHumans = has(text, /\b(we enrolled|were enrolled|were recruited|participants were|patients were (?:enrolled|recruited|randomi[sz]ed))\b/);
  const clinicalType = has(types, /clinical trial|randomized|controlled trial|observational|cohort|case-control|case reports?/);

  // Laboratorio/animali senza indicatori di arruolamento di persone: ha la precedenza sui rami clinici generici.
  const preclinicalOnly = (animal || vitro) && !clinicalType && !enrolledHumans;

  // Numero di partecipanti: solo se seguito da un'unità di persone (evita "follow-up of 5 years").
  const sampleMatch =
    text.match(/\bn\s*=\s*(\d[\d,]*)\b/) ||
    text.match(/\b(\d[\d,]*)\s+(?:patients|participants|women|men|subjects|cases|adults|children|individuals)\b/);
  const sample = sampleMatch ? Number(sampleMatch[1].replace(/,/g, '')) : null;

  if (rec.isPreprint) {
    design = 'Preprint (non sottoposto a revisione paritaria)';
    flags.push('Preprint non revisionato');
  }

  if (has(types, /meta-analysis/) || has(text, /\bmeta-analys[ie]s\b/)) {
    design = 'Meta-analisi';
    level = 'consolidata';
    reasons.push('Meta-analisi');
  } else if (has(types, /systematic review/) || has(text, /\bsystematic review\b/)) {
    design = 'Revisione sistematica';
    level = 'clinica_significativa';
    reasons.push('Revisione sistematica');
  } else if (has(types, /guideline/) || has(text, /\b(practice )?guidelines?\b.*\b(recommend|consensus)/)) {
    design = 'Linee guida';
    level = 'consolidata';
    reasons.push('Linee guida / consenso di esperti');
  } else if (has(types, /randomized controlled trial/) || has(text, /\brandomi[sz]ed\b.*\b(trial|study)\b/)) {
    design = phaseNum ? `Studio clinico randomizzato di fase ${roman(phaseNum)}` : 'Studio clinico randomizzato';
    // Senza fase dichiarata si considera "significativa" solo con un campione ampio (≥100 persone).
    const solid = phaseNum ? phaseNum >= 3 : sample !== null && sample >= 100;
    level = solid ? 'clinica_significativa' : 'clinica_preliminare';
    reasons.push('Studio randomizzato' + (phaseNum ? `, fase ${roman(phaseNum)}` : solid ? `, campione ≥100 (${sample})` : ', fase e dimensione del campione non verificabili'));
  } else if (preclinicalOnly) {
    design = animal ? 'Studio su modello animale' : 'Studio in vitro';
    level = 'preclinica';
    reasons.push(animal ? 'Modelli animali' : 'Colture cellulari/laboratorio');
    flags.push('Non trasferibile automaticamente all’essere umano');
  } else if (phaseNum) {
    design = `Studio clinico di fase ${roman(phaseNum)}`;
    level = phaseNum >= 3 ? 'clinica_significativa' : 'clinica_preliminare';
    reasons.push(`Fase ${roman(phaseNum)}${phaseNum <= 2 ? ' (sicurezza/efficacia iniziale, piccoli numeri)' : ''}`);
  } else if (has(types + ' ' + text, /\b(retrospective)\b/)) {
    design = 'Studio retrospettivo';
    level = 'clinica_preliminare';
    reasons.push('Analisi retrospettiva (rischio di bias)');
  } else if (has(types + ' ' + text, /\b(prospective)\b/)) {
    design = 'Studio prospettico';
    level = 'clinica_preliminare';
    reasons.push('Studio prospettico');
  } else if (has(types + ' ' + text, /\b(cohort|case-control|observational|cross-sectional)\b/)) {
    design = 'Studio osservazionale';
    level = 'clinica_preliminare';
    reasons.push('Osservazionale: mostra associazioni, non causalità');
  } else if (has(types, /case reports?/)) {
    design = 'Case report';
    level = 'clinica_preliminare';
    reasons.push('Singoli casi clinici');
  } else if (has(types, /review/) || has(text, /\bnarrative review\b|\boverview\b/)) {
    design = 'Revisione narrativa';
    level = 'ipotesi';
    reasons.push('Revisione non sistematica');
  } else if (human && clinicalType) {
    design = 'Studio clinico (tipo non specificato)';
    level = 'clinica_preliminare';
    reasons.push('Dati su pazienti, disegno non chiaro');
  } else if (has(types, /editorial|comment|letter|news/)) {
    design = 'Commento / editoriale';
    level = 'ipotesi';
    reasons.push('Contenuto non sperimentale');
  }

  // I preprint non possono superare il livello "preliminare"
  if (rec.isPreprint && LEVELS[level].rank > LEVELS.clinica_preliminare.rank) {
    level = 'clinica_preliminare';
    reasons.push('Declassato: preprint non revisionato');
  }
  // Senza abstract non si può verificare il contenuto
  if (!rec.abstract) {
    flags.push('Abstract non disponibile: classificazione basata solo sui metadati');
    if (level !== 'insufficiente' && LEVELS[level].rank >= LEVELS.clinica_significativa.rank) {
      level = 'clinica_preliminare';
      reasons.push('Declassato: contenuto non verificabile senza abstract');
    }
  }
  if (level === 'insufficiente') reasons.push('Nessun indicatore chiaro di disegno dello studio');

  const funding = (rec.funding || []).length ? rec.funding : null;
  const coi = has(text, /conflicts? of interest|competing interests?/) ? 'Menzionati nell’abstract' : 'Non verificabili dai metadati';

  return {
    design,
    level,
    levelLabel: LEVELS[level].label,
    reasons,
    flags,
    sample,
    funding,
    conflictsOfInterest: coi,
    preclinical: level === 'preclinica',
    automatic: true,
  };
}

function roman(n) {
  return ['', 'I', 'II', 'III', 'IV'][n] || String(n);
}

const POS = /\b(improved|prolonged|significant(ly)? (improv|reduc|extend|increas)|superior|benefit|response rate)\w*/;
const NEG = /\b(no significant|did not (improve|differ|show)|failed to|not (associated|superior)|no benefit|negative (result|trial))\w*/;

// Confronto tra studi: segnala possibili discordanze solo tra record di livello clinico.
export function compare(records) {
  const clinical = records.filter((r) => r.cls && LEVELS[r.cls.level].rank >= LEVELS.clinica_preliminare.rank && r.abstract);
  const pos = clinical.filter((r) => POS.test(r.abstract.toLowerCase()) && !NEG.test(r.abstract.toLowerCase()));
  const neg = clinical.filter((r) => NEG.test(r.abstract.toLowerCase()));
  return {
    clinicalCount: clinical.length,
    positive: pos.map((r) => r.key),
    negative: neg.map((r) => r.key),
    possibleContradiction: pos.length > 0 && neg.length > 0,
    note: 'Rilevamento automatico basato su parole chiave negli abstract: verificare sempre leggendo le fonti.',
  };
}

export function summarize(records) {
  const byLevel = {};
  for (const r of records) byLevel[r.cls.level] = (byLevel[r.cls.level] || 0) + 1;
  return byLevel;
}
