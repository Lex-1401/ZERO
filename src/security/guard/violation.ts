
export class SecurityViolation {
    constructor(
        public type: "injection" | "pii" | "hallucination" | "policy" | "integrity",
        public details: string,
    ) { }
}
