import { useState, useEffect } from 'react';
import { gatewayClient } from './lib/gateway';
import './App.css';

export default function SettingsView() {
    const [theme, setTheme] = useState<string>('dark');
    const [language, setLanguage] = useState<string>('pt-BR');
    const [useLocalLlm, setUseLocalLlm] = useState<boolean>(true);
    const [modelType, setModelType] = useState<string>('ollama');

    const [apiKeys, setApiKeys] = useState<Record<string, string>>({
        anthropic: '',
        google: '',
        openai: '',
        deepseek: '',
        venice: '',
    });

    const [loading, setLoading] = useState(true);
    const [baseHash, setBaseHash] = useState<string | null>(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const res: any = await gatewayClient.call('config.get', {});
            setBaseHash(res.hash);
            const cfg = res.config || {};

            // Sync UI state with config
            if (cfg.ui?.theme) setTheme(cfg.ui.theme);
            if (cfg.ui?.language) setLanguage(cfg.ui.language);

            const providers = cfg.models?.providers || {};
            setApiKeys({
                anthropic: providers.anthropic?.apiKey || '',
                google: providers.google?.apiKey || '',
                openai: providers.openai?.apiKey || '',
                deepseek: providers.deepseek?.apiKey || '',
                venice: providers.venice?.apiKey || '',
            });

            setUseLocalLlm(!!providers.ollama || !!providers.mlx);
            if (providers.mlx) setModelType('mlx');
            else setModelType('ollama');

        } catch (err) {
            console.error('Falha ao carregar configuração', err);
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        try {
            const patch: any = {
                ui: { theme, language },
                models: {
                    providers: {
                        anthropic: apiKeys.anthropic ? { apiKey: apiKeys.anthropic } : undefined,
                        google: apiKeys.google ? { apiKey: apiKeys.google } : undefined,
                        openai: apiKeys.openai ? { apiKey: apiKeys.openai } : undefined,
                        deepseek: apiKeys.deepseek ? { apiKey: apiKeys.deepseek } : undefined,
                        venice: apiKeys.venice ? { apiKey: apiKeys.venice } : undefined,
                    }
                }
            };

            await gatewayClient.call('config.patch', {
                baseHash,
                raw: JSON.stringify(patch)
            });

            alert('Configurações salvas com sucesso!');
            loadConfig(); // Reload to get new hash
        } catch (err) {
            console.error('Falha ao salvar configuração', err);
            alert('Erro ao salvar: ' + (err as any).message);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Carregando...</div>;

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-out', paddingBottom: '4rem' }}>
            <h1>Configuração do Sistema</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Gerencie as chaves de API e preferências globais do seu Sistema Operacional Agêntico.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Interface Section */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)'
                }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🎨 Personalização
                    </h3>

                    <div style={{ marginBottom: '1.2rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Aparência</label>
                        <select
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                            style={selectStyle}
                        >
                            <option value="dark">Escuro</option>
                            <option value="light">Claro</option>
                            <option value="system">Sistema</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Idioma</label>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            style={selectStyle}
                        >
                            <option value="pt-BR">Português (Brasil)</option>
                            <option value="en-US">English (US)</option>
                        </select>
                    </div>
                </div>

                {/* Local LLM Section */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)'
                }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Local ∅ Inference
                    </h3>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '1rem' }}>
                        <input
                            type="checkbox"
                            checked={useLocalLlm}
                            onChange={(e) => setUseLocalLlm(e.target.checked)}
                        />
                        <span style={{ fontWeight: 500 }}>Habilitar Modelos Locais</span>
                    </label>

                    {useLocalLlm && (
                        <select
                            value={modelType}
                            onChange={(e) => setModelType(e.target.value)}
                            style={selectStyle}
                        >
                            <option value="ollama">Ollama (Recomendado)</option>
                            <option value="mlx">Apple MLX</option>
                        </select>
                    )}
                    <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        O Zero detectará automaticamente modelos disponíveis no Ollama.
                    </p>
                </div>
            </div>

            {/* API Keys Section */}
            <div style={{
                marginTop: '1.5rem',
                background: 'rgba(255,255,255,0.03)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)'
            }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🔑 Provedores de IA & Chaves de API
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {Object.keys(apiKeys).map(provider => (
                        <div key={provider}>
                            <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'capitalize', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                {provider} API Key
                            </label>
                            <input
                                type="password"
                                value={apiKeys[provider]}
                                onChange={(e) => setApiKeys({ ...apiKeys, [provider]: e.target.value })}
                                placeholder={`Insira sua chave ${provider}...`}
                                style={inputStyle}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                    onClick={loadConfig}
                    style={{
                        padding: '10px 20px',
                        background: 'transparent',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                    }}>
                    Descartar
                </button>
                <button
                    onClick={saveConfig}
                    style={{
                        padding: '10px 24px',
                        background: 'var(--accent-color)',
                        borderRadius: '8px',
                        color: 'white',
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                        cursor: 'pointer'
                    }}>
                    Salvar Configurações
                </button>
            </div>
        </div>
    );
}

const selectStyle = {
    width: '100%',
    background: 'var(--bg-secondary)',
    color: 'white',
    border: '1px solid var(--glass-border)',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    outline: 'none'
};

const inputStyle = {
    width: '100%',
    background: 'var(--bg-secondary)',
    color: 'white',
    border: '1px solid var(--glass-border)',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    outline: 'none'
};
