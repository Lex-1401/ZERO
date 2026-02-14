import { connect } from "node:net";

async function runBenchmark() {
  console.log("Starting Gateway Stress Benchmark...");

  const PORTS = [19001]; // Default gateway ports
  const DURATION_MS = 10000;
  const CONCURRENCY = 50;

  let successful = 0;
  let failed = 0;
  const start = Date.now();

  const checkPort = (port: number) =>
    new Promise((resolve) => {
      const socket = connect(port, "127.0.0.1");
      socket.setTimeout(2000);
      socket.on("connect", () => {
        socket.end();
        resolve(true);
      });
      socket.on("error", () => resolve(false));
      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
    });

  // Verify gateway is up
  const isUp = await checkPort(PORTS[0]);
  if (!isUp) {
    console.error(`Gateway is not running on port ${PORTS[0]}. Start 'zero gateway' first.`);
    process.exit(1);
  }

  console.log(
    `Gateway active on ${PORTS[0]}. Launching ${CONCURRENCY} concurrent requests for ${DURATION_MS}ms...`,
  );

  const worker = async () => {
    while (Date.now() - start < DURATION_MS) {
      try {
        const ok = await checkPort(PORTS[0]);
        if (ok) successful++;
        else failed++;
      } catch {
        failed++;
      }
      // Small delay to prevent total starvation
      await new Promise((r) => setTimeout(r, 10));
    }
  };

  await Promise.all(Array(CONCURRENCY).fill(null).map(worker));

  const durationSec = (Date.now() - start) / 1000;
  const rps = successful / durationSec;

  console.log("--- Results ---");
  console.log(`Duration: ${durationSec.toFixed(2)}s`);
  console.log(`Successful Connections: ${successful}`);
  console.log(`Failed Connections: ${failed}`);
  console.log(`RPS: ${rps.toFixed(2)}`);

  if (failed > 0) {
    console.warn("WARNING: Dropped connections detected.");
  } else {
    console.log("SUCCESS: No dropped connections under load.");
  }
}

runBenchmark().catch(console.error);
