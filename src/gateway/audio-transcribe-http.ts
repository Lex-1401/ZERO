import type { IncomingMessage, ServerResponse } from "node:http";
import { whisperEngine } from "../voice/whisper-engine.js";
import { authorizeGatewayConnect, type ResolvedGatewayAuth } from "./auth.js";
import { getBearerToken } from "./http-utils.js";
import { sendJson, sendUnauthorized } from "./http-common.js";

export async function handleAudioTranscribeHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: { auth: ResolvedGatewayAuth; trustedProxies: string[] },
): Promise<boolean> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host || "localhost"}`);
  if (url.pathname !== "/api/audio/transcribe") return false;

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end();
    return true;
  }

  const token = getBearerToken(req);
  const authResult = await authorizeGatewayConnect({
    auth: opts.auth,
    connectAuth: { token, password: token },
    req,
    trustedProxies: opts.trustedProxies,
  });

  if (!authResult.ok) {
    sendUnauthorized(res);
    return true;
  }

  try {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));

    await new Promise((resolve, reject) => {
      req.on("end", resolve);
      req.on("error", reject);
    });

    const audioBuffer = Buffer.concat(chunks);

    // Transcription Logic
    // Since whisperEngine is a singleton using events, we need to carefully collect results
    // for this specific request. We'll use a one-time listener.

    const transcriptionPromise = new Promise<{ text: string }>((resolve, reject) => {
      let fullText = "";

      const onTranscription = (result: { text: string }) => {
        fullText += (fullText ? " " : "") + result.text;
      };

      const onEnd = () => {
        cleanup();
        resolve({ text: fullText });
      };

      const onError = (err: any) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        whisperEngine.removeListener("transcription", onTranscription);
        whisperEngine.removeListener("end_of_audio", onEnd);
        whisperEngine.removeListener("error", onError);
      };

      whisperEngine.on("transcription", onTranscription);
      whisperEngine.on("end_of_audio", onEnd);
      whisperEngine.on("error", onError);

      // I'll add a timeout just in case
      setTimeout(() => {
        cleanup();
        resolve({ text: fullText });
      }, 30000);
    });

    // Actually, I'll modify whisper-engine.ts to return a promise for transcription.
    // But for now, let's just use the engine's transcribe method if I can get results back.

    await whisperEngine.transcribe(audioBuffer);
    const result = await transcriptionPromise;

    sendJson(res, 200, { ok: true, text: result.text });
  } catch (err) {
    console.error("[AudioTranscribe] Error:", err);
    sendJson(res, 500, { ok: false, error: String(err) });
  }

  return true;
}
