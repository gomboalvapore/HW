const STORAGE_KEY = 'guildTableData'; // Key for localStorage
const ALERT_CONFIG_STORAGE_KEY = 'alertConfigData'; // Key for alert config localStorage
let isGreen = true; // Global variable for blinking color

// Offset per UTC-2 in millisecondi
const UTC_MINUS_2_OFFSET_MS = -2 * 60 * 60 * 1000;

// ***** VARIABILI PER LA SIMULAZIONE DEL TEMPO *****
let simulatedTimeOffsetMs = 0; // Inizialmente nessun offset
const SIMULATION_OFFSET_STORAGE_KEY = 'simulatedTimeOffset'; // Per salvare l'offset
const TESTER_TOOLS_VISIBLE_STORAGE_KEY = 'testerToolsVisible'; // Per salvare lo stato di visibilità
// ***** FINE VARIABILI PER LA SIMULAZIONE *****

// Definisci le opzioni per i dropdown dei limiti degli alert
const timeBoundOptions = [
    { value: 0, text: "0 hours" },
    { value: 1, text: "1 hour" },
    { value: 2, text: "2 hours" },
    { value: 3, text: "3 hours" },
    { value: 4, text: "4 hours" },
    { value: 5, text: "5 hours" },
    { value: 6, text: "6 hours" },
    { value: 8, text: "8 hours" },
    { value: 10, text: "10 hours" },
    { value: 12, text: "12 hours" },
    { value: 18, text: "18 hours" },
    { value: 24, text: "24 hours" },
    { value: 48, text: "2 days" },
    { value: 72, text: "3 days" }
];

// Opzioni per i dropdown "Attacks"
const attacksOptionsMinions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
// const attacksOptionsBoss = [0, 1, 2, 3, 4, 5]; // Non più un dropdown

// Array per i colori delle 5 checkbox (colonna Boss)
// I nomi delle classi CSS devono corrispondere a quelle in style.css
const bossCheckboxColors = [
    'color-1', // Isaac - Mattone
    'color-2', // Orion - Blu Elettrico
    'color-3', // Corvus - Viola
    'color-4', // JHU - Cremisi
    'color-5'  // Other - Verde/Giallo
];

// Funzione per ottenere l'ora corrente nel fuso orario UTC-2, applicando l'offset di simulazione
function getUtcMinus2Time(date = new Date()) {
    // Ottieni il timestamp UTC corrente dall'ora reale
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);

    // Applica l'offset per UTC-2 e l'offset di simulazione
    return new Date(utcTime + UTC_MINUS_2_OFFSET_MS + simulatedTimeOffsetMs);
}

// Funzione per creare una data target settimanale nel fuso orario UTC-2
// targetDayOfWeek: 0 per Domenica, 1 per Lunedì, ..., 6 per Sabato
// hourUTC2, minuteUTC2, secondUTC2: l'ora desiderata in UTC-2
function createTargetDateWeeklyUTC2(targetDayOfWeek, hourUTC2, minuteUTC2, secondUTC2) {
    const nowUtcMinus2 = getUtcMinus2Time(); // Ora corrente (o simulata) in UTC-2

    let targetDate = new Date(nowUtcMinus2); // Clona la data corrente/simulata
    targetDate.setUTCMilliseconds(0); // Azzera millisecondi per precisione
    targetDate.setUTCSeconds(secondUTC2);
    targetDate.setUTCMinutes(minuteUTC2);
    targetDate.setUTCHours(hourUTC2); // Imposta l'ora in UTC-2

    // Calcola la differenza in giorni tra il giorno della settimana corrente e il target
    let diff = targetDayOfWeek - targetDate.getUTCDay();

    // Se il giorno target è già passato questa settimana (o è oggi ma l'ora è già passata), aggiungi 7 giorni
    if (diff < 0 || (diff === 0 && targetDate.getTime() < nowUtcMinus2.getTime())) {
        diff += 7;
    }

    targetDate.setUTCDate(targetDate.getUTCDate() + diff); // Sposta la data al giorno target

    return targetDate;
}

