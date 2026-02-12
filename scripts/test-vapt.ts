import { authProtector } from "./src/gateway/auth-defense.ts";

async function test() {
    console.log("Simulando ataques de força bruta...");
    const ip = "1.2.3.4";
    for (let i = 1; i <= 6; i++) {
        const start = Date.now();
        await authProtector.recordFailure(ip);
        const duration = Date.now() - start;
        console.log(`Tentativa ${i}: Atraso de ${duration}ms. Bloqueado? ${authProtector.isBlocked(ip)}`);
    }
}

test().catch(console.error);
