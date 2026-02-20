
import type { SkillStatusEntry } from "../types";
import type { AppViewState } from "../app-view-state";

export async function translateSkillIfNecessary(state: AppViewState, skill: SkillStatusEntry): Promise<SkillStatusEntry> {
    const targetLang = localStorage.getItem("zero-lang") || "pt-BR";

    // Se já estiver em PT-BR e a skill tiver cara de PT-BR, ou se for inglês e já estiver em inglês, pula.
    if (targetLang === "pt-BR" && /[\u00C0-\u00FF]/.test(skill.description)) {
        return skill;
    }

    // Só traduz se tivermos um cliente conectado
    if (!state.client || !state.connected) return skill;

    try {
        const prompt = `Traduza os seguintes metadados de uma 'Skill' de IA para ${targetLang === "pt-BR" ? "Português do Brasil" : "Inglês"}. 
    Retorne APENAS um JSON válido.
    
    Nome original: ${skill.name}
    Descrição original: ${skill.description}
    
    Formato de resposta:
    { "name": "nome traduzido", "description": "descrição traduzida" }`;

        // Usamos o próprio agente para traduzir (através de uma sessão temporária ou comando direto)
        const result = await state.client.request("agent.chat", {
            message: prompt,
            sessionKey: "system:translator",
            quiet: true
        }) as any;

        if (result && result.text) {
            const cleaned = result.text.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            return {
                ...skill,
                name: parsed.name || skill.name,
                description: parsed.description || skill.description
            };
        }
    } catch (err) {
        console.error("Erro ao traduzir skill:", err);
    }

    return skill;
}

export async function translateSkillReport(state: AppViewState) {
    if (!state.skillsReport) return;

    const translatedSkills = await Promise.all(
        state.skillsReport.skills.map(skill => translateSkillIfNecessary(state, skill))
    );

    state.skillsReport = {
        ...state.skillsReport,
        skills: translatedSkills
    };
}
