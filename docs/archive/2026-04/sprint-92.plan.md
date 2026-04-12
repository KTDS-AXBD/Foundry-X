---
code: FX-PLAN-S92
title: "Sprint 92 — GIVC Ontology PoC 1차 (KG 스키마 + 샘플 데이터 + 질의 API)"
version: 1.0
status: Draft
category: PLAN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-DSGN-S92]], [[FX-PLAN-S91]]"
---

# Sprint 92: GIVC Ontology PoC 1차 — KG 스키마 + 샘플 데이터 + 질의 API

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F255 GIVC Ontology PoC 1차 |
| Sprint | 92 |
| 기간 | 2026-03-31 |
| 우선순위 | P2 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 한국기계산업진흥회 GIVC 데이터의 2,443개 품목이 개별 사일로로 존재하여 품목 간 인과관계 분석, 공급망 연쇄 추적, "만약 ~하면?" 시나리오 예측이 불가능 |
| Solution | D1(SQLite) 위에 Property Graph 패턴(nodes + edges + properties)으로 산업 공급망 지식그래프 스키마를 설계하고, 샘플 서브그래프 데이터를 로드한 뒤 경로 탐색 API를 제공 |
| Function UX Effect | 관리자가 품목 간 공급 체인 관계를 조회하고, 특정 노드에서 시작하는 영향 전파 경로를 API로 탐색할 수 있음 |
| Core Value | Foundry-X BD Pipeline에 "산업 공급망 인과 분석" 역량을 추가하여 GIVC 고도화 제안의 기술 검증 기반을 확보 |

## 배경

### chatGIVC 1차 프로젝트 성과 (2025.07~11)
- 한국기계산업진흥회(KOAMI)의 정책분석·산업통계·R&D·공정도 데이터를 AI로 분석하는 chatGIVC 시스템 구축 완료
- ChatGIVC AI Agent: 산업분석보고서 21종 + GIVC 공정도 96종 RAG 기반 질의응답
- ChatGIVC SQL Agent: 637 테이블, 390개 자연어 질의 → SQL 자동생성
- TA 분류 모델: 품목코드 Top-1 정확도 86~92%, 533건 PASS

### 1차의 한계 (고도화 제안 배경)
- **품목 간 인과관계 부재**: 2,443개 품목이 개별 사일로로 존재, 공급 체인 연결 불가
- **시나리오 예측 불가**: 과거 데이터 조회만 가능, "만약 ~하면?" 가정 분석 미지원
- **데이터 사일로**: 무역·산업·R&D·EWS·GIVC·보고서 6개 시스템 분산
- **복잡 쿼리 지연**: SQL Agent max 153초, SLA 90초 초과

### Sprint 92의 위치
- **F245**(GIVC Ontology 전체 PoC)를 구체화한 1차 스프린트
- Sprint 92: KG 스키마 + 샘플 데이터 + 기본 질의 API (이번)
- Sprint 93(F256): 4대 시나리오 중 1개 MVP 구현 (다음)

## 목표

1. **KG 스키마 설계**: D1에 Property Graph 패턴 테이블 생성 (kg_nodes, kg_edges, kg_properties)
2. **Ontology 엔터티 정의**: 품목(중심) + 산업/국가/기업/기술/R&D/이벤트/경보 7개 엔터티 타입
3. **샘플 데이터 로드**: 원유→나프타→에틸렌→PE/PP→합성수지→자동차부품 공급 체인 서브그래프 (~50 노드, ~80 엣지)
4. **기본 질의 API**: 노드 CRUD + 이웃 탐색 + 경로 탐색(BFS) + 영향 전파 시뮬레이션
5. **웹 대시보드**: GIVC Ontology 탐색기 기본 UI (노드 검색 + 그래프 시각화 placeholder)

## F-Items

| F-Item | 제목 | 우선순위 | 비고 |
|--------|------|---------|------|
| F255 | GIVC Ontology PoC 1차 — KG 스키마 + 샘플 데이터 + 질의 API | P2 | F245 구체화. Sprint 93(F256) 선행 |

## 기술 결정

### 1. D1 위 Property Graph 패턴 (RDB→Graph 매핑)

전용 Graph DB(Neo4j, ArangoDB) 대신 기존 D1 인프라를 활용하는 전략:

