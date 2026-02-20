import sys
import os
import json
import numpy as np
import traceback
from faster_whisper import WhisperModel

# Performance Tuning for Local Desktop
# Using int8 quantization for lower RAM usage and faster CPU inference
MODEL_SIZE = "base" # "base" is a good balance for speed/accuracy on most CPUs
DEVICE = "cpu"
COMPUTE_TYPE = "int8"

def main():
    try:
        # Initialize model
        model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
        
        # Signal ready
        print(json.dumps({"status": "ready"}), flush=True)

        while True:
            # Read header from stdin
            # Expected format: JSON string ending with newline containing metadata
            line = sys.stdin.readline()
            if not line:
                break
            
            try:
                meta = json.loads(line)
                if meta.get("command") == "exit":
                    break
                
                # Read raw PCM data
                # meta should contain "length" in bytes
                length = meta.get("length")
                if length:
                    raw_audio = sys.stdin.buffer.read(length)
                    
                    # Convert raw PCM (16-bit, 16kHz) to float32
                    audio_np = np.frombuffer(raw_audio, dtype=np.int16).astype(np.float32) / 32768.0
                    
                    # Transcribe
                    segments, _ = model.transcribe(
                        audio_np,
                        beam_size=5,
                        vad_filter=True,
                        vad_parameters=dict(min_silence_duration_ms=500)
                    )
                    
                    # Emit results
                    for segment in segments:
                        print(json.dumps({
                            "type": "transcription",
                            "text": segment.text.strip(),
                            "start": segment.start,
                            "end": segment.end,
                            "confidence": segment.avg_logprob
                        }), flush=True)
                    
                    # End of turn signal
                    print(json.dumps({"type": "end_of_audio"}), flush=True)

            except Exception as e:
                print(json.dumps({"error": str(e), "trace": traceback.format_exc()}), flush=True)

    except Exception as e:
        print(json.dumps({"error": "Initialization failed: " + str(e)}), flush=True)

if __name__ == "__main__":
    main()
