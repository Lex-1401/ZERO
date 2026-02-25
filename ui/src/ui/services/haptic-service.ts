/**
 * HapticService
 * Gerencia o feedback táctil em dispositivos que suportam a API de Vibração.
 * Proporciona uma experiência 'Premium' com padrões de vibração sutis.
 */
export class HapticService {
    /**
     * Vibração sutil para interações leves (ex: cliques em botões secundários)
     */
    static light() {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(10);
        }
    }

    /**
     * Vibração média para confirmações de sucesso
     */
    static success() {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([15, 30, 15]);
        }
    }

    /**
     * Vibração forte e dupla para avisos ou erros críticos
     */
    static warning() {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([50, 100, 50]);
        }
    }

    /**
     * Padrão rítmico para o botão de Pânico
     */
    static panic() {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([100, 50, 100, 50, 300]);
        }
    }
}