```
kg_nodes: id, type, name, metadata(JSON)
kg_edges: id, source_node_id, target_node_id, relation_type, weight, metadata(JSON)
kg_properties: id, node_id|edge_id, key, value, value_type
```

**장점**: 추가 인프라 불필요, 기존 D1 마이그레이션 체계 활용, Workers에서 직접 접근
**단점**: 다단계 그래프 탐색 시 재귀 쿼리 성능 제약 (SQLite WITH RECURSIVE)
**판단**: PoC 규모(~100 노드)에서는 D1 성능 충분. 본사업 확장 시 Graph DB 전환 평가

### 2. 엔터티 타입 체계: GIVC Ontology 구조 반영

피치덱 v0.2 기준 엔터티 구조:
- **품목 (PRODUCT)**: 중심 엔터티. GIVC 품목코드 기반
- **산업 (INDUSTRY)**: 산업 분류 (반도체, 디스플레이, 자동차 등)
- **국가 (COUNTRY)**: 무역 데이터 연동용
- **기업 (COMPANY)**: 소부장넷 데이터 기반
- **기술 (TECHNOLOGY)**: 공정 기술 분류
- **R&D 과제 (RESEARCH)**: R&D 프로젝트
- **이벤트 (EVENT)**: 글로벌 이벤트 (분쟁, 자연재해, 정책 변경 등)
- **경보 (ALERT)**: EWS 경보 데이터

### 3. 관계 타입 정의

| 관계 | 소스 → 타겟 | 설명 |
|------|-----------|------|
| SUPPLIES | PRODUCT → PRODUCT | 공급 체인 (원재료 → 가공품) |
| BELONGS_TO | PRODUCT → INDUSTRY | 품목이 속한 산업 |
| PRODUCED_IN | PRODUCT → COUNTRY | 생산 국가 |
| PRODUCED_BY | PRODUCT → COMPANY | 생산 기업 |
| USES_TECH | PRODUCT → TECHNOLOGY | 사용 기술 |
| RESEARCHED_BY | PRODUCT → RESEARCH | 관련 R&D |
| AFFECTED_BY | PRODUCT → EVENT | 이벤트 영향 |
| WARNED_BY | PRODUCT → ALERT | 경보 연결 |
| SUBSTITUTES | PRODUCT → PRODUCT | 대체 관계 |
| COMPETES_WITH | COMPANY → COMPANY | 경쟁 관계 |

### 4. 영향 전파 알고리즘: BFS + 가중치 감쇠

- 시작 노드에서 BFS로 연결된 노드 탐색
- 각 hop마다 영향도 감쇠 (기본 0.7배)
- 영향도 임계값(threshold) 이하 도달 시 탐색 중단
- 결과: 영향받는 노드 목록 + 경로 + 영향도(H/M/L)
- PoC에서는 정성적 영향도만 제공 (정량 예측은 Sprint 93+)

### 5. 웹 UI: 기존 `/ax-bd/` 하위에 ontology 페이지 추가

새 랜딩이 아닌 BD 섹션 확장:
- `/ax-bd/ontology` — KG 탐색기 메인
- 노드 검색 + 타입 필터
- 그래프 시각화는 Sprint 93에서 D3/Cytoscape 도입 예정, 이번엔 리스트 뷰 + JSON 트리

## 구현 범위

### API (packages/api)

1. **D1 마이그레이션**: `0076_kg_ontology.sql` — kg_nodes, kg_edges, kg_properties 테이블
2. **신규 서비스**:
   - `kg-node.ts` — 노드 CRUD + 타입별 조회
   - `kg-edge.ts` — 엣지 CRUD + 이웃 탐색
   - `kg-query.ts` — 경로 탐색(BFS) + 영향 전파 시뮬레이션
   - `kg-seed.ts` — 샘플 데이터 시드 (원유→자동차부품 체인)
3. **신규 라우트**: `kg-ontology.ts` — 8~10 엔드포인트
4. **신규 스키마**: `kg-ontology.schema.ts` — 요청/응답 Zod 스키마
5. **테스트**: 서비스 + 라우트 테스트 (~40개)

### Web (packages/web)

1. **신규 페이지**: `app/(app)/ax-bd/ontology/page.tsx` — KG 탐색기
2. **신규 컴포넌트**:
   - `KgNodeSearch` — 노드 검색 + 타입 필터
   - `KgNodeDetail` — 노드 상세 + 이웃 목록
   - `KgPathResult` — 경로 탐색 결과 리스트
   - `KgImpactResult` — 영향 전파 결과 (H/M/L 뱃지)
