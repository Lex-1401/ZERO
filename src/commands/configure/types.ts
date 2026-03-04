
export type ConfigureSectionChoice =
    | "identity"
    | "channels"
    | "models"
    | "skills"
    | "browser"
    | "memory"
    | "exit";

export interface ConfigureWizardParams {
    wizard?: boolean;
    sections?: ConfigureSectionChoice[];
}
