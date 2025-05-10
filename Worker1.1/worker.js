onmessage = (event) => {
    const iterations = event.data.iterations;
    let piApproximation = 0;

    for (let i = 0; i < iterations; i++) {
        const term = Math.pow(-1, i) / (2 * i + 1);
        piApproximation += term;
    }

    piApproximation *= 4;

    postMessage({ piApproximation: piApproximation });
};