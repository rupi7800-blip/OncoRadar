// Contenuti editoriali di base. Volutamente sintetici e prudenti: il dettaglio aggiornato
// viene dalle fonti scientifiche (ricerche live), non da testi scritti a mano.

export const DISCLAIMER =
  'OncoRadar è uno strumento informativo di ricerca scientifica. Non fornisce diagnosi, non prescrive farmaci o integratori e non sostituisce oncologi e professionisti sanitari. Non interrompere né sostituire mai un trattamento prescritto sulla base di ciò che leggi qui.';

// [id, nome, descrizione semplice, descrizione scientifica, query]
export const STUDY = [
  { group: 'Biologia cellulare', items: [
    ['cell-cycle', 'Ciclo cellulare', 'È la sequenza di fasi con cui una cellula si prepara a dividersi. Nei tumori i “freni” di questo ciclo non funzionano bene.', 'Fasi G1/S/G2/M controllate da cicline, CDK e checkpoint (p53, RB). Le alterazioni sono bersaglio di inibitori CDK4/6.', 'cell cycle checkpoint cancer'],
    ['apoptosis', 'Apoptosi', 'La “morte cellulare programmata”: le cellule danneggiate dovrebbero spegnersi da sole. Molti tumori sfuggono a questo meccanismo.', 'Vie intrinseca (BCL-2, mitocondri) ed estrinseca (recettori di morte, caspasi). La resistenza all’apoptosi è un hallmark del cancro.', 'apoptosis evasion cancer'],
    ['dna-repair', 'Riparazione del DNA', 'Sistemi che correggono gli errori nel DNA. Se sono difettosi, le mutazioni si accumulano.', 'Includono ricombinazione omologa (BRCA1/2), mismatch repair, NER, BER. Difetti HRD sono sfruttati dagli inibitori PARP.', 'DNA repair deficiency cancer'],
    ['oncogenes', 'Oncogeni e oncosoppressori', 'Gli oncogeni sono “acceleratori” che, se bloccati accesi, spingono la crescita. Gli oncosoppressori sono “freni” che si rompono.', 'Gain-of-function (es. KRAS, EGFR, HER2, BRAF) vs loss-of-function (es. TP53, RB1, BRCA1/2).', 'oncogene tumor suppressor'],
    ['epigenetics', 'Epigenetica', 'Modifiche che accendono o spengono i geni senza cambiare il DNA.', 'Metilazione del DNA, modifiche istoniche, RNA non codificanti; reversibili e quindi farmacologicamente bersagliabili.', 'epigenetics cancer'],
  ]},
  { group: 'Sviluppo del tumore', items: [
    ['metastasis', 'Metastasi', 'La diffusione delle cellule tumorali dal tumore di origine ad altri organi.', 'Cascata invasione–intravasazione–circolazione–extravasazione–colonizzazione; ruolo di EMT e nicchia pre-metastatica.', 'metastasis mechanisms'],
    ['angiogenesis', 'Angiogenesi', 'La formazione di nuovi vasi sanguigni che nutrono il tumore.', 'Guidata da VEGF e altri fattori pro-angiogenici; bersaglio di anticorpi e inibitori tirosin-chinasici.', 'tumor angiogenesis'],
    ['microenvironment', 'Microambiente tumorale', 'L’ambiente di cellule sane, vasi e sostanze che circonda il tumore e ne influenza la crescita.', 'Fibroblasti associati al tumore, matrice extracellulare, ipossia, cellule immunitarie e segnali paracrini.', 'tumor microenvironment'],
    ['resistance', 'Resistenza ai trattamenti', 'Perché una terapia che funzionava smette di funzionare.', 'Mutazioni secondarie del bersaglio, vie di bypass, efflusso del farmaco, plasticità fenotipica, eterogeneità clonale.', 'drug resistance cancer mechanisms'],
    ['csc', 'Cellule staminali tumorali', 'Ipotizzate come una piccola popolazione capace di rigenerare il tumore.', 'Modello gerarchico controverso; associate a recidiva e resistenza in alcuni contesti.', 'cancer stem cells'],
  ]},
  { group: 'Sistema immunitario', items: [
    ['immunosurveillance', 'Immunosorveglianza e immunoediting', 'Il sistema immunitario può riconoscere ed eliminare cellule tumorali, ma il tumore può imparare a nascondersi.', 'Fasi di eliminazione, equilibrio ed escape; perdita di MHC-I, espressione di PD-L1, cellule T regolatorie.', 'cancer immunoediting immune evasion'],
    ['tcells', 'Linfociti T e cellule NK', 'Le cellule “soldato” del sistema immunitario che possono attaccare il tumore.', 'CD8+ citotossici, CD4+ helper, NK; esaurimento T (exhaustion) con PD-1, CTLA-4, LAG-3, TIM-3.', 't cell exhaustion tumor'],
    ['inflammation', 'Infiammazione cronica', 'Un’infiammazione che dura nel tempo può favorire alcuni tumori.', 'NF-κB, STAT3, citochine (IL-6, TNF); macrofagi associati al tumore (TAM).', 'chronic inflammation cancer'],
  ]},
  { group: 'Metabolismo tumorale', items: [
    ['warburg', 'Effetto Warburg', 'Molte cellule tumorali consumano molto glucosio anche in presenza di ossigeno.', 'Glicolisi aerobia con produzione di lattato; non esclusiva e non universale tra i tumori.', 'Warburg effect glycolysis cancer'],
    ['glutamine', 'Glutammina e lipidi', 'Altri “carburanti” usati dalle cellule tumorali per crescere.', 'Glutaminolisi, sintesi e ossidazione degli acidi grassi, dipendenze metaboliche contesto-specifiche.', 'glutamine lipid metabolism cancer'],
    ['autophagy', 'Autofagia e ferroptosi', 'Processi di “riciclo” e di morte cellulare legati allo stress.', 'Autofagia con ruolo duplice (soppressivo/protettivo); ferroptosi da perossidazione lipidica dipendente dal ferro (GPX4).', 'autophagy ferroptosis cancer'],
    ['microbiota', 'Microbiota intestinale', 'I batteri dell’intestino possono influenzare infiammazione e risposta alle terapie.', 'Associazioni con risposta agli inibitori dei checkpoint; evidenze in gran parte osservazionali o preliminari.', 'gut microbiota cancer immunotherapy'],
  ]},
  { group: 'Genetica e biologia molecolare', items: [
    ['biomarkers', 'BRCA1/2, TP53, KRAS, EGFR, HER2, BRAF', 'Geni la cui alterazione orienta diagnosi e scelta terapeutica in alcuni tumori.', 'Biomarcatori predittivi/prognostici: BRCA→PARP; EGFR/BRAF/KRAS G12C→inibitori mirati; HER2→anti-HER2.', 'BRCA TP53 KRAS EGFR HER2 BRAF biomarkers'],
    ['msi-tmb', 'MSI e carico mutazionale (TMB)', 'Indicatori di quante “anomalie” ha il tumore, utili per prevedere la risposta all’immunoterapia.', 'Instabilità dei microsatelliti (dMMR) e TMB elevato associati a maggiore immunogenicità in alcuni contesti.', 'microsatellite instability tumor mutational burden'],
    ['liquid-biopsy', 'Biopsia liquida e ctDNA', 'Analisi del sangue che cerca tracce di DNA tumorale.', 'DNA tumorale circolante per monitoraggio, malattia residua minima, ricerca di resistenze.', 'circulating tumor DNA liquid biopsy'],
  ]},
];