3. **API 클라이언트**: `lib/api-client.ts`에 kg-ontology 엔드포인트 추가
4. **사이드바**: `/ax-bd/ontology` 메뉴 추가
5. **테스트**: 컴포넌트 + 페이지 테스트 (~15개)

### Shared (packages/shared)

1. `kg.ts` — KG 관련 공유 타입 (NodeType, EdgeType, ImpactLevel 등)

## 샘플 데이터 구성

### 서브그래프 1: 석유화학 공급 체인 (~30 노드, ~45 엣지)
```
원유 → 나프타 → 에틸렌 → PE/PP → 합성수지 → 자동차 내장재
                → 프로필렌 → 의료기기 부품
                → 벤젠 → 합성고무 → 타이어
```

### 서브그래프 2: 반도체 공급 체인 (~20 노드, ~35 엣지)
```
실리콘웨이퍼 → 포토마스크 → 에칭 → 다이 → 패키징 → 메모리칩
네온가스 → 노광 공정
불화수소 → 세정 공정
```

### 이벤트 노드 (~5개)
- 중동 분쟁, 일본 수출 규제, 대만 지진, EU 탄소국경조정, 미중 반도체 규제

## 예상 변경 파일

| 영역 | 파일 | 작업 |
|------|------|------|
| API migration | `src/db/migrations/0076_kg_ontology.sql` | 신규 |
| API service | `src/services/kg-node.ts` | 신규 |
| API service | `src/services/kg-edge.ts` | 신규 |
| API service | `src/services/kg-query.ts` | 신규 |
| API service | `src/services/kg-seed.ts` | 신규 |
| API route | `src/routes/kg-ontology.ts` | 신규 |
| API schema | `src/schemas/kg-ontology.schema.ts` | 신규 |
| API test | `src/routes/__tests__/kg-ontology.test.ts` | 신규 |
| API test | `src/services/__tests__/kg-node.test.ts` | 신규 |
| API test | `src/services/__tests__/kg-edge.test.ts` | 신규 |
| API test | `src/services/__tests__/kg-query.test.ts` | 신규 |
| API index | `src/index.ts` | 라우트 등록 |
| Web page | `src/app/(app)/ax-bd/ontology/page.tsx` | 신규 |
| Web component | `src/components/feature/kg/KgNodeSearch.tsx` | 신규 |
| Web component | `src/components/feature/kg/KgNodeDetail.tsx` | 신규 |
| Web component | `src/components/feature/kg/KgPathResult.tsx` | 신규 |
| Web component | `src/components/feature/kg/KgImpactResult.tsx` | 신규 |
| Web api-client | `src/lib/api-client.ts` | 수정 |
| Web sidebar | 사이드바 메뉴 | 수정 |
| Web test | `src/components/feature/kg/__tests__/` | 신규 |
| Shared | `src/kg.ts` | 신규 |

## 위험 요소

| 위험 | 영향 | 대응 |
|------|------|------|
| D1 WITH RECURSIVE 성능 | 다단계 탐색 시 느릴 수 있음 | PoC 50~100 노드 규모에서는 문제 없음. max_depth 파라미터로 제한 |
| 샘플 데이터 품질 | 실제 GIVC 데이터 부재 | 피치덱 시나리오 기반 합리적 서브그래프 구성. 실제 데이터는 KOAMI 협의 후 |
| 그래프 시각화 복잡도 | D3/Cytoscape 학습 비용 | Sprint 92에서는 리스트 뷰만 구현, 시각화는 Sprint 93으로 이연 |

## 성공 기준

| 기준 | 목표 |
|------|------|
| KG 스키마 | D1 마이그레이션 성공 + 로컬/리모트 적용 |
| 샘플 데이터 | 50+ 노드, 80+ 엣지 정상 로드 |
| API 엔드포인트 | 8+ 엔드포인트 정상 동작 |
| 경로 탐색 | 시작~끝 노드 간 경로 1초 이내 반환 |
| 영향 전파 | 시작 노드에서 3-hop 이내 영향 노드 목록 반환 |
| 테스트 | API 40+ / Web 15+ 테스트 PASS |
| typecheck | 전체 패키지 typecheck 통과 |
