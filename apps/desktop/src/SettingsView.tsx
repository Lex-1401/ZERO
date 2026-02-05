import { useState } from 'react';
import './App.css';

export default function SettingsView() {
    const [useLocalLlm, setUseLocalLlm] = useState<boolean>(true);
    const [modelType, setModelType] = useState<string>('ollama');

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <h1>Configuração do Gateway</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Configure como o Zero se conecta a modelos e canais.
            </p>

            <div style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)'
            }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ∅ Backend de Modelo
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={useLocalLlm}
                            onChange={(e) => setUseLocalLlm(e.target.checked)}
                            style={{ width: '18px', height: '18px' }}
                        />
                        <div>
                            <div style={{ fontWeight: 500 }}>Habilitar LLMs Locais</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                Priorizar Ollama/MLX sobre provedores de nuvem quando disponível.
                            </div>
                        </div>
                    </label>

                    {useLocalLlm && (
                        <div style={{ paddingLeft: '30px', paddingTop: '8px' }}>
                            <select
                                value={modelType}
                                onChange={(e) => setModelType(e.target.value)}
                                style={{
                                    background: 'var(--bg-secondary)',
                                    color: 'white',
                                    border: '1px solid var(--glass-border)',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    minWidth: '200px'
                                }}
                            >
                                <option value="ollama">Ollama (Padrão)</option>
                                <option value="mlx">Apple MLX</option>
                                <option value="llama-cpp">Llama.cpp</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div style={{
                marginTop: '1.5rem',
                background: 'rgba(255,255,255,0.03)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)'
            }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🔌 Canais
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Canais ativos: <strong>Terminal</strong>, <strong>Desktop</strong>.
                </p>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    color: 'var(--text-secondary)'
                }}>
                    Redefinir
                </button>
                <button style={{
                    padding: '10px 24px',
                    background: 'var(--accent-color)',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                }}>
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
}