// Atlante: [id, nome, descrizione, query]
export const ATLAS = [
  ['breast', 'Tumore della mammella', 'Origina dalle cellule del tessuto mammario (dotti o lobuli).', 'breast cancer'],
  ['lung', 'Tumore del polmone', 'Origina dalle cellule del tessuto polmonare e bronchiale.', 'lung cancer'],
  ['colorectal', 'Tumore del colon-retto', 'Origina dalla mucosa dell’intestino crasso e del retto.', 'colorectal cancer'],
  ['prostate', 'Tumore della prostata', 'Origina dalle cellule della ghiandola prostatica.', 'prostate cancer'],
  ['pancreas', 'Tumore del pancreas', 'Origina più spesso dalle cellule dei dotti pancreatici.', 'pancreatic cancer'],
  ['liver', 'Tumore del fegato', 'Il più comune primitivo è l’epatocarcinoma.', 'hepatocellular carcinoma'],
  ['stomach', 'Tumore dello stomaco', 'Origina dalle cellule della parete gastrica.', 'gastric cancer'],
  ['ovary', 'Tumore dell’ovaio', 'Origina dalle cellule dell’ovaio o delle tube.', 'ovarian cancer'],
  ['endometrium', 'Tumore dell’endometrio', 'Origina dal rivestimento interno dell’utero.', 'endometrial cancer'],
  ['cervix', 'Tumore della cervice uterina', 'Origina dalla parte inferiore dell’utero; legato in gran parte all’infezione da HPV.', 'cervical cancer'],
  ['kidney', 'Tumore del rene', 'Il tipo più frequente è il carcinoma a cellule renali.', 'renal cell carcinoma'],
  ['bladder', 'Tumore della vescica', 'Origina dal rivestimento interno della vescica (urotelio).', 'bladder cancer'],
  ['brain', 'Tumore del cervello', 'Comprende tumori primitivi (es. gliomi) e metastasi cerebrali.', 'glioma glioblastoma'],
  ['melanoma', 'Melanoma', 'Origina dai melanociti, le cellule che producono pigmento.', 'melanoma'],
  ['thyroid', 'Tumori della tiroide', 'Origina dalle cellule della ghiandola tiroidea.', 'thyroid cancer'],
  ['lymphoma', 'Linfomi', 'Tumori del sistema linfatico.', 'lymphoma'],
  ['leukemia', 'Leucemie', 'Tumori delle cellule del sangue originate nel midollo osseo.', 'leukemia'],
  ['myeloma', 'Mieloma multiplo', 'Tumore delle plasmacellule del midollo osseo.', 'multiple myeloma'],
  ['pediatric', 'Tumori pediatrici', 'Tumori dell’infanzia e adolescenza, biologicamente diversi da quelli dell’adulto.', 'pediatric cancer'],
  ['rare', 'Tumori rari', 'Tumori con incidenza molto bassa, spesso con pochi dati clinici.', 'rare cancer'],
];

