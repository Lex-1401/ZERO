import type { ZEROApp } from "./app";

let audioContext: AudioContext | null = null;
let scriptProcessor: ScriptProcessorNode | null = null;
let stream: MediaStream | null = null;
let pcmBuffer: Int16Array[] = [];

export async function startRecording(host: ZEROApp) {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);

        // ScriptProcessorNode for simplicity. 4096 buffer size.
        scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
        pcmBuffer = [];

        scriptProcessor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            // Convert float32 to int16
            const int16Data = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                const s = Math.max(-1, Math.min(1, inputData[i]));
                int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            pcmBuffer.push(int16Data);
        };

        source.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);

        host.chatRecording = true;
        host.chatRecordingStartTime = Date.now();
    } catch (err) {
        console.error("Failed to start recording:", err);
        host.lastError = "Não foi possível acessar o microfone.";
    }
}

export function stopRecording(host: ZEROApp) {
    if (scriptProcessor) {
        scriptProcessor.onaudioprocess = null;
        scriptProcessor.disconnect();
    }
    if (audioContext) {
        audioContext.close();
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    const totalLength = pcmBuffer.reduce((acc, b) => acc + b.length, 0);
    const result = new Int16Array(totalLength);
    let offset = 0;
    for (const b of pcmBuffer) {
        result.set(b, offset);
        offset += b.length;
    }

    processAudioRecording(host, result.buffer);

    host.chatRecording = false;
    host.chatRecordingStartTime = null;
}

export function cancelRecording(host: ZEROApp) {
    if (scriptProcessor) {
        scriptProcessor.onaudioprocess = null;
        scriptProcessor.disconnect();
    }
    if (audioContext) {
        audioContext.close();
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    host.chatRecording = false;
    host.chatRecordingStartTime = null;
}

async function processAudioRecording(host: ZEROApp, pcmData: ArrayBuffer) {
    host.chatLoading = true;
    try {
        const response = await fetch(`${host.basePath}/api/audio/transcribe`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${host.password}`,
                "Content-Type": "application/octet-stream",
            },
            body: pcmData,
        });

        if (!response.ok) {
            throw new Error("Falha na transcrição");
        }

        const data = await response.json();
        if (data.text) {
            if (host.chatMessage) {
                host.chatMessage += " " + data.text;
            } else {
                host.chatMessage = data.text;
            }
        }
    } catch (err) {
        console.error("Transcription error:", err);
        host.lastError = "Erro ao transcrever áudio.";
    } finally {
        host.chatLoading = false;
    }
}
