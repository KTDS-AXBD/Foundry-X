# SKU 서비스 경계 테이블

**버전:** draft v1 (W+1)
**날짜:** 2026-04-14
**상태:** 초안 — W+4에 이해관계자 검토 후 확정 예정
**참조 PRD:** `prd-final.md §7.4`

---

## 개요

Type 1 SKU 3종(HR 반제품 / 손해사정 반제품 / 문서처리 반제품)이 미래 MSA 분리 시 어떤 *-X 서비스를 필요로 하는지, 어떤 도메인에 의존하는지 정리한 경계 테이블.

이 문서는 **신규 기능(F534~) 개발 시 도메인 배치 판단의 참고 기준**으로 사용됩니다.

---

## SKU 경계 테이블

| SKU | 필요 *-X 서비스 | 의존 도메인 (core/{domain}) | D1 테이블 prefix | 분리 난이도 | 비고 |
|-----|----------------|-----------------------------|------------------|-------------|------|
| **HR 반제품** | Discovery-X, Foundry-X | auth, files, workflow, harness | `hr_*` | 중간 | auth/files 의존은 공통 인프라라 분리 용이. workflow는 횡단 의존 해소 필요 |
| **손해사정 반제품** | Discovery-X, Decode-X, Guard-X | files, ontology, agent | `ins_*` | 높음 | Ontology 도메인 미완성 상태 (F535에서 구현 예정). Guard-X(품질관리) 구현 필요 |
| **문서처리 반제품** | Foundry-X, Launch-X | files, templates, shaping | `doc_*` | 낮음 | Shaping 도메인 이미 안정화. Launch-X(배포 자동화)만 신규 구현 필요 |

---

## *-X 서비스 정의

| *-X 서비스 | 역할 | 현재 상태 |
|------------|------|-----------|
| **Discovery-X** | BD 발굴 자동화 (Phase 39 Walking Skeleton 완료) | ✅ fx-discovery 존재, 프로덕션 트래픽 없음 |
| **Foundry-X** | BD 형상화 + Work Management 플랫폼 | ✅ packages/api (모놀리식) |
| **Decode-X** | 문서/이미지 OCR + 구조화 추출 | 📋 미구현 (W+8+ 계획) |
| **Guard-X** | AI 생성물 품질 보증 + HITL | 📋 harness/ 도메인에 부분 구현 |
| **Launch-X** | GTM 배포 자동화 + 고객 온보딩 | 📋 미구현 (W+8+ 계획) |

---

## 도메인별 분리 비용 분석

### HR 반제품 분리 경로 (중간 난이도)

```
현재 위치: packages/api/src/core/{auth,files,workflow}/
분리 대상: hr-x 독립 Worker
필요 작업:
  1. auth 공통 JWT 검증 추출 → shared library
  2. files presigned URL 인터페이스 표준화
  3. workflow 도메인 → HR 전용 + 공통 분리
예상 Sprint: 3~4 Sprint (W+8~W+10)
```

### 손해사정 반제품 분리 경로 (높은 난이도)

```
현재 위치: packages/api/src/core/{files,ontology(🆕),agent}/
분리 대상: insurance-x 독립 Worker
블로커:
  - ontology 도메인 미구현 (F535 의존)
  - Decode-X 구현 필요 (OCR/구조화)
  - Guard-X 품질 보증 레이어 분리
예상 Sprint: 6~8 Sprint (W+10~W+14, F535 완료 후)
```

### 문서처리 반제품 분리 경로 (낮은 난이도)

```
현재 위치: packages/api/src/core/{files,shaping}/
분리 대상: docproc-x 독립 Worker
shaping 도메인 안정화 완료로 interface 명확함
예상 Sprint: 2~3 Sprint (W+8~W+9)
```

---

## 신규 F-item 도메인 배치 가이드

신규 기능 개발 시 아래 질문으로 도메인을 결정하세요:

1. **어떤 SKU에 포함되나?** → 위 테이블에서 해당 SKU의 의존 도메인 확인
2. **두 SKU에 걸치나?** → `shared/contracts/`에 interface 정의 후 각 도메인에서 참조
3. **완전 횡단 기능(auth, logging 등)?** → `core/` 외부 공통 인프라 레이어로 분리

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-04-14 | draft v1 | 초안 작성 (PRD §7.4 기반 확장) | C54 task |