// Terapie: [id, nome, meccanismo, stato, query]. "stato" è volutamente generale: verificare EMA/FDA/AIFA.
export const THERAPIES = [
  { group: 'Convenzionali', items: [
    ['chemo', 'Chemioterapia', 'Farmaci che danneggiano le cellule che si dividono rapidamente.', 'Approvata', 'chemotherapy'],
    ['radio', 'Radioterapia', 'Radiazioni che danneggiano il DNA delle cellule tumorali.', 'Approvata', 'radiotherapy'],
    ['surgery', 'Chirurgia oncologica', 'Asportazione del tumore e, se utile, dei tessuti vicini.', 'Standard', 'oncologic surgery'],
    ['hormone', 'Terapie ormonali', 'Bloccano gli ormoni che alimentano alcuni tumori.', 'Approvata', 'endocrine therapy cancer'],
    ['targeted', 'Terapie a bersaglio molecolare', 'Colpiscono molecole specifiche alterate nel tumore.', 'Approvata (per specifici bersagli)', 'targeted therapy cancer'],
    ['immuno', 'Inibitori dei checkpoint immunitari', 'Tolgono i “freni” al sistema immunitario contro il tumore.', 'Approvata (per specifici tumori)', 'immune checkpoint inhibitors'],
  ]},
  { group: 'Innovative', items: [
    ['cart', 'CAR-T', 'Linfociti T del paziente modificati per riconoscere il tumore.', 'Approvata in alcuni tumori del sangue; sperimentale altrove', 'CAR-T cell therapy'],
    ['til', 'TIL', 'Linfociti prelevati dal tumore, espansi in laboratorio e reinfusi.', 'Stato variabile: verificare i registri regolatori', 'tumor infiltrating lymphocytes therapy'],
    ['adc', 'Anticorpi farmaco-coniugati (ADC)', 'Anticorpi che trasportano un farmaco citotossico fino al tumore.', 'Approvata per alcuni tumori; molte in sperimentazione', 'antibody drug conjugate'],
    ['mrna', 'Vaccini personalizzati a mRNA', 'Vaccini costruiti sulle mutazioni specifiche del tumore del paziente.', 'Sperimentale', 'personalized mRNA cancer vaccine neoantigen'],
    ['gene', 'Terapie geniche e cellulari', 'Modificano geni o cellule per combattere il tumore.', 'Prevalentemente sperimentale', 'gene therapy cancer'],
    ['radioligand', 'Terapie radioligandiche', 'Molecole che portano radioattività direttamente alle cellule tumorali.', 'Approvata in alcuni contesti; altre in sperimentazione', 'radioligand therapy'],
    ['nano', 'Nanomedicina', 'Nanoparticelle per trasportare farmaci o migliorare la diagnosi.', 'Alcune formulazioni approvate; ricerca attiva', 'nanomedicine cancer'],
    ['ai', 'Intelligenza artificiale e cure', 'Strumenti computazionali per diagnosi e scelta terapeutica.', 'Ricerca / uso supportivo', 'artificial intelligence oncology treatment'],
  ]},
];

