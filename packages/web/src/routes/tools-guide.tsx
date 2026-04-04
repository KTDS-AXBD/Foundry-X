"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, PenTool } from "lucide-react";

const guides = [
  {
    id: "marker-io",
    title: "Marker.io 비주얼 피드백",
    icon: MessageSquare,
    content: `## Marker.io 사용 가이드

### 이 도구는 뭔가요?
Marker.io는 **브라우저 화면에 직접 피드백을 남기는 도구**예요. 화면 위에 핀을 꼽고 코멘트를 남기면, 스크린샷과 브라우저 정보가 자동으로 캡처되어 **GitHub Issue가 자동 생성**돼요.

### 누가 사용하나요?
- **비개발자**: 오탈자, 디자인 피드백, UX 문제를 직접 제보
- **개발자**: 버그 위치를 정확히 표시하여 재현 비용 절감

### 사용 방법

#### 1단계: 위젯 열기
로그인 후 대시보드에서 화면 우측 하단의 **말풍선 버튼**을 클릭해요.

#### 2단계: 피드백 남기기
1. 화면에서 문제가 있는 위치를 **클릭**해요
2. 자동으로 스크린샷이 캡처돼요
3. **어노테이션 도구**로 표시를 추가할 수 있어요 (화살표, 사각형, 텍스트)
4. 피드백 내용을 입력하고 **Submit** 클릭

#### 3단계: 자동 GitHub Issue 생성
제출하면 자동으로:
- GitHub Issue가 생성돼요 (\`visual-feedback\` 라벨)
- 스크린샷 + 브라우저/OS 정보가 첨부돼요
- 이슈 제목: \`[Visual Feedback] {페이지URL} — {요약}\`

### 계정이 필요한가요?
**아니요!** Marker.io 계정 없이 Guest로 바로 피드백을 남길 수 있어요.

### FAQ
- **Q: 피드백이 어디에 저장되나요?**
  A: GitHub Issues에 \`visual-feedback\` 라벨로 자동 생성돼요.
- **Q: 랜딩 페이지에서도 사용할 수 있나요?**
  A: 아니요, 로그인 후 대시보드 영역에서만 위젯이 표시돼요.
- **Q: 동영상도 첨부할 수 있나요?**
  A: Marker.io Starter 플랜에서는 스크린샷만 지원돼요.`,
  },
  {
    id: "tinacms",
    title: "TinaCMS 콘텐츠 편집",
    icon: PenTool,
    content: `## TinaCMS 사용 가이드

### 이 도구는 뭔가요?
TinaCMS는 **브라우저에서 웹사이트 콘텐츠를 직접 수정할 수 있는 도구**예요. 텍스트를 클릭하고 수정하면, 변경사항이 자동으로 **GitHub PR(Pull Request)로 생성**돼요.

### 누가 사용하나요?
- **비개발자**: 오탈자 수정, 문구 변경을 개발자 도움 없이 직접 처리
- **콘텐츠 관리자**: 랜딩 페이지 텍스트, Wiki 콘텐츠를 직접 관리

### 사용 방법

#### 1단계: 관리자 페이지 접속
브라우저에서 **[fx.minu.best/admin](https://fx.minu.best/admin)** 에 접속해요.

#### 2단계: TinaCloud 로그인
- **Authenticate With GitHub** 버튼을 클릭해요
- GitHub 계정으로 로그인하면 편집 화면이 열려요

#### 3단계: 콘텐츠 수정
1. 좌측 사이드바에서 **Landing Pages** 또는 **Wiki Pages** 를 선택해요
2. 수정할 페이지를 클릭해요
3. 텍스트를 직접 수정해요 (WYSIWYG 에디터)
4. **Save** 버튼을 클릭해요

#### 4단계: 자동 PR 생성
저장하면 자동으로:
- GitHub에 \`content/edit-{timestamp}\` 브랜치가 생성돼요
- 변경사항이 **PR(Pull Request)**로 제출돼요
- 개발자가 리뷰 후 머지하면 프로덕션에 반영돼요

### 편집 가능한 콘텐츠
| 페이지 | 경로 | 편집 대상 |
|--------|------|----------|
| 랜딩 Hero | content/landing/hero.md | 태그라인, Phase 정보, 통계 수치 |
| Wiki 소개 | content/wiki/intro.md | Foundry-X 소개 문서 |

### 주의사항
- 수정 후 바로 사이트에 반영되지 않아요 — **개발자 리뷰 + 머지** 후 반영돼요
- 이미지/아이콘은 편집할 수 없어요 (텍스트만 가능)
- 편집 권한은 TinaCloud에 등록된 사용자만 가능해요

### FAQ
- **Q: /admin 페이지가 안 열려요**
  A: TinaCloud에 GitHub 계정이 등록되어 있어야 해요. 관리자에게 권한 요청해주세요.
- **Q: 수정한 내용이 사라졌어요**
  A: PR이 아직 머지되지 않았을 수 있어요. GitHub에서 PR 상태를 확인해주세요.
- **Q: 새로운 페이지를 추가할 수 있나요?**
  A: /admin에서 "New Document" 버튼으로 추가할 수 있어요. content/ 디렉터리에 파일이 생성돼요.`,
  },
];

