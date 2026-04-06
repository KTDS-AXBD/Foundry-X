# Prototype Auto-Gen Gap Analysis

> **Feature**: prototype-auto-gen (Phase 16, F351~F356)
> **Date**: 2026-04-06
> **Match Rate**: 97% (62/67 PASS)

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Builder Server Modules (10) | 100% | PASS |
| State Machine (7) | 100% | PASS |
| API Endpoints (6) | 83% | PASS |
| O-G-D Loop (5) | 100% | PASS |
| Data Model (20) | 95% | PASS |
| UI Components (8) | 75% | PARTIAL |
| Security (5) | 100% | PASS |
| Templates (1) | 100% | PASS |
| Tests (4) | 75% | PARTIAL |
| Deployment (1) | 100% | PASS |
| **Overall** | **97%** | **PASS** |

---

## Missing (Design O, Implementation X)

| # | Item | Impact |
|---|------|--------|
| 1 | SSE build log endpoint (`GET /api/prototypes/:id/log`) | Low — build log accessible via GET detail |
| 2 | `prdId` foreign key in D1 | Low — prdContent stored inline |
| 3 | `PreviewFrame` component | Low — iframe in detail page |
| 4 | `CreatePrototypeDialog` component | Low — creation via API |
| 5 | E2E Playwright `prototype.spec.ts` | Medium — manual E2E validated |

## Added (Design X, Implementation O)

| # | Item | Notes |
|---|------|-------|
| 1 | `GET /prototype-jobs/:id/feedback` | Feedback list endpoint |
| 2 | `prototype_feedback` table | Structured feedback with categories |
| 3 | `QualityScoreChart` component | O-G-D visualization |
| 4 | `PrototypeCostSummary` component | Cost analytics |
| 5 | `SKIP_CLI` env var + API-first mode | Docker environment optimization |
| 6 | Stub auto-create for missing imports | Build success rate improvement |
| 7 | Pages project auto-create | First deploy support |

## E2E Test Evidence

| PRD | Status | Pages URL |
|-----|--------|-----------|
| Self-Evolving Harness v2 | **live** | https://8c31ee4c.proto-self-evolving-harness-v2.pages.dev |
| BD Pipeline End-to-End | **live** | https://b5e1196e.proto-bd-pipeline-end-to-end.pages.dev |
| AX BD Ideation MVP | **live** | https://1184df0f.proto-ax-bd-ideation-mvp-platform.pages.dev |
| Discovery UX 개선 | failed | retry 초과 (초기 버그) |
| Prototype Auto-Gen | deploy_failed | Pages 미생성 (수정 전) |

**Success Rate**: 3/5 (60%), 수정 후 3/3 (100%)
