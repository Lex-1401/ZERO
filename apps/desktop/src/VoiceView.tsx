import { useEffect, useRef, useState } from 'react';
// import { gatewayClient } from './lib/gateway';

export default function VoiceView() {
    const [isListening, setIsListening] = useState(false);
    const [status, setStatus] = useState('Pronto');
    const [volume, setVolume] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const animationFrameRef = useRef<number>(0);

    useEffect(() => {
        return () => {
            stopListening();
        };
    }, []);

    const startListening = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);

            analyserRef.current.fftSize = 256;
            const bufferLength = analyserRef.current.frequencyBinCount;
            dataArrayRef.current = new Uint8Array(bufferLength);

            source.connect(analyserRef.current);

            setIsListening(true);
            setStatus('Ouvindo...');
            drawVisualizer();
        } catch (err) {
            console.error('Erro ao acessar o microfone:', err);
            setStatus('Erro: Microfone inacessível');
        }
    };

    const stopListening = () => {
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        setIsListening(false);
        setStatus('Pronto');
        setVolume(0);
    };

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const drawVisualizer = () => {
        if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);

        // Calculate volume for simple visualization
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
            sum += dataArrayRef.current[i];
        }
        const average = sum / dataArrayRef.current.length;
        setVolume(average);

        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            const width = canvasRef.current.width;
            const height = canvasRef.current.height;
            const barWidth = (width / dataArrayRef.current.length) * 2.5;
            let barHeight;
            let x = 0;

            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < dataArrayRef.current.length; i++) {
                barHeight = dataArrayRef.current[i] / 2;

                const gradient = ctx.createLinearGradient(0, 0, 0, height);
                gradient.addColorStop(0, '#a78bfa');
                gradient.addColorStop(1, '#6366f1');

                ctx.fillStyle = gradient;
                ctx.fillRect(x, height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }
        }

        animationFrameRef.current = requestAnimationFrame(drawVisualizer);
    };

    return (
        <div className="voice-view">
            <div className="voice-container glass-morphism">
                <div className="voice-visualizer">
                    <canvas ref={canvasRef} width="600" height="200" />
                    {/* Fallback circle if canvas fails or for extra style */}
                    <div
                        className="pulsing-circle"
                        style={{
                            transform: `scale(${1 + volume / 50})`,
                            opacity: 0.5 + volume / 200
                        }}
                    />
                </div>

                <div className="status-text">{status}</div>

                <div className="controls">
                    <button
                        className={`mic-button ${isListening ? 'active' : ''}`}
                        onClick={toggleListening}
                    >
                        {isListening ? '🛑' : '🎙️'}
                    </button>
                </div>

                <div className="mode-selector">
                    <span className="mode-label">Modo: </span>
                    <select className="mode-select">
                        <option>Padrão (PTT)</option>
                        <option>VAD (Atividade de Voz)</option>
                        <option>Sempre Ativo</option>
                    </select>
                </div>
            </div>

            <style>{`
                .voice-view {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                    padding: 20px;
                }
                .voice-container {
                    width: 100%;
                    max-width: 700px;
                    height: 500px;
                    border-radius: 24px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: space-around;
                    padding: 40px;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.3);
                    position: relative;
                    overflow: hidden;
                }
                .voice-visualizer {
                    width: 100%;
                    height: 200px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                }
                .pulsing-circle {
                    position: absolute;
                    width: 150px;
                    height: 150px;
                    background: radial-gradient(circle, rgba(167,139,250,0.4) 0%, rgba(99,102,241,0.1) 70%);
                    border-radius: 50%;
                    z-index: -1;
                    transition: transform 0.05s ease-out;
                }
                .status-text {
                    font-size: 1.5rem;
                    font-weight: 300;
                    letter-spacing: 1px;
                    color: rgba(255,255,255,0.8);
                }
                .mic-button {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    border: none;
                    background: rgba(255,255,255,0.1);
                    font-size: 2.5rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 0 rgba(167,139,250,0);
                }
                .mic-button:hover {
                    background: rgba(255,255,255,0.15);
                    transform: scale(1.05);
                }
                .mic-button.active {
                    background: #ef4444;
                    box-shadow: 0 0 30px rgba(239,68,68,0.4);
                    animation: pulse-red 2s infinite;
                }
                @keyframes pulse-red {
                    0% { box-shadow: 0 0 0 0 rgba(239,68,68, 0.4); }
                    70% { box-shadow: 0 0 0 20px rgba(239,68,68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239,68,68, 0); }
                }
                .mode-selector {
                    margin-top: 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #aaa;
                }
                .mode-select {
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 8px;
                    outline: none;
                }
            `}</style>
        </div>
    );
}
