/**
 * Sprint 155 F344+F345: 멀티 페르소나 평가 Zustand Store
 */
import { create } from "zustand";
import { BASE_URL } from "../api-client";

export interface PersonaWeights {
  businessViability: number;
  strategicFit: number;
  customerValue: number;
  techMarket: number;
  execution: number;
  financialFeasibility: number;
  competitiveDiff: number;
}

export interface PersonaContext {
  situation: string;
  priorities: string[];
  style: string;
  redLines: string[];
}

export interface PersonaConfig {
  personaId: string;
  personaName: string;
  role: string;
  focus: string[];
  weights: PersonaWeights;
  context: PersonaContext;
}

export interface EvalStepStatus {
  personaId: string;
  personaName: string;
  status: "idle" | "evaluating" | "complete" | "error";
  scores?: Record<string, number>;
  verdict?: string;
  summary?: string | null;
  concerns?: string[];
}

export interface EvaluationResult {
  verdict: "green" | "keep" | "red";
  avgScore: number;
  totalConcerns: number;
  scores: Array<{
    personaId: string;
    scores: Record<string, number>;
    verdict: string;
    summary: string | null;
    concerns: string[];
    index: number;
  }>;
  warnings: string[];
}

const DEFAULT_WEIGHTS: PersonaWeights = {
  businessViability: 15,
  strategicFit: 15,
  customerValue: 15,
  techMarket: 15,
  execution: 15,
  financialFeasibility: 15,
  competitiveDiff: 10,
};

const DEFAULT_CONTEXT: PersonaContext = {
  situation: "",
  priorities: [],
  style: "neutral",
  redLines: [],
};

// 8 KT DS 페르소나 기본 목록
const DEFAULT_PERSONAS: PersonaConfig[] = [
  { personaId: "strategy", personaName: "전략기획팀장", role: "KT DS 전략기획팀장 (15년차)", focus: ["전략적합성", "시장규모", "성장잠재력"], weights: { ...DEFAULT_WEIGHTS }, context: { ...DEFAULT_CONTEXT } },
  { personaId: "sales", personaName: "영업총괄부장", role: "KT DS 영업총괄부장 (20년차)", focus: ["수주확보", "고객확장", "영업난이도"], weights: { ...DEFAULT_WEIGHTS }, context: { ...DEFAULT_CONTEXT } },
  { personaId: "ap_biz", personaName: "AP사업본부장", role: "KT DS AP사업본부장 (18년차)", focus: ["기술실현", "자원투입", "타임라인"], weights: { ...DEFAULT_WEIGHTS }, context: { ...DEFAULT_CONTEXT } },
  { personaId: "ai_tech", personaName: "AI기술본부장", role: "KT DS AI기술본부장 (12년차)", focus: ["기술차별성", "AI적합성", "데이터확보"], weights: { ...DEFAULT_WEIGHTS }, context: { ...DEFAULT_CONTEXT } },
  { personaId: "finance", personaName: "경영기획팀장", role: "KT DS 경영기획팀장 (15년차)", focus: ["재무타당성", "ROI", "투자회수"], weights: { ...DEFAULT_WEIGHTS }, context: { ...DEFAULT_CONTEXT } },
  { personaId: "security", personaName: "보안전략팀장", role: "KT DS 보안전략팀장 (13년차)", focus: ["보안위험", "컴플라이언스", "데이터거버넌스"], weights: { ...DEFAULT_WEIGHTS }, context: { ...DEFAULT_CONTEXT } },
  { personaId: "customer", personaName: "고객경험팀장", role: "KT DS 고객경험팀장 (14년차)", focus: ["고객가치", "사용자경험", "시장피드백"], weights: { ...DEFAULT_WEIGHTS }, context: { ...DEFAULT_CONTEXT } },
  { personaId: "innovation", personaName: "혁신추진팀장", role: "KT DS 혁신추진팀장 (10년차)", focus: ["혁신성", "확장가능성", "차세대사업"], weights: { ...DEFAULT_WEIGHTS }, context: { ...DEFAULT_CONTEXT } },
];

interface PersonaEvalState {
  configs: PersonaConfig[];
  briefing: string;
  evaluations: EvalStepStatus[];
  result: EvaluationResult | null;
  isRunning: boolean;
  demoMode: boolean;
  activeStep: "config" | "briefing" | "eval" | "results";

