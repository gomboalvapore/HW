document.addEventListener('DOMContentLoaded', () => {
    const iterationsInput = document.getElementById('iterations'); // Ora usato come "Iterazioni di riferimento"
    const numWorkersInput = document.getElementById('numWorkers');
    const startButton = document.getElementById('startButton');
    const timeTakenSpan = document.getElementById('timeTaken'); // Ora usato per il tempo di test
    const piValueSpan = document.getElementById('piValue'); // Ora usato per il "Punteggio"

    const BENCHMARK_DURATION = 10000; // Durata del benchmark in millisecondi (10 secondi)
    const WARM_UP_TIME = 100;

    startButton.addEventListener('click', () => {
        const referenceIterations = parseInt(iterationsInput.value); // Cambiato il nome per chiarezza
        const numWorkers = parseInt(numWorkersInput.value);

        if (numWorkers === 1) {
            runSingleWorkerBenchmark(referenceIterations);
        } else {
            runMultiWorkerBenchmark(referenceIterations, numWorkers);
        }
    });

    function runSingleWorkerBenchmark(referenceIterations) {
        timeTakenSpan.textContent = `${BENCHMARK_DURATION / 1000} secondi`; // Aggiorna il testo
        piValueSpan.textContent = 'In esecuzione...';

        let totalIterations = 0;
        let finalPiValue = 0;
        const startTime = performance.now();
        let isRunning = true;

        const worker = new Worker('worker.js');

        worker.postMessage({ iterations: referenceIterations }); // Inizia con un numero di iterazioni

        worker.onmessage = (event) => {
            finalPiValue = event.data.piApproximation;
            totalIterations += referenceIterations; // Accumula le iterazioni

            if (isRunning) {
                worker.postMessage({ iterations: referenceIterations }); // Continua a inviare lavoro
            }
        };

        worker.onerror = (error) => {
            console.error('Errore nel worker:', error);
            timeTakenSpan.textContent = 'Errore';
            piValueSpan.textContent = 'Si è verificato un errore nel worker.';
            worker.terminate();
            isRunning = false;
        };

        setTimeout(() => {
            isRunning = false; // Ferma l'invio di lavoro al worker
            worker.terminate();
            piValueSpan.textContent = totalIterations.toLocaleString(); // Mostra il punteggio
        }, BENCHMARK_DURATION);
    }

    function runMultiWorkerBenchmark(referenceIterations, numWorkers) {
        timeTakenSpan.textContent = `${BENCHMARK_DURATION / 1000} secondi`;
        piValueSpan.textContent = 'In esecuzione...';

        let totalIterations = 0;
        let completedWorkers = 0;
        const workerResults = new Array(numWorkers);
        const workerStartTimes = new Array(numWorkers);
        const workers = [];
        let isRunning = true;

        const baseIterationsPerWorker = Math.floor(referenceIterations / numWorkers);
        const remainingIterations = referenceIterations % numWorkers;

        for (let i = 0; i < numWorkers; i++) {
            const worker = new Worker('worker.js');
            workers.push(worker);

            let workerIterations = baseIterationsPerWorker;
            if (i < remainingIterations) {
                workerIterations++;
            }

            workerStartTimes[i] = performance.now();
            worker.postMessage({ iterations: workerIterations });

            worker.onmessage = (event) => {
                const workerId = i;
                workerResults[workerId] = event.data.piApproximation;
                totalIterations += workerIterations;

                if (isRunning) {
                    workerIterations = baseIterationsPerWorker;
                    if (i < remainingIterations) {
                        workerIterations++;
                    }
                    workers[workerId].postMessage({ iterations: workerIterations }); // Continua a inviare lavoro
                }
            };

            worker.onerror = (error) => {
                console.error('Errore nel worker:', error);
                timeTakenSpan.textContent = 'Errore';
                piValueSpan.textContent = 'Si è verificato un errore nel worker.';
                workers.forEach(w => w.terminate());
                isRunning = false;
            };
        }

        setTimeout(() => {
            isRunning = false;
            workers.forEach(worker => worker.terminate());
            piValueSpan.textContent = totalIterations.toLocaleString();
        }, BENCHMARK_DURATION);
    }
});