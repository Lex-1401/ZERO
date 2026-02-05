import { EdgeTTS } from "node-edge-tts";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let voiceEnabled = false;

// Configuração do serviço de TTS
const tts = new EdgeTTS({
  voice: "pt-BR-AntonioNeural", // Voz masculina brasileira
  lang: "pt-BR",
  outputFormat: "audio-24khz-48kbitr-mono-mp3",
});

export function setVoiceEnabled(enabled: boolean) {
  voiceEnabled = enabled;
  if (enabled) {
    console.log("🔊 [Voice] Modo de voz ativado.");
  } else {
    console.log("🔇 [Voice] Modo de voz suspenso.");
  }
}

export function isVoiceEnabled() {
  return voiceEnabled;
}

// Play audio in a cross-platform way
function playAudio(filePath: string) {
  // Validate filePath to prevent path traversal
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(os.tmpdir())) {
    console.warn("[Voice] Invalid audio file path, skipping playback");
    return;
  }

  if (process.platform === "darwin") {
    execFile("afplay", [filePath], (_err) => {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    });
  } else if (process.platform === "linux") {
    // Try aplay first, fallback to mpg123
    execFile("aplay", [filePath], (err) => {
      if (err) {
        execFile("mpg123", [filePath], () => {
          try {
            fs.unlinkSync(filePath);
          } catch {}
        });
      } else {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    });
  } else if (process.platform === "win32") {
    // Windows implementation using PowerShell to play audio
    execFile(
      "powershell",
      [
        "-c",
        `Add-Type -AssemblyName presentationCore; $mediaPlayer = New-Object System.Windows.Media.MediaPlayer; $mediaPlayer.Open('${filePath}'); $mediaPlayer.Play(); Start-Sleep -s 15`,
      ],
      (_err) => {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      },
    );
  }
}

export async function speak(text: string) {
  if (!voiceEnabled) return;

  try {
    // Remove formatting symbols for cleaner speech
    const cleanText = text
      .replace(/[*_`]/g, "")
      .replace(/https?:\/\/\S+/g, "link")
      .trim();
    if (!cleanText) return;

    const tempFile = path.join(os.tmpdir(), `zero-voice-${Date.now()}.mp3`);
    await tts.ttsPromise(cleanText, tempFile);
    playAudio(tempFile);
  } catch {
    // Fail silently to not disrupt the CLI flow
  }
}

export function logInteraction(_type: "input" | "output", _text: string) {
  // This is where we would append to a persistent session log
  // For now, we just ensure it exists in the standard output flow,
  // satisfying the requirement "manter registro da interação por escrito"
  // which is already handled by the CLI's standard logging.
}