// Funzione principale per aggiornare il timer, gli alert e la tabella
function updateClock() {
    const nowUtcMinus2 = getUtcMinus2Time(); // Ora corrente (o simulata) nel fuso orario UTC-2
    const currentDayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][nowUtcMinus2.getUTCDay()];
    const currentHour = nowUtcMinus2.getUTCHours();
    const currentMinute = nowUtcMinus2.getUTCMinutes();
    const currentDayOfMonth = nowUtcMinus2.getUTCDate();

    // Visualizzazione ora corrente in UTC-2 con giorno della settimana e giorno del mese
    const formattedHour = String(currentHour).padStart(2, '0');
    const formattedMinute = String(currentMinute).padStart(2, '0');
    document.getElementById('current-time-display').textContent = `${currentDayName} - ${formattedHour}:${formattedMinute} - ${currentDayOfMonth} (UTC-2)`;

    // --- Determinazione modalità countdown e target times in UTC-2 ---
    // Target Minions: Venerdì 00:00:00 (giorno 5, ora 0) in UTC-2
    const targetMinionsEndsIn = createTargetDateWeeklyUTC2(5, 0, 0, 0); // Friday (5), 00:00:00

    // Target Boss: Domenica 23:00:00 (giorno 0, ora 23) in UTC-2
    const targetBossEndsIn = createTargetDateWeeklyUTC2(0, 23, 0, 0); // Sunday (0), 23:00:00

    const timeLeftMinions = targetMinionsEndsIn.getTime() - nowUtcMinus2.getTime();
    const timeLeftBoss = targetBossEndsIn.getTime() - nowUtcMinus2.getTime();

    let newCountdownMode = '';
    let chosenTimeLeft = 0;
    let countdownLabelText = '';

    // Logica per scegliere quale countdown mostrare
    if (timeLeftMinions <= 0 && timeLeftBoss <= 0) {
        countdownLabelText = 'ALL';
        chosenTimeLeft = 0;
    } else if (timeLeftMinions <= 0 && timeLeftBoss > 0) { // Minions è scaduto, mostra Boss
        newCountdownMode = 'boss';
        chosenTimeLeft = timeLeftBoss;
        countdownLabelText = 'boss ends in';
    } else if (timeLeftBoss <= 0 && timeLeftMinions > 0) { // Boss è scaduto, mostra Minions
        newCountdownMode = 'minions';
        chosenTimeLeft = timeLeftMinions;
        countdownLabelText = 'minions end in';
    } else if (timeLeftMinions > 0 && timeLeftBoss > 0 && timeLeftMinions < timeLeftBoss) { // Minions scade prima
        newCountdownMode = 'minions';
        chosenTimeLeft = timeLeftMinions;
        countdownLabelText = 'minions end in';
    } else if (timeLeftMinions > 0 && timeLeftBoss > 0 && timeLeftBoss <= timeLeftMinions) { // Boss scade prima o contemporaneamente
        newCountdownMode = 'boss';
        chosenTimeLeft = timeLeftBoss;
        countdownLabelText = 'boss ends in';
    } else { // Caso fallback, forse tutti scaduti ma con valori positivi molto piccoli
        countdownLabelText = 'ALL';
        chosenTimeLeft = 0;
    }

    // --- LOGICA PER LA COLONNA MINIONS/BOSS E LA SUA LARGHEZZA ---
    const minionsBossHeader = document.getElementById('minions-boss-header');
    const attacksHeader = document.getElementById('attacks-header');
    const colMinionsBoss = document.getElementById('col-minions-boss');
    const colPlayerName = document.getElementById('col-playername');
    const colAttacks = document.getElementById('col-attacks');
    const colCheckbox = document.getElementById('col-checkbox');

    // Larghezza minima per la colonna checkbox
    colCheckbox.style.width = '30px';

    // Larghezza fissa per la colonna Attacks
    colAttacks.style.width = '100px'; // Aumentata per la scritta "Attacks" + numero grande

    if (newCountdownMode === 'boss') {
        // Formatta l'intestazione con i nomi dei boss colorati e ritorno a capo dopo Corvus
        minionsBossHeader.innerHTML = `Boss <span class="isaac-text">Isaac</span><br>
                                        <span class="orion-text">Orion</span>
                                        <span class="corvus-text">Corvus</span><br>
                                        <span class="jhu-text">JHU</span>
                                        <span class="other-text">Other</span>`;
        minionsBossHeader.style.whiteSpace = 'normal'; // Permetti il wrapping del testo
        colMinionsBoss.style.width = '160px'; // Larghezza per le 5 checkbox boss
        // Calcola dinamicamente la larghezza del player name per riempire lo spazio rimanente
        const totalFixedAndDynamicWidth = 30 + 100 + 160; // Checkbox (30px) + Attacks (100px) + Minions/Boss (160px)
        const remainingWidth = 700 - totalFixedAndDynamicWidth; // Max width della tabella - larghezze fisse
        colPlayerName.style.width = `${remainingWidth}px`;


    } else {
        minionsBossHeader.textContent = 'Minions'; // Torna al testo originale
        minionsBossHeader.style.whiteSpace = 'nowrap'; // Impedisci il wrapping
        colMinionsBoss.style.width = '80px'; // Larghezza originale per Minions
        const totalFixedAndDynamicWidth = 30 + 100 + 80; // Checkbox (30px) + Attacks (100px) + Minions (80px)
        const remainingWidth = 700 - totalFixedAndDynamicWidth;
        colPlayerName.style.width = `${remainingWidth}px`;
    }
    // Assicurati che il testo "Attacks" possa andare a capo
    attacksHeader.style.whiteSpace = 'normal';
    attacksHeader.style.textOverflow = 'clip';

    // --- FINE LOGICA COLONNA MINIONS/BOSS ---


    // Se la modalità è cambiata, resetta e ricarica la tabella
    if (newCountdownMode !== currentActiveCountdownMode) {
        // currentActiveCountdownMode viene aggiornato all'interno di resetAndLoadTableData
        resetAndLoadTableData(newCountdownMode);
    }


    // --- Calcolo tempo rimanente per il countdown principale ---
    const totalSeconds = Math.floor(chosenTimeLeft / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const countdownLabel = document.getElementById('countdown-label');
    const countdownTimerValue = document.getElementById('countdown-timer-value');

    if (chosenTimeLeft <= 0) {
        countdownLabel.textContent = 'ALL';
        countdownTimerValue.textContent = 'EXPIRED!';
    } else {
        let timeString;
        if (days > 0) {
            timeString = `${days} day${days > 1 ? 's' : ''}, ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
            timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        countdownLabel.textContent = `${countdownLabelText}:`;
        countdownTimerValue.textContent = timeString;
    }

    // --- Gestione Alert ---
    const alertConfig = loadAlertConfig();
    const alertElements = {
        alert1: { span: document.getElementById('starts-in-alert'), cell: document.getElementById('alert1-type-cell'), config: alertConfig.alert1, isBlinking: false, isAlert3: false, isAlert1: true }, // Alert 1 è fisso rosso
        alert2: { span: document.getElementById('starts-in-blinking-alert'), cell: document.getElementById('alert2-type-cell'), config: alertConfig.alert2, isBlinking: true, isAlert3: false, isAlert1: false },
        alert3: { span: document.getElementById('ends-in-alert'), cell: document.getElementById('alert3-type-cell'), config: alertConfig.alert3, isBlinking: false, isAlert3: true, isAlert1: false },
        alert4: { span: document.getElementById('starts-in-blinking-alert4'), cell: document.getElementById('alert4-type-cell'), config: alertConfig.alert4, isBlinking: true, isAlert3: false, isAlert1: false },
    };

    // Alterna isGreen per il lampeggio (sempre, indipendentemente dall'ora)
    isGreen = !isGreen;

    let currentAlertStates = {
        alert1: false,
        alert2: false,
        alert3: false,
        alert4: false
    };

    for (const key in alertElements) {
        const { span, cell, config, isBlinking, isAlert3, isAlert1 } = alertElements[key];
        span.textContent = ''; // Reset text
        // Rimuovi tutte le classi di sfondo e colore testo precedenti per l'alert type cell e lo span del titolo
        cell.classList.remove('alert-type-background-red-fixed', 'alert-type-background-blue-cyan', 'alert-type-background-blinking', 'red', 'green');
        span.classList.remove('alert-text-red', 'alert-text-blue-cyan', 'alert-text-blinking', 'red', 'green');
        cell.style.color = ''; // Reset text color

        let targetAlertTime;
        if (config.countdownRef === 'minions end in') {
            targetAlertTime = targetMinionsEndsIn;
        } else { // boss ends in
            targetAlertTime = targetBossEndsIn;
        }

        const timeLeftForAlert = targetAlertTime.getTime() - nowUtcMinus2.getTime();
        const hoursLeftForAlert = Math.floor(timeLeftForAlert / (1000 * 60 * 60));

        const lowerBound = parseInt(config.lowerBound, 10);
        const upperBound = parseInt(config.upperBound, 10);

        if (hoursLeftForAlert >= lowerBound && hoursLeftForAlert <= upperBound && timeLeftForAlert > 0) { // Solo se l'alert è attivo e non è scaduto
            const alertTotalSeconds = Math.floor(timeLeftForAlert / 1000);
            const alertDays = Math.floor(alertTotalSeconds / (3600 * 24));
            const alertHours = Math.floor((alertTotalSeconds % (3600 * 24)) / 3600);
            const alertMinutes = Math.floor((alertTotalSeconds % 3600) / 60);
            const alertSeconds = alertTotalSeconds % 60;

            let alertTimeString;
            if (alertDays > 0) {
                alertTimeString = `${alertDays} day${alertDays > 1 ? 's' : ''}, ${String(alertHours).padStart(2, '0')}:${String(alertMinutes).padStart(2, '0')}:${String(alertSeconds).padStart(2, '0')}`;
            } else {
                alertTimeString = `${String(alertHours).padStart(2, '0')}:${String(alertMinutes).padStart(2, '0')}:${String(alertSeconds).padStart(2, '0')}`;
            }

            span.textContent = `(${alertTimeString})`;
            currentAlertStates[key] = true;

            if (isAlert1) { // Alert 1: Rosso fisso, testo nero
                cell.classList.add('alert-type-background-red-fixed');
                span.classList.add('alert-text-red'); // Solo colore testo rosso per lo span nel titolo
            } else if (isBlinking) { // Alert 2 e 4: Lampeggiante verde/rosso
                cell.classList.add('alert-type-background-blinking');
                span.classList.add('alert-text-blinking');
                if (isGreen) {
                    cell.classList.add('green');
                    span.classList.add('green');
                } else {
                    cell.classList.add('red');
                    span.classList.add('red');
                }
            } else if (isAlert3) { // Alert 3: Blu chiaro fisso, testo nero
                cell.classList.add('alert-type-background-blue-cyan');
                span.classList.add('alert-text-blue-cyan'); // Solo colore testo blu chiaro per lo span nel titolo
            }
        } else {
            // Se l'alert non è attivo, ma ha un colore di sfondo predefinito (per la cella di config)
            if (isAlert1) {
                cell.classList.add('alert-type-background-red-fixed'); // Mantiene lo sfondo rosso fisso
            } else if (isAlert3) {
                cell.classList.add('alert-type-background-blue-cyan'); // Mantiene lo sfondo blu fisso
            } else if (isBlinking) { // Alert 2 e 4, quando non attivi, tornano a uno stato "statico"
                 // Nessun colore statico, restano senza classi di sfondo se non attivi
                 // (verranno gestiti dalla formattazione di default o da altri alert)
            }
        }
    }

    applyRowFormatting(currentAlertStates.alert1, currentAlertStates.alert2, currentAlertStates.alert3, currentAlertStates.alert4, newCountdownMode);
}


// Funzione per applicare la formattazione condizionale alle righe della tabella principale
function applyRowFormatting(isAlert1Active, isAlert2Active, isAlert3Active, isAlert4Active, currentCountdownMode) {
    const tableRows = document.querySelectorAll('#guildTable tbody tr');

    tableRows.forEach(row => {
        // Rimuovi tutte le classi di formattazione precedenti
        row.classList.remove(
            'highlight-row',
            'row-alert-red-fixed', // Modificato
            'row-alert-blue-cyan',
            'row-alert-blinking', 'red', 'green',
            'row-dark-grey',
            'row-green-static'
        );
        row.style.color = ''; // Resetta il colore del testo della riga

        const checkbox = row.cells[0].querySelector('input[type="checkbox"]');
        let attacksCellContent;
        if (currentCountdownMode === 'minions') {
            attacksCellContent = row.cells[2].querySelector('select'); // Il dropdown della colonna "Attacks"
        } else { // boss mode
            attacksCellContent = row.cells[2].querySelector('span'); // Lo span della colonna "Attacks"
        }


        let hasGreenHighlight = false;

        // Condizione per highlight verde: checkbox NON spuntata O attacchi massimi
        if (checkbox && !checkbox.checked) {
            hasGreenHighlight = true;
        } else if (attacksCellContent) {
            let attacksValue;
            if (currentCountdownMode === 'minions') {
                attacksValue = parseInt(attacksCellContent.value, 10);
            } else { // boss mode
                attacksValue = parseInt(attacksCellContent.textContent, 10); // Prendi il testo dallo span
            }

            if (currentCountdownMode === 'minions' && attacksValue === 9) {
                hasGreenHighlight = true;
            } else if (currentCountdownMode === 'boss' && attacksValue === 5) {
                hasGreenHighlight = true;
            }
        }

        if (hasGreenHighlight) {
            row.classList.add('highlight-row', 'row-green-static');
            row.style.color = 'black'; // Testo nero per maggiore contrasto sul verde
        } else {
            // Priorità degli alert per la formattazione della riga
            if (isAlert1Active) { // Alert 1: Rosso fisso, testo nero
                row.classList.add('row-alert-red-fixed');
            } else if (isAlert2Active || isAlert4Active) { // Alert 2 e 4: Lampeggiante
                row.classList.add('row-alert-blinking');
                // Alterna i colori per il lampeggio (isGreen è globale e alternata in updateClock)
                if (isGreen) {
                    row.classList.add('green');
                    row.classList.remove('red');
                } else {
                    row.classList.add('red');
                    row.classList.remove('green');
                }
            } else if (isAlert3Active) { // Alert 3: Blu chiaro fisso, testo nero
                row.classList.add('row-alert-blue-cyan');
            } else { // Se nessun alert è attivo, applica il grigio scuro solo in modalità minions
                if (currentCountdownMode === 'minions') {
                    row.classList.add('row-dark-grey');
                    row.style.color = 'white';
                }
                // In modalità boss, se non ci sono alert attivi e non è evidenziata verde,
                // non aggiungiamo row-dark-grey o altri colori base. Lasciamo il colore di default della tabella.
            }
        }
    });
}


// --- Data Handling Functions ---

// Funzione per salvare i dati della tabella
function saveTableData(mode, rowIndex, data) {
    let savedData = loadTableData();

    if (rowIndex < 0 || rowIndex >= savedData.length) {
        console.error(`Invalid rowIndex: ${rowIndex}`);
        return;
    }

    const row = savedData[rowIndex];

    if (row) {
        row.checked = data.checked;
        row.name = data.name;

        // Salva i dati nella proprietà specifica della modalità
        if (mode === 'minions') {
            row.day1_minions = data.day1;
            // Quando si salva in modalità minions, assicurati che i dati boss siano a default
            row.day1_boss = '0';
            row.boss_checkboxes = Array(5).fill(false);
        } else if (mode === 'boss') {
            // In modalità boss, day1_boss è il conteggio delle checkbox spuntate
            row.day1_boss = data.day1;
            if (data.bossCheckboxes) {
                row.boss_checkboxes = data.bossCheckboxes;
            }
            // Quando si salva in modalità boss, assicurati che i dati minions siano a default
            row.day1_minions = '0';
        }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
}

// Funzione per caricare i dati della tabella
function loadTableData() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
        let parsedData = JSON.parse(storedData);
        // Assicurati che ogni riga abbia la struttura completa
        parsedData = parsedData.map(row => {
            return {
                checked: row ? row.checked : false,
                name: row ? row.name : '',
                day1_minions: row && row.day1_minions !== undefined ? row.day1_minions : '0',
                day1_boss: row && row.day1_boss !== undefined ? row.day1_boss : '0', // day1_boss ora può essere anche il conteggio
                boss_checkboxes: (row && Array.isArray(row.boss_checkboxes) && row.boss_checkboxes.length === 5)
                                 ? row.boss_checkboxes
                                 : Array(5).fill(false)
            };
        });
        return parsedData;
    }
    // Ritorna una struttura completa e inizializzata se non ci sono dati
    return Array(30).fill(null).map(() => ({
        checked: false,
        name: '',
        day1_minions: '0',
        day1_boss: '0',
        boss_checkboxes: Array(5).fill(false)
    }));
}

// Funzione per caricare la configurazione degli alert da localStorage
function loadAlertConfig() {
    const storedConfig = localStorage.getItem(ALERT_CONFIG_STORAGE_KEY);
    if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        // Assicurati che alert4 esista per compatibilità con versioni precedenti
        if (!parsedConfig.alert4) {
            parsedConfig.alert4 = { countdownRef: 'boss ends in', lowerBound: '0', upperBound: '8' };
        }
         if (!parsedConfig.alert1) { // Ensure Alert 1 has default values if missing
            parsedConfig.alert1 = { countdownRef: 'minions end in', lowerBound: '8', upperBound: '48' };
        }
        return parsedConfig;
    }
    return {
        alert1: { countdownRef: 'minions end in', lowerBound: '8', upperBound: '48' },
        alert2: { countdownRef: 'minions end in', lowerBound: '0', upperBound: '8' },
        alert3: { countdownRef: 'boss ends in', lowerBound: '8', upperBound: '24' },
        alert4: { countdownRef: 'boss ends in', lowerBound: '0', upperBound: '8' }
    };
}

// Funzione per salvare la configurazione degli alert in localStorage
function saveAlertConfig() {
    const config = {
        alert1: {
            countdownRef: document.getElementById('alert1CountdownRef').value,
            lowerBound: document.getElementById('alert1LowerBound').value,
            upperBound: document.getElementById('alert1UpperBound').value
        },
        alert2: {
            countdownRef: document.getElementById('alert2CountdownRef').value,
            lowerBound: document.getElementById('alert2LowerBound').value,
            upperBound: document.getElementById('alert2UpperBound').value
        },
        alert3: {
            countdownRef: document.getElementById('alert3CountdownRef').value,
            lowerBound: document.getElementById('alert3LowerBound').value,
            upperBound: document.getElementById('alert3UpperBound').value
        },
        alert4: {
            countdownRef: document.getElementById('alert4CountdownRef').value,
            lowerBound: document.getElementById('alert4LowerBound').value,
            upperBound: document.getElementById('alert4UpperBound').value
        }
    };
    localStorage.setItem(ALERT_CONFIG_STORAGE_KEY, JSON.stringify(config));
    updateClock(); // Aggiorna l'interfaccia dopo il salvataggio
}

// Funzione per applicare la configurazione degli alert agli input
function applyAlertConfigToInputs() {
    const config = loadAlertConfig();
    populateTimeBoundDropdowns(); // Popola i dropdown prima di impostare i valori

    document.getElementById('alert1CountdownRef').value = config.alert1.countdownRef;
    document.getElementById('alert1LowerBound').value = config.alert1.lowerBound;
    document.getElementById('alert1UpperBound').value = config.alert1.upperBound;

    document.getElementById('alert2CountdownRef').value = config.alert2.countdownRef;
    document.getElementById('alert2LowerBound').value = config.alert2.lowerBound;
    document.getElementById('alert2UpperBound').value = config.alert2.upperBound;

    document.getElementById('alert3CountdownRef').value = config.alert3.countdownRef;
    document.getElementById('alert3LowerBound').value = config.alert3.lowerBound;
    document.getElementById('alert3UpperBound').value = config.alert3.upperBound;

    document.getElementById('alert4CountdownRef').value = config.alert4.countdownRef;
    document.getElementById('alert4LowerBound').value = config.alert4.lowerBound;
    document.getElementById('alert4UpperBound').value = config.alert4.upperBound;
}

// Funzione per popolare i dropdown dei limiti di tempo degli alert
function populateTimeBoundDropdowns() {
    const dropdowns = [
        document.getElementById('alert1LowerBound'),
        document.getElementById('alert1UpperBound'),
        document.getElementById('alert2LowerBound'),
        document.getElementById('alert2UpperBound'),
        document.getElementById('alert3LowerBound'),
        document.getElementById('alert3UpperBound'),
        document.getElementById('alert4LowerBound'),
        document.getElementById('alert4UpperBound')
    ];

    dropdowns.forEach(dropdown => {
        dropdown.innerHTML = '';
        timeBoundOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.text;
            dropdown.appendChild(opt);
        });
    });
}

// Funzione per popolare il dropdown "Attacks" in base alla modalità (ora non più dropdown per boss)
function populateAttacksDropdown(dropdownElement, mode) {
    dropdownElement.innerHTML = ''; // Pulisci sempre

    if (mode === 'minions') {
        attacksOptionsMinions.forEach(val => {
            const option = document.createElement('option');
            option.value = val.toString();
            option.textContent = val.toString();
            dropdownElement.appendChild(option);
        });
    }
    // Per la modalità 'boss', non si popola un dropdown, ma uno span (gestito in resetAndLoadTableData)
}

// Gestione della modalità corrente del countdown (variabile globale)
let currentActiveCountdownMode = '';


// Funzione per resettare e caricare i dati della tabella in base alla nuova modalità
function resetAndLoadTableData(newMode) {
    // Solo se la modalità è effettivamente cambiata, procedi con il ricaricamento
    if (currentActiveCountdownMode === newMode) {
        return;
    }

    currentActiveCountdownMode = newMode; // Aggiorna la modalità attiva

    const tableBody = document.querySelector('#guildTable tbody');
    const loadedData = loadTableData();

    for (let i = 0; i < 30; i++) {
        const row = tableBody.rows[i];
        if (!row) continue;

        const checkbox = row.cells[0].querySelector('input[type="checkbox"]');
        const nameInput = row.cells[1].querySelector('input[type="text"]');
        let attacksCell = row.cells[2];
        let minionsBossCell = row.cells[3];

        const rowData = loadedData[i];

        // Carica lo stato iniziale per checkbox e nome (questi sono già persistenti e non cambiano per modalità)
        checkbox.checked = rowData.checked;
        nameInput.value = rowData.name;

        // Gestisci la colonna "Attacks"
        attacksCell.innerHTML = ''; // Pulisci la cella

        // Gestisci la colonna "Minions/Used Teams"
        minionsBossCell.innerHTML = ''; // Pulisci la cella
        minionsBossCell.style.textAlign = 'center'; // Centra il testo
        minionsBossCell.style.padding = '12px'; // Torna al padding originale per il testo
        minionsBossCell.classList.remove('orange-text'); // Rimuovi classe precedente

        if (newMode === 'minions') {
            const attacksDropdown = document.createElement('select');
            populateAttacksDropdown(attacksDropdown, newMode); // Popola con opzioni corrette
            attacksCell.appendChild(attacksDropdown);
            attacksDropdown.value = rowData.day1_minions; // Imposta il valore salvato

            attacksDropdown.addEventListener('change', (event) => {
                const domRowIndex = event.target.closest('tr').rowIndex;
                const arrayIndex = domRowIndex - 1;

                const checkboxState = row.cells[0].querySelector('input[type="checkbox"]').checked;
                const nameValue = row.cells[1].querySelector('input[type="text"]').value;

                saveTableData(newMode, arrayIndex, {
                    checked: checkboxState,
                    name: nameValue,
                    day1: event.target.value,
                    bossCheckboxes: [] // Nessuna checkbox boss in modalità minions
                });
                updateClock(); // Aggiorna l'interfaccia dopo il salvataggio
            });

            minionsBossCell.textContent = 'minions';
            minionsBossCell.classList.add('orange-text'); // Aggiungi colore arancione
            // Assicurati che lo stato delle checkbox boss sia azzerato nel local storage
            if (rowData.boss_checkboxes.some(val => val === true) || parseInt(rowData.day1_boss) !== 0) {
                rowData.boss_checkboxes = Array(5).fill(false);
                rowData.day1_boss = '0';
                saveTableData('minions', i, rowData); // Salva i dati aggiornati
            }

        } else if (newMode === 'boss') {
            const attacksSpan = document.createElement('span');
            attacksSpan.classList.add('boss-attacks-count'); // Aggiungi una classe per identificarlo e stilizzare
            attacksSpan.textContent = rowData.day1_boss; // Inizializza con il valore salvato
            attacksCell.appendChild(attacksSpan);
            attacksCell.style.textAlign = 'center'; // Centra il testo
            attacksCell.style.verticalAlign = 'middle'; // Centra verticalmente il numero

            const checkboxContainer = document.createElement('div');
            checkboxContainer.classList.add('colored-checkbox-container');
            minionsBossCell.appendChild(checkboxContainer);
            minionsBossCell.style.textAlign = 'center';
            minionsBossCell.style.padding = '0'; // Rimuovi padding per le checkbox più strette

            bossCheckboxColors.forEach((colorClass, idx) => {
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.classList.add('custom-checkbox', colorClass); // AGGIUNGI LA CLASSE DI COLORE
                cb.checked = rowData.boss_checkboxes[idx] || false; // Carica lo stato salvato

                // Aggiungi event listener per le checkbox boss
                cb.addEventListener('change', (event) => {
                    const domRowIndex = event.target.closest('tr').rowIndex;
                    const arrayIndex = domRowIndex - 1;

                    const checkboxState = row.cells[0].querySelector('input[type="checkbox"]').checked;
                    const nameValue = row.cells[1].querySelector('input[type="text"]').value;
                    const currentBossCheckboxesState = Array.from(checkboxContainer.querySelectorAll('.custom-checkbox')).map(cbElem => cbElem.checked);
                    const newBossAttackCount = currentBossCheckboxesState.filter(c => c).length; // Conteggio delle spuntate

                    // Aggiorna lo span delle Attacks
                    attacksSpan.textContent = newBossAttackCount.toString();

                    saveTableData(newMode, arrayIndex, {
                        checked: checkboxState,
                        name: nameValue,
                        day1: newBossAttackCount.toString(), // Salva il conteggio delle checkbox
                        bossCheckboxes: currentBossCheckboxesState
                    });
                    updateClock(); // Aggiorna l'interfaccia dopo il salvataggio
                });
                checkboxContainer.appendChild(cb);
            });
            minionsBossCell.textContent = ''; // Rimuovi il testo "minions"
            const teamsText = document.createElement('span');
            teamsText.textContent = 'used teams';
            teamsText.classList.add('orange-text');
            minionsBossCell.appendChild(teamsText);
            minionsBossCell.appendChild(checkboxContainer); // Aggiungi il contenitore delle checkbox dopo il testo

            // Assicurati che il valore minions sia a 0 nel localStorage quando siamo in modalità boss
            if (parseInt(rowData.day1_minions) !== 0) {
                rowData.day1_minions = '0';
                saveTableData('boss', i, rowData); // Salva i dati aggiornati
            }
        }
    }
}


// Funzione per generare le righe iniziali della tabella (struttura HTML)
function generateTableRows(numRows) {
    const tableBody = document.querySelector('#guildTable tbody');
    tableBody.innerHTML = ''; // Pulisci il corpo della tabella prima di generare

    for (let i = 0; i < numRows; i++) {
        const row = tableBody.insertRow();

        // Cella 0: Checkbox principale
        const cell0 = row.insertCell(0);
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', () => {
            const domRowIndex = row.rowIndex; // Ottieni l'indice della riga DOM
            const arrayIndex = domRowIndex - 1; // Converti in indice 0-based per l'array

            const nameValue = row.cells[1].querySelector('input[type="text"]').value;
            let attacksValue;
            let bossCheckboxesState = [];

            if (currentActiveCountdownMode === 'minions') {
                if (row.cells[2].querySelector('select')) {
                    attacksValue = row.cells[2].querySelector('select').value;
                } else {
                    attacksValue = '0';
                }
            } else if (currentActiveCountdownMode === 'boss') {
                // In modalità boss, attacksValue è il conteggio delle checkbox spuntate
                const checkboxContainer = row.cells[3].querySelector('.colored-checkbox-container');
                if (checkboxContainer) {
                    bossCheckboxesState = Array.from(checkboxContainer.querySelectorAll('.custom-checkbox')).map(cb => cb.checked);
                    attacksValue = bossCheckboxesState.filter(c => c).length.toString();
                } else {
                    attacksValue = '0';
                }
            }


            saveTableData(currentActiveCountdownMode, arrayIndex, {
                checked: checkbox.checked,
                name: nameValue,
                day1: attacksValue,
                bossCheckboxes: bossCheckboxesState
            });
            updateClock();
        });
        cell0.appendChild(checkbox);

        // Cella 1: Player Name (input testuale)
        const cell1 = row.insertCell(1);
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.maxLength = 30;
        nameInput.placeholder = 'Player Name';
        nameInput.addEventListener('input', () => {
            const domRowIndex = row.rowIndex;
            const arrayIndex = domRowIndex - 1;

            const checkboxState = row.cells[0].querySelector('input[type="checkbox"]').checked;
            let attacksValue;
            let bossCheckboxesState = [];

            if (currentActiveCountdownMode === 'minions') {
                if (row.cells[2].querySelector('select')) {
                    attacksValue = row.cells[2].querySelector('select').value;
                } else {
                    attacksValue = '0';
                }
            } else if (currentActiveCountdownMode === 'boss') {
                const checkboxContainer = row.cells[3].querySelector('.colored-checkbox-container');
                if (checkboxContainer) {
                    bossCheckboxesState = Array.from(checkboxContainer.querySelectorAll('.custom-checkbox')).map(cb => cb.checked);
                    attacksValue = bossCheckboxesState.filter(c => c).length.toString();
                } else {
                    attacksValue = '0';
                }
            }

            saveTableData(currentActiveCountdownMode, arrayIndex, {
                checked: checkboxState,
                name: nameInput.value,
                day1: attacksValue,
                bossCheckboxes: bossCheckboxesState
            });
            updateClock();
        });
        cell1.appendChild(nameInput);

        // Cella 2: Attacks (sarà popolata dinamicamente da resetAndLoadTableData)
        row.insertCell(2);
        // Cella 3: Minions/Boss (sarà popolata dinamicamente da resetAndLoadTableData)
        row.insertCell(3);
    }
}

// --- Funzioni per la simulazione del tempo ---

function applyTimeSimulation() {
    const days = parseInt(document.getElementById('simulateDays').value, 10);
    const hours = parseInt(document.getElementById('simulateHours').value, 10);

    // Calcola l'offset totale in millisecondi
    simulatedTimeOffsetMs = (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000);

    // Salva l'offset nel localStorage per persistenza tra ricariche
    localStorage.setItem(SIMULATION_OFFSET_STORAGE_KEY, simulatedTimeOffsetMs.toString());

    updateClock(); // Aggiorna l'orologio con il nuovo offset
    updateSimulatedTimeDisplay(); // Aggiorna la visualizzazione dell'offset
}

function resetTimeSimulation() {
    simulatedTimeOffsetMs = 0; // Azzera l'offset
    document.getElementById('simulateDays').value = 0;
    document.getElementById('simulateHours').value = 0;

    localStorage.removeItem(SIMULATION_OFFSET_STORAGE_KEY); // Rimuovi dal localStorage
    updateClock(); // Aggiorna l'orologio
    updateSimulatedTimeDisplay(); // Aggiorna la visualizzazione dell'offset
}

function loadSimulatedTimeOffset() {
    const storedOffset = localStorage.getItem(SIMULATION_OFFSET_STORAGE_KEY);
    if (storedOffset) {
        simulatedTimeOffsetMs = parseInt(storedOffset, 10);
        // Ricostruisci i valori nei campi input se l'offset è stato caricato
        const totalHours = simulatedTimeOffsetMs / (1000 * 60 * 60);
        document.getElementById('simulateDays').value = Math.floor(totalHours / 24);
        const remainingHours = Math.round(totalHours - (Math.floor(totalHours / 24) * 24));
        document.getElementById('simulateHours').value = remainingHours;
    }
}

function updateSimulatedTimeDisplay() {
    const totalHours = simulatedTimeOffsetMs / (1000 * 60 * 60);
    const days = Math.floor(totalHours / 24);
    const hours = Math.round(totalHours - (days * 24));

    let displayString = `Current simulated offset: `;
    if (days !== 0) {
        displayString += `${days} day${Math.abs(days) !== 1 ? 's' : ''}, `;
    }
    if (days === 0 && hours === 0) {
        displayString += `0 hours.`;
    } else {
        displayString += `${hours} hour${Math.abs(hours) !== 1 ? 's' : ''}.`;
    }

    document.getElementById('simulated-time-display').textContent = displayString;
}

// Funzione per mostrare/nascondere i tester tools
function toggleTesterTools() {
    const testerToolsDiv = document.getElementById('time-simulation-controls');
    testerToolsDiv.classList.toggle('hidden');
    // Salva lo stato in localStorage
    localStorage.setItem(TESTER_TOOLS_VISIBLE_STORAGE_KEY, !testerToolsDiv.classList.contains('hidden'));
}

// Funzione per configurare i listener per i dropdown di configurazione degli alert
function setupAlertConfigListeners() {
    const inputs = document.querySelectorAll('#configTable select');
    inputs.forEach(input => {
        input.addEventListener('change', saveAlertConfig);
    });
}

// Inizializzazione principale
document.addEventListener('DOMContentLoaded', () => {
    populateTimeBoundDropdowns(); // Popola i dropdown dei limiti di alert
    generateTableRows(30); // Genera le 30 righe della tabella principale (struttura vuota per celle 2 e 3)
    applyAlertConfigToInputs(); // Carica e applica la configurazione degli alert

    // Carica l'offset di simulazione salvato (se presente)
    loadSimulatedTimeOffset();
    // Aggiorna subito la visualizzazione dell'offset dopo il caricamento
    updateSimulatedTimeDisplay();

    // Aggiungi event listener per i pulsanti di simulazione
    document.getElementById('applySimulation').addEventListener('click', applyTimeSimulation);
    document.getElementById('resetSimulation').addEventListener('click', resetTimeSimulation);

    // Listener per il bottone Tester Tools
    const toggleButton = document.getElementById('toggleTesterTools');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleTesterTools);
    }

    // Carica lo stato di visibilità dei tester tools al caricamento della pagina
    const testerToolsDiv = document.getElementById('time-simulation-controls');
    const isVisible = localStorage.getItem(TESTER_TOOLS_VISIBLE_STORAGE_KEY) === 'true';
    if (isVisible) {
        testerToolsDiv.classList.remove('hidden');
    } else {
        testerToolsDiv.classList.add('hidden');
    }

    // La prima chiamata a updateClock() determinerà la modalità del countdown
    // e quindi triggererà resetAndLoadTableData per caricare i dati corretti
    // e popolare le celle 2 e 3 con i rispettivi elementi.
    updateClock();
    setInterval(updateClock, 1000);
    setupAlertConfigListeners(); // Imposta i listener per i dropdown di alert DOPO l'inizializzazione dei valori
});