  // actions
  setConfigs: (configs: PersonaConfig[]) => void;
  updateWeight: (personaId: string, key: string, value: number) => void;
  updateContext: (personaId: string, context: PersonaContext) => void;
  setBriefing: (text: string) => void;
  setDemoMode: (demo: boolean) => void;
  setActiveStep: (step: "config" | "briefing" | "eval" | "results") => void;
  startEval: (itemId: string) => Promise<void>;
  reset: () => void;
}

export const usePersonaEvalStore = create<PersonaEvalState>((set, get) => ({
  configs: DEFAULT_PERSONAS.map((p) => ({ ...p })),
  briefing: "",
  evaluations: DEFAULT_PERSONAS.map((p) => ({
    personaId: p.personaId,
    personaName: p.personaName,
    status: "idle" as const,
  })),
  result: null,
  isRunning: false,
  demoMode: true,
  activeStep: "config",

  setConfigs: (configs) => set({ configs }),

  updateWeight: (personaId, key, value) => {
    const { configs } = get();
    set({
      configs: configs.map((c) => {
        if (c.personaId !== personaId) return c;
        const weights = rebalanceWeights(c.weights, key, value);
        return { ...c, weights };
      }),
    });
  },

  updateContext: (personaId, context) => {
    const { configs } = get();
    set({
      configs: configs.map((c) =>
        c.personaId === personaId ? { ...c, context } : c,
      ),
    });
  },

  setBriefing: (text) => set({ briefing: text }),
  setDemoMode: (demo) => set({ demoMode: demo }),
  setActiveStep: (step) => set({ activeStep: step }),

  startEval: async (itemId: string) => {
    const { configs, briefing, demoMode } = get();
    set({
      isRunning: true,
      result: null,
      activeStep: "eval",
      evaluations: configs.map((c) => ({
        personaId: c.personaId,
        personaName: c.personaName,
        status: "idle",
      })),
    });

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/ax-bd/persona-eval`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          itemId,
          configs: configs.map((c) => ({
            personaId: c.personaId,
            weights: c.weights,
            context: c.context,
          })),
          briefing,
          demoMode,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const block of lines) {
          const eventMatch = block.match(/^event: (.+)$/m);
          const dataMatch = block.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);

          if (event === "eval_start") {
            set((s) => ({
              evaluations: s.evaluations.map((e) =>
                e.personaId === data.personaId
                  ? { ...e, status: "evaluating" }
                  : e,
              ),
            }));
          } else if (event === "eval_complete") {
            set((s) => ({
              evaluations: s.evaluations.map((e) =>
                e.personaId === data.personaId
                  ? { ...e, status: "complete", scores: data.scores, verdict: data.verdict, summary: data.summary, concerns: data.concerns }
                  : e,
              ),
            }));
          } else if (event === "final_result") {
            set({ result: data, activeStep: "results" });
          } else if (event === "error") {
            console.error("Eval error:", data.message);
          }
        }
      }
    } catch (err) {
      console.error("Eval stream error:", err);
    } finally {
      set({ isRunning: false });
    }
  },

  reset: () => set({
    configs: DEFAULT_PERSONAS.map((p) => ({ ...p })),
    briefing: "",
    evaluations: DEFAULT_PERSONAS.map((p) => ({
      personaId: p.personaId,
      personaName: p.personaName,
      status: "idle",
    })),
    result: null,
    isRunning: false,
    activeStep: "config",
  }),
}));

/** 가중치 자동보정: 합계 100% 유지 */
function rebalanceWeights(
  weights: PersonaWeights,
  changedKey: string,
  newValue: number,
): PersonaWeights {
  const keys = Object.keys(weights) as (keyof PersonaWeights)[];
  const others = keys.filter((k) => k !== changedKey);
  const oldOtherSum = others.reduce((s, k) => s + weights[k], 0);
  const targetOtherSum = 100 - newValue;

  if (oldOtherSum === 0) {
    const each = Math.floor(targetOtherSum / others.length);
    const remainder = targetOtherSum - each * others.length;
    const result = { ...weights, [changedKey]: newValue };
    others.forEach((k, i) => {
      result[k] = each + (i < remainder ? 1 : 0);
    });
    return result;
  }

  const result = { ...weights, [changedKey]: newValue };
  let sum = newValue;
  for (const k of others) {
    const ratio = weights[k] / oldOtherSum;
    const val = Math.round(ratio * targetOtherSum);
    result[k] = val;
    sum += val;
  }
  const diff = 100 - sum;
  if (diff !== 0 && others.length > 0) {
    result[others[0]] += diff;
  }
  return result;
}
