
export interface ProviderConfig {
    baseUrl?: string;
    apiKey?: string;
    models: any[];
}

export interface ModelsConfig {
    providers: Record<string, ProviderConfig>;
}
