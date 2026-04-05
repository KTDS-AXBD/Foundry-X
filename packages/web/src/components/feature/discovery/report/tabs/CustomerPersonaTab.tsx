/**
 * Sprint 157: F348 — 2-6 고객 페르소나 탭
 * Persona 카드 그리드 + Customer Journey 플로우
 */
import type { CustomerPersonaData } from "@foundry-x/shared";
import { StepHeader } from "../StepHeader";

interface Props {
  data: unknown;
}

function parseData(raw: unknown): CustomerPersonaData {
  if (!raw || typeof raw !== "object") return {};
  return raw as CustomerPersonaData;
}

function PersonaCards({ personas }: { personas: CustomerPersonaData["personas"] }) {
  if (!personas || personas.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">페르소나</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {personas.map((p, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700">
                {p.name.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.role}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{p.demographics}</div>
            {p.goals.length > 0 && (
              <div>
                <div className="text-xs font-medium text-green-700">Goals</div>
                <ul className="text-xs space-y-0.5">{p.goals.map((g, j) => <li key={j}>• {g}</li>)}</ul>
              </div>
            )}
            {p.painPoints.length > 0 && (
              <div>
                <div className="text-xs font-medium text-red-700">Pain Points</div>
                <ul className="text-xs space-y-0.5">{p.painPoints.map((pp, j) => <li key={j}>• {pp}</li>)}</ul>
              </div>
            )}
            {p.quote && (
              <div className="text-xs italic text-muted-foreground border-l-2 border-amber-300 pl-2">
                "{p.quote}"
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const EMOTION_COLORS: Record<string, string> = {
  positive: "text-green-600",
  neutral: "text-gray-500",
  negative: "text-red-500",
};

function JourneyFlow({ steps }: { steps: CustomerPersonaData["journeySteps"] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Customer Journey</h3>
      <div className="overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center">
              <div className="w-40 rounded-lg border p-3 text-xs space-y-1">
                <div className="font-medium">{step.stage}</div>
                <div className="text-muted-foreground">{step.action}</div>
                <div className={EMOTION_COLORS[step.emotion] ?? "text-gray-500"}>
                  {step.emotion === "positive" ? "😊" : step.emotion === "negative" ? "😟" : "😐"} {step.emotion}
                </div>
                <div className="text-muted-foreground">{step.touchpoint}</div>
                {step.opportunity && (
                  <div className="text-amber-600 font-medium">💡 {step.opportunity}</div>
                )}
              </div>
              {i < steps.length - 1 && <span className="mx-1 text-muted-foreground">→</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CustomerPersonaTab({ data: raw }: Props) {
  const data = parseData(raw);

  if (!data.personas && !data.journeySteps) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>고객 페르소나 데이터가 아직 없어요</p>
        <p className="text-xs mt-1">2-6 단계를 완료하면 결과가 표시돼요</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepHeader stepNum="2-6" title="고객 페르소나" color="var(--discovery-amber)" />
      <PersonaCards personas={data.personas} />
      <JourneyFlow steps={data.journeySteps} />
    </div>
  );
}
