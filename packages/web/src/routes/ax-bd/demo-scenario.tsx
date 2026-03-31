"use client";

import {
  Presentation,
  CheckCircle2,
  Circle,
  MessageSquare,
  Compass,
  MapPin,
  ClipboardCheck,
  AlertTriangle,
  ArrowRight,
  Clock,
  Users,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ── Checklist Item ── */
function CheckItem({ done, children }: { done?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 py-1">
      {done ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
      ) : (
        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className={cn("text-sm", done && "text-muted-foreground line-through")}>{children}</span>
    </li>
  );
}

/* ── Act Card ── */
function ActCard({
  number,
  title,
  duration,
  feature,
  icon: Icon,
  children,
}: {
  number: number;
  title: string;
  duration: string;
  feature: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">
              Act {number}: {title}
            </CardTitle>
            <CardDescription className="flex gap-2">
              <Badge variant="outline">{duration}</Badge>
              <Badge variant="secondary">{feature}</Badge>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/* ── Demo Question Row ── */
function QuestionRow({
  num,
  question,
  type,
  description,
}: {
  num: number;
  question: string;
  type: "local" | "llm";
  description: string;
}) {
  return (
    <tr className="border-b">
      <td className="px-3 py-2 text-center text-sm text-muted-foreground">{num}</td>
      <td className="px-3 py-2 text-sm font-medium">"{question}"</td>
      <td className="px-3 py-2 text-center">
        <Badge variant={type === "local" ? "default" : "secondary"} className="text-xs">
          {type === "local" ? "즉시" : "LLM"}
        </Badge>
      </td>
      <td className="px-3 py-2 text-sm text-muted-foreground">{description}</td>
    </tr>
  );
}

/* ── Main Page ── */
export function Component() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Presentation className="h-5 w-5" />
          <span className="text-sm font-medium">팀 데모 시나리오</span>
        </div>
        <h1 className="text-3xl font-bold">발굴 프로세스 UX 개선</h1>
        <p className="text-lg text-muted-foreground">
          Foundry-X에서 사업 아이템 발굴 프로세스를 직관적으로 시작하고,
          AI 비서 안내를 받으며 단계별로 진행할 수 있어요.
        </p>
        <div className="flex flex-wrap gap-4 pt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="h-4 w-4" /> AX BD팀 7명</span>
          <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> 20~30분</span>
          <span className="flex items-center gap-1"><ExternalLink className="h-4 w-4" /> fx.minu.best</span>
        </div>
      </div>

      {/* Key Message */}
      <Card className="bg-blue-50 dark:bg-blue-950">
        <CardContent className="py-4">
          <h3 className="mb-2 font-semibold">핵심 메시지</h3>
          <ul className="space-y-1 text-sm">
            <li>CC Cowork은 <strong>"채팅"</strong>, Foundry-X는 <strong>"프로세스"</strong> — 단계별 진행 추적 + 산출물 관리 + 팀 공유</li>
            <li>어디서 시작할지 모르겠으면 → <strong>Help Agent에게 물어보세요</strong></li>
            <li>AI가 만든 결과물은 바로 검토·수정·승인 가능 → <strong>HITL 패널</strong></li>
          </ul>
        </CardContent>
      </Card>

      {/* Preparation Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">사전 준비 체크리스트</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-0">
            <CheckItem>Workers 배포 완료 (D1 0077~0078 적용)</CheckItem>
            <CheckItem>Pages 배포 완료</CheckItem>
            <CheckItem>OPENROUTER_API_KEY Workers secret 설정</CheckItem>
            <CheckItem>테스트용 biz-item 1건 사전 등록</CheckItem>
            <CheckItem>Feature Flag 활성화</CheckItem>
            <CheckItem>발표자 계정 로그인 확인</CheckItem>
            <CheckItem>화면 공유 준비 (Teams/Meet)</CheckItem>
          </ul>
        </CardContent>
      </Card>

      {/* ── Act 1 ── */}
      <ActCard number={1} title="온보딩 투어" duration="3분" feature="F265" icon={Compass}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">처음 발굴 페이지에 방문하는 팀원의 시점</p>
          <ol className="ml-4 list-decimal space-y-2 text-sm">
            <li>사이드바 <strong>"2. 발굴 → 🧭 발굴 위저드"</strong> 클릭</li>
            <li><strong>인터랙티브 투어 자동 시작</strong> (5스텝):
              <ul className="ml-4 mt-1 list-disc text-muted-foreground">
                <li>아이템 선택 → 현재 단계 확인 → 스킬 실행 → 결과 확인 → 다음 단계 이동</li>
              </ul>
            </li>
            <li>투어 완료 → "이제 직접 해볼까요?"</li>
          </ol>
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            <strong>포인트:</strong> "처음 오신 분은 이 투어가 자동으로 시작돼요. 다시 보고 싶으면 '투어 다시 보기' 버튼!"
          </div>
        </div>
      </ActCard>

      {/* ── Act 2 ── */}
      <ActCard number={2} title="발굴 위저드 탐색" duration="5분" feature="F263" icon={MapPin}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">사전 등록한 biz-item으로 프로세스 단계 탐색</p>
          <ol className="ml-4 list-decimal space-y-2 text-sm">
            <li>BizItem 드롭다운에서 <strong>"AI 기반 제조 품질 예측"</strong> 선택</li>
            <li>좌측 스텝퍼에서 2-0 (분류) 단계 확인</li>
            <li>각 단계 클릭 — <strong>목적, 추천 스킬, 예상 산출물, 체크포인트</strong> 확인</li>
            <li><strong>"시작하기"</strong> 버튼 → 단계 IN_PROGRESS 전환</li>
          </ol>
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            <strong>포인트:</strong> "예전엔 메뉴 10개가 나열되어 있었는데, 이제 스텝퍼만 보면 어디까지 했는지, 다음엔 뭘 해야 하는지 바로 보여요"
          </div>
        </div>
      </ActCard>

      {/* ── Act 3 ── */}
      <ActCard number={3} title="Help Agent 질의" duration="7분" feature="F264" icon={MessageSquare}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">프로세스 진행 중 AI 비서에게 질문</p>
          <ol className="ml-4 list-decimal space-y-1 text-sm">
            <li>우측 하단 💬 버튼 → Help Agent 챗 패널 열기</li>
            <li>아래 질문 순서대로 시연:</li>
          </ol>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-xs font-medium">#</th>
                  <th className="px-3 py-2 text-xs font-medium">질문</th>
                  <th className="px-3 py-2 text-center text-xs font-medium">응답</th>
                  <th className="px-3 py-2 text-xs font-medium">설명</th>
                </tr>
              </thead>
              <tbody>
                <QuestionRow num={1} question="다음 뭐 해야 돼?" type="local" description="현재 단계 기반 다음 액션 안내" />
                <QuestionRow num={2} question="이 단계에서 쓸 수 있는 스킬은?" type="local" description="추천 스킬 목록 (즉시)" />
                <QuestionRow num={3} question="BMC가 뭐야?" type="llm" description="SSE 스트리밍 타이핑 효과" />
                <QuestionRow num={4} question="시장 규모 분석은 어떻게 해?" type="llm" description="방법론 + 관련 스킬 추천" />
                <QuestionRow num={5} question="체크포인트 질문 보여줘" type="local" description="현재 단계 체크포인트 (즉시)" />
              </tbody>
            </table>
          </div>

          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            <strong>포인트:</strong> "CC Cowork처럼 물어볼 수 있지만, <strong>내가 보고 있는 아이템과 단계를 자동 인식</strong>해요. 단순 질문은 비용 없이 즉시!"
          </div>
        </div>
      </ActCard>

      {/* ── Act 4 ── */}
      <ActCard number={4} title="HITL 결과물 검토" duration="5분" feature="F266" icon={ClipboardCheck}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">스킬 실행 결과를 검토하고 승인</p>
          <ol className="ml-4 list-decimal space-y-2 text-sm">
            <li>위저드에서 추천 스킬 중 하나 실행 (예: "시장 스캔")</li>
            <li>결과 반환 → <strong>사이드 드로어 자동 오픈</strong></li>
            <li>4가지 액션 시연:
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-md border bg-green-50 px-3 py-2 text-sm dark:bg-green-950">
                  ✅ <strong>승인</strong> → 다음 단계 자동 연결
                </div>
                <div className="rounded-md border bg-blue-50 px-3 py-2 text-sm dark:bg-blue-950">
                  ✏️ <strong>수정</strong> → 에디터 전환 후 저장
                </div>
                <div className="rounded-md border bg-yellow-50 px-3 py-2 text-sm dark:bg-yellow-950">
                  🔄 <strong>재생성</strong> → AI에게 다시 요청
                </div>
                <div className="rounded-md border bg-red-50 px-3 py-2 text-sm dark:bg-red-950">
                  ❌ <strong>거부</strong> → 사유 입력 후 기록
                </div>
              </div>
            </li>
          </ol>
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            <strong>포인트:</strong> "CC Cowork에서는 복사해서 따로 저장했는데, 여기선 <strong>자동 저장 + 승인하면 다음 단계 연결</strong>. 누가 언제 승인했는지 이력도 남아요"
          </div>
        </div>
      </ActCard>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CC Cowork vs Foundry-X 비교</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 font-medium">항목</th>
                  <th className="px-3 py-2 font-medium">CC Cowork</th>
                  <th className="px-3 py-2 font-medium">Foundry-X (신규)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["시작점", "빈 채팅창", "위저드 스텝퍼 (현재 단계 표시)"],
                  ["다음 할 일", "직접 기억", "스텝퍼 + Help Agent 안내"],
                  ["산출물 관리", "채팅 히스토리 검색", "단계별 산출물 자동 저장"],
                  ["팀 공유", "채팅 링크 공유", "히스토리 + HITL 이력"],
                  ["프로세스 추적", "없음", "진행률 + 사업성 신호등"],
                ].map(([item, cowork, foundry], i) => (
                  <tr key={i} className="border-b">
                    <td className="px-3 py-2 font-medium">{item}</td>
                    <td className="px-3 py-2 text-muted-foreground">{cowork}</td>
                    <td className="px-3 py-2 font-medium text-blue-600 dark:text-blue-400">{foundry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Q&A */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Q&A + 피드백 수집</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="ml-4 list-decimal space-y-1 text-sm">
            <li>"어떤 점이 CC Cowork보다 나았나요?"</li>
            <li>"어떤 점이 불편하거나 부족했나요?"</li>
            <li>"가장 자주 쓸 것 같은 기능은?"</li>
            <li>"Help Agent에게 물어보고 싶은 질문이 더 있나요?"</li>
          </ol>
        </CardContent>
      </Card>

      {/* Emergency */}
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            비상 대응
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 font-medium">상황</th>
                  <th className="px-3 py-2 font-medium">대응</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Help Agent 응답 없음", "\"서버 지연\" 안내 → 로컬 응답 질문으로 전환"],
                  ["페이지 로딩 안 됨", "Workers cold start → 10초 대기 후 새로고침"],
                  ["스킬 실행 실패", "사전 실행 결과물로 HITL 시연"],
                  ["HITL 패널 안 열림", "산출물 목록에서 직접 클릭으로 우회"],
                ].map(([situation, response], i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-medium">{situation}</td>
                    <td className="px-3 py-2 text-muted-foreground">{response}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Post-demo Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRight className="h-4 w-4" />
            데모 후 액션 아이템
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 font-medium">항목</th>
                  <th className="px-3 py-2 font-medium">마감</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["피드백 정리 → Backlog 등록", "당일"],
                  ["Feature Flag 전체 활성화 (피드백 긍정 시)", "+1일"],
                  ["Help Agent 시스템 프롬프트 튜닝", "+3일"],
                  ["2주 후 KPI 측정 (주간 사용자, Help Agent 질문 수)", "+14일"],
                ].map(([item, deadline], i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="px-3 py-2">{item}</td>
                    <td className="px-3 py-2 text-muted-foreground">{deadline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