// Medicina integrata: [id, nome, query]. Ogni scheda usa la stessa griglia di verifica.
export const INTEGRATIVE = [
  { group: 'Sostanze naturali e composti bioattivi', items: [
    ['trametes', 'Trametes versicolor (coriolus)', 'Trametes versicolor'], ['ganoderma', 'Ganoderma lucidum', 'Ganoderma lucidum'],
    ['hericium', 'Hericium erinaceus', 'Hericium erinaceus'], ['inonotus', 'Inonotus obliquus (chaga)', 'Inonotus obliquus'],
    ['agaricus', 'Agaricus blazei', 'Agaricus blazei'], ['curcumin', 'Curcumina', 'curcumin'], ['egcg', 'EGCG / tè verde', 'EGCG green tea'],
    ['resveratrol', 'Resveratrolo', 'resveratrol'], ['quercetin', 'Quercetina', 'quercetin'], ['sulforaphane', 'Sulforafano', 'sulforaphane'],
    ['berberine', 'Berberina', 'berberine'], ['melatonin', 'Melatonina', 'melatonin'], ['vitd', 'Vitamina D', 'vitamin D'], ['vitc', 'Vitamina C', 'vitamin C ascorbate'],
  ]},
  { group: 'Alimentazione e metabolismo', items: [
    ['med-diet', 'Dieta mediterranea', 'Mediterranean diet'], ['antiinfl-diet', 'Alimentazione antinfiammatoria', 'anti-inflammatory diet'],
    ['low-gi', 'Dieta a basso indice glicemico', 'low glycemic index diet'], ['fasting', 'Digiuno e digiuno intermittente', 'fasting intermittent fasting'],
    ['keto', 'Dieta chetogenica', 'ketogenic diet'], ['caloric', 'Restrizione calorica', 'caloric restriction'],
    ['probiotics', 'Prebiotici e probiotici', 'probiotics prebiotics'], ['cachexia', 'Malnutrizione e cachessia', 'cachexia malnutrition nutrition'],
  ]},
  { group: 'Approcci integrativi', items: [
    ['exercise', 'Attività fisica', 'exercise'], ['mindfulness', 'Meditazione e gestione dello stress', 'meditation mindfulness stress'],
    ['sleep', 'Sonno', 'sleep'], ['acupuncture', 'Agopuntura', 'acupuncture'], ['yoga', 'Yoga', 'yoga'],
    ['psycho', 'Supporto psicologico', 'psychological support psycho-oncology'], ['rehab', 'Riabilitazione oncologica', 'cancer rehabilitation'],
  ]},
];

export const INTEGRATIVE_WARNINGS = [
  'Risultati solo di laboratorio non dimostrano un effetto curativo nell’essere umano.',
  'L’assenza di prove non equivale all’assenza di effetti, ma un’ipotesi promettente non è una terapia dimostrata.',
  'Molte sostanze naturali interagiscono con chemioterapia, immunoterapia, radioterapia e anticoagulanti: parlane SEMPRE con il tuo oncologo prima di assumerle.',
  'Non interrompere né sostituire mai un trattamento oncologico prescritto.',
];

export const GLOSSARY = {
  'in vitro': 'Esperimento in laboratorio su cellule o tessuti, fuori dal corpo.',
  'preclinico': 'Ricerca su cellule o animali, prima dei test sull’uomo.',
  'preprint': 'Articolo pubblicato prima della revisione di esperti indipendenti: i risultati possono cambiare.',
  'meta-analisi': 'Analisi statistica che combina i risultati di più studi.',
  'revisione sistematica': 'Sintesi strutturata e riproducibile di tutti gli studi su una domanda.',
  'fase I': 'Primo test sull’uomo, soprattutto per sicurezza e dosi.',
  'fase II': 'Valuta se il trattamento sembra funzionare, in gruppi limitati.',
  'fase III': 'Confronta il trattamento con quello standard in molti pazienti.',
  'fase IV': 'Controllo dopo l’approvazione, su larga scala.',
  'studio randomizzato': 'I partecipanti sono assegnati ai trattamenti per caso, per ridurre i bias.',
  'osservazionale': 'Osserva i pazienti senza assegnare trattamenti: mostra associazioni, non prove di causa.',
  'biomarcatore': 'Misura biologica (gene, proteina…) che indica uno stato della malattia o la risposta a una terapia.',
  'ctDNA': 'DNA tumorale circolante nel sangue.',
  'correlazione': 'Due cose compaiono insieme; non significa che una causi l’altra.',
  'bias': 'Errore sistematico che può falsare i risultati di uno studio.',
};