export function Component() {
  const [selected, setSelected] = useState(guides[0].id);
  const activeGuide = guides.find((g) => g.id === selected);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">도구 가이드</h1>
      <p className="mb-6 text-muted-foreground">
        팀 협업 도구의 사용법을 안내해요. Help Agent(우측 하단 ✨ 버튼)에서도 질문할 수 있어요.
      </p>

      <div className="flex min-h-[70vh] flex-col gap-4 lg:flex-row lg:gap-4">
        {/* Left: guide list */}
        <Card className="w-full shrink-0 lg:w-64">
          <CardContent className="p-3">
            <nav className="flex flex-col gap-1">
              {guides.map((guide) => {
                const Icon = guide.icon;
                return (
                  <button
                    key={guide.id}
                    onClick={() => setSelected(guide.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                      selected === guide.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="font-medium">{guide.title}</span>
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Right: guide content */}
        <Card className="flex-1">
          <CardContent className="prose prose-sm max-w-none p-6 dark:prose-invert">
            {activeGuide ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(activeGuide.content),
                }}
              />
            ) : (
              <p className="text-muted-foreground">가이드를 선택해주세요</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Simple markdown to HTML renderer for static guide content */
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.*$)/gm, '<h3 class="mt-6 mb-2 text-lg font-semibold">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="mt-8 mb-3 text-xl font-bold">$1</h2>')
    .replace(/^#### (.*$)/gm, '<h4 class="mt-4 mb-1 font-semibold">$1</h4>')
    .replace(/^\- \*\*Q: (.*?)\*\*$/gm, '<p class="mt-3 font-semibold">Q: $1</p>')
    .replace(/^  A: (.*)$/gm, '<p class="ml-4 text-muted-foreground">A: $1</p>')
    .replace(/^\| (.*) \|$/gm, (match) => {
      const cells = match.split("|").filter(Boolean).map((c) => c.trim());
      return `<tr>${cells.map((c) => `<td class="border px-3 py-1 text-sm">${c}</td>`).join("")}</tr>`;
    })
    .replace(/(<tr>.*<\/tr>\n)+/g, (match) => {
      const rows = match.trim().split("\n");
      if (rows.length < 2) return match;
      const header = rows[0].replace(/<td/g, "<th").replace(/<\/td/g, "</th");
      const body = rows.slice(2).join("\n"); // skip separator row
      return `<table class="my-4 w-full border-collapse">${header}${body}</table>`;
    })
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-sm">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline" target="_blank">$1</a>')
    .replace(/^(\d+)\. (.*)$/gm, '<li class="ml-4">$2</li>')
    .replace(/^- (.*)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
}
