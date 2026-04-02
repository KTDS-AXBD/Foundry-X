-- 0082_bd_demo_seed.sql — Sprint 108 F279+F280 BD 데모 시딩
-- 2개 아이디어(헬스케어AI + GIVC) × 12+ 테이블 ~104 rows
-- 여러 번 실행해도 안전 (INSERT OR IGNORE)

-- ============================================================
-- 섹션 1: 기반 데이터 (org/user — 자급자족, demo-seed 호환)
-- ============================================================

INSERT OR IGNORE INTO organizations (id, name, slug, created_at, updated_at)
VALUES ('demo-org-001', 'KT DS 파일럿', 'kt-ds-pilot', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO users (id, email, name, password_hash, created_at, updated_at)
VALUES ('demo-user-001', 'demo@foundry-x.dev', 'Demo User',
  'pbkdf2:sha256:600000$salt$hash', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO org_members (org_id, user_id, role, joined_at)
VALUES ('demo-org-001', 'demo-user-001', 'admin', datetime('now'));

-- ============================================================
-- 섹션 2: biz_items (2건)
-- ============================================================

INSERT OR IGNORE INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
VALUES (
  'bd-demo-bi-hc-001',
  'demo-org-001',
  'AI 기반 의료기기 품질 예측 시스템',
  '의료기기 제조 공정에서 AI/ML 기반 실시간 품질 예측 및 불량 사전 탐지. CT/MRI 부품 제조라인의 센서 데이터를 분석하여 공정 이탈을 사전에 감지하고, 출하 전 품질 검사 비용을 40% 절감',
  'demo',
  'offering',
  'demo-user-001',
  '2026-01-15T09:00:00',
  '2026-03-15T14:00:00'
);

INSERT OR IGNORE INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
VALUES (
  'bd-demo-bi-gv-001',
  'demo-org-001',
  '산업 공급망 인과관계 예측 플랫폼 (chatGIVC)',
  '온톨로지 + Knowledge Graph 기반 산업 공급망 인과관계 분석. 2,443개 품목 데이터에서 원자재→부품→완제품 인과 체인을 추적하고, 공급 리스크를 선제적으로 예측. 기계산업진흥회 GIVC 데이터 활용',
  'demo',
  'decision',
  'demo-user-001',
  '2026-02-01T09:00:00',
  '2026-03-25T14:00:00'
);

-- ============================================================
-- 섹션 3: biz_item_classifications (2건)
-- ============================================================

INSERT OR IGNORE INTO biz_item_classifications (id, biz_item_id, item_type, confidence, turn_1_answer, turn_2_answer, turn_3_answer, analysis_weights, classified_at)
VALUES (
  'bd-demo-cls-hc-001',
  'bd-demo-bi-hc-001',
  'AI/ML 품질관리 플랫폼',
  0.92,
  '의료기기 제조 공정에서 발생하는 센서 데이터(온도, 압력, 진동 등)를 실시간으로 수집하여 AI/ML 모델로 품질 이상을 예측하는 시스템입니다. 핵심 기술은 CNN+LSTM 기반 시계열 예측 모델이며, 제조 도메인 특화 피처 엔지니어링이 차별점입니다.',
  '주요 고객은 CT/MRI 등 고가 의료기기 제조사이며, 현재 수동 SPC(통계적 공정 관리)에 의존하는 기업들입니다. 제조라인당 월 500만원 SaaS 구독 모델로, 불량률 감소에 따른 ROI가 명확합니다.',
  '경쟁사 대비 차별점: (1) 실시간 공정 데이터 연동 — 기존 솔루션은 배치 분석, (2) 의료기기 도메인 특화 — 범용 AI QC 대비 예측 정확도 30% 향상, (3) 설명 가능한 AI — 규제 대응 필수 요건 충족.',
  '{"technical": 0.35, "market": 0.30, "business": 0.35}',
  '2026-01-17T10:00:00'
);

INSERT OR IGNORE INTO biz_item_classifications (id, biz_item_id, item_type, confidence, turn_1_answer, turn_2_answer, turn_3_answer, analysis_weights, classified_at)
VALUES (
  'bd-demo-cls-gv-001',
  'bd-demo-bi-gv-001',
  '공급망 분석 SaaS',
  0.87,
  '한국 기계산업진흥회의 GIVC(글로벌 산업 가치사슬) 데이터를 기반으로 온톨로지와 Knowledge Graph를 구축하여, 산업 공급망의 인과관계를 분석하고 리스크를 예측하는 플랫폼입니다.',
  '2,443개 품목에 대한 원자재→부품→완제품 인과 체인을 시각화하고, 특정 원자재 공급 차질이 최종 제품에 미치는 영향을 정량적으로 분석합니다. 기관당 연 1.2억원 구독+컨설팅 하이브리드 모델입니다.',
  '경쟁 우위: (1) 한국 기계산업 특화 KG — 범용 SCM 도구 대비 인과 추적 정확도 2배, (2) chatGIVC 자연어 쿼리 인터페이스 — 비전문가도 사용 가능, (3) 진흥회 공식 데이터 접근권 확보.',
  '{"technical": 0.30, "market": 0.35, "business": 0.35}',
  '2026-02-03T10:00:00'
);

-- ============================================================
-- 섹션 4: biz_item_starting_points (2건)
-- ============================================================

INSERT OR IGNORE INTO biz_item_starting_points (id, biz_item_id, starting_point, confidence, reasoning, needs_confirmation, classified_at)
VALUES (
  'bd-demo-sp-hc-001',
  'bd-demo-bi-hc-001',
  'tech',
  0.91,
  'AI/ML 기술(CNN+LSTM 시계열 예측) 기반 출발. 의료기기 제조라인 센서 데이터 분석이라는 명확한 기술 적용 도메인이 있으며, PoC에서 94.2% 예측 정확도를 달성한 기술 우위가 핵심 동력',
  0,
  '2026-01-17T11:00:00'
);

INSERT OR IGNORE INTO biz_item_starting_points (id, biz_item_id, starting_point, confidence, reasoning, needs_confirmation, classified_at)
VALUES (
  'bd-demo-sp-gv-001',
  'bd-demo-bi-gv-001',
  'market',
  0.88,
  '공급망 리스크 관리 시장 수요에서 출발. 글로벌 공급망 불안정(반도체 부족, 지정학 리스크)으로 인한 시장 니즈가 명확하며, GIVC 데이터와 KG 기술을 결합하여 시장 문제를 해결',
  0,
  '2026-02-03T11:00:00'
);

-- ============================================================
-- 섹션 5: biz_evaluations (2건) + biz_evaluation_scores (6건)
-- ============================================================

INSERT OR IGNORE INTO biz_evaluations (id, biz_item_id, verdict, avg_score, total_concerns, evaluated_at)
VALUES ('bd-demo-eval-hc-001', 'bd-demo-bi-hc-001', 'positive', 8.2, 2, '2026-02-25T10:00:00');

INSERT OR IGNORE INTO biz_evaluations (id, biz_item_id, verdict, avg_score, total_concerns, evaluated_at)
VALUES ('bd-demo-eval-gv-001', 'bd-demo-bi-gv-001', 'positive', 7.8, 3, '2026-03-25T10:00:00');

-- 헬스케어AI 평가 점수 (3 persona)
INSERT OR IGNORE INTO biz_evaluation_scores (id, evaluation_id, persona_id, business_viability, strategic_fit, customer_value, tech_market, execution, financial_feasibility, competitive_diff, scalability, summary, concerns)
VALUES (
  'bd-demo-es-hc-cto',
  'bd-demo-eval-hc-001',
  'cto',
  8.5, 9.0, 8.0, 8.5, 7.5, 7.0, 8.5, 8.5,
  'AI/ML 기반 품질 예측 기술의 성숙도가 높고, 의료기기 제조 도메인에 대한 명확한 적용 사례가 있음. 실시간 데이터 처리 아키텍처와 설명 가능한 AI 구현이 기술적 차별점',
  '["의료기기 규제(MDSAP, ISO 13485) 대응 시 인증 비용 추가 발생 가능", "온프레미스 배포 요구 시 SaaS 모델 변경 필요"]'
);

INSERT OR IGNORE INTO biz_evaluation_scores (id, evaluation_id, persona_id, business_viability, strategic_fit, customer_value, tech_market, execution, financial_feasibility, competitive_diff, scalability, summary, concerns)
VALUES (
  'bd-demo-es-hc-biz',
  'bd-demo-eval-hc-001',
  'biz-lead',
  8.0, 8.5, 8.5, 7.5, 8.0, 7.5, 8.0, 8.0,
  '의료기기 품질관리 시장의 AI 전환 초기 단계로 선점 기회가 크며, 제조라인당 월 500만원 가격 대비 불량 절감 ROI가 명확하여 영업 설득력이 높음',
  '["초기 파일럿 고객 확보까지 6개월 이상 영업 사이클 예상"]'
);

INSERT OR IGNORE INTO biz_evaluation_scores (id, evaluation_id, persona_id, business_viability, strategic_fit, customer_value, tech_market, execution, financial_feasibility, competitive_diff, scalability, summary, concerns)
VALUES (
  'bd-demo-es-hc-cust',
  'bd-demo-eval-hc-001',
  'customer',
  9.0, 8.0, 9.0, 8.0, 7.0, 7.0, 8.5, 8.5,
  '현장 품질관리 담당자 입장에서 실시간 이상 감지와 사전 예측은 획기적인 가치. 기존 SPC 대비 불량 사전 탐지율 30% 향상은 실질적 비용 절감으로 직결',
  '[]'
);

-- GIVC 평가 점수 (3 persona)
INSERT OR IGNORE INTO biz_evaluation_scores (id, evaluation_id, persona_id, business_viability, strategic_fit, customer_value, tech_market, execution, financial_feasibility, competitive_diff, scalability, summary, concerns)
VALUES (
  'bd-demo-es-gv-cto',
  'bd-demo-eval-gv-001',
  'cto',
  8.0, 8.5, 7.5, 8.5, 7.0, 6.5, 8.5, 7.5,
  'Knowledge Graph + 온톨로지 기반 인과분석은 기술적으로 차별화된 접근. 2,443개 품목 데이터가 이미 구축되어 있어 cold start 문제 해결. chatGIVC 자연어 인터페이스는 사용성을 크게 높임',
  '["KG 업데이트 주기와 데이터 품질 관리 자동화 필요", "GPU 서버 비용 최적화 방안 마련 필요"]'
);

INSERT OR IGNORE INTO biz_evaluation_scores (id, evaluation_id, persona_id, business_viability, strategic_fit, customer_value, tech_market, execution, financial_feasibility, competitive_diff, scalability, summary, concerns)
VALUES (
  'bd-demo-es-gv-biz',
  'bd-demo-eval-gv-001',
  'biz-lead',
  7.5, 8.0, 8.0, 7.0, 7.5, 7.0, 7.5, 7.5,
  '공급망 리스크 관리 시장은 성장 중이나, 한국 기계산업 특화 니치 시장으로 TAM이 제한적. 진흥회 파트너십이 핵심 자산이며, 공공기관 납품 실적 확보가 초기 성장 동력',
  '["구독+컨설팅 하이브리드 모델의 매출 예측 변동성", "해외 확장 시 로컬 데이터 확보 난이도"]'
);

INSERT OR IGNORE INTO biz_evaluation_scores (id, evaluation_id, persona_id, business_viability, strategic_fit, customer_value, tech_market, execution, financial_feasibility, competitive_diff, scalability, summary, concerns)
VALUES (
  'bd-demo-es-gv-cust',
  'bd-demo-eval-gv-001',
  'customer',
  8.5, 7.5, 8.5, 7.5, 7.0, 7.0, 8.0, 8.0,
  '공급망 관리 실무자 입장에서 Excel 기반 수동 추적의 한계를 명확히 해결. 인과 체인 시각화와 자연어 쿼리는 비전문가도 활용 가능하여 조직 내 확산 용이',
  '["기존 ERP/SCM 시스템과의 통합 편의성 검증 필요"]'
);

-- ============================================================
-- 섹션 6: biz_discovery_criteria (18건 = 9 criteria × 2)
-- ============================================================

-- 헬스케어AI: criterion_id 1~9 전부 completed
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-hc-01', 'bd-demo-bi-hc-001', 1, 'completed', '시장 규모 분석 완료: TAM 2.3조원, SAM 4,500억원, SOM 450억원', '2026-01-20T10:00:00', '2026-01-20T10:00:00');
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-hc-02', 'bd-demo-bi-hc-001', 2, 'completed', '기술 타당성 검증: CNN+LSTM PoC 정확도 94.2%', '2026-01-25T10:00:00', '2026-01-25T10:00:00');
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-hc-03', 'bd-demo-bi-hc-001', 3, 'completed', '경쟁사 분석 완료: Siemens QMS, GE Digital 등 5사 비교', '2026-01-30T10:00:00', '2026-01-30T10:00:00');
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-hc-04', 'bd-demo-bi-hc-001', 4, 'completed', 'BMC 9블록 작성 완료: VP=AI 실시간 품질 예측', '2026-02-03T10:00:00', '2026-02-03T10:00:00');
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-hc-05', 'bd-demo-bi-hc-001', 5, 'completed', '재무 모델: BEP 12개월, IRR 32%', '2026-02-07T10:00:00', '2026-02-07T10:00:00');
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-hc-06', 'bd-demo-bi-hc-001', 6, 'completed', 'PRD v1 작성 완료: 핵심 기능 5개 정의', '2026-02-12T10:00:00', '2026-02-12T10:00:00');
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-hc-07', 'bd-demo-bi-hc-001', 7, 'completed', '파트너 에코시스템 맵핑: ○○메디칼 PoC 계약', '2026-02-17T10:00:00', '2026-02-17T10:00:00');
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-hc-08', 'bd-demo-bi-hc-001', 8, 'completed', 'MVP 스펙 확정: 센서→AI예측→대시보드 3모듈', '2026-02-22T10:00:00', '2026-02-22T10:00:00');
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-hc-09', 'bd-demo-bi-hc-001', 9, 'completed', 'BDP 경영진 보고 완료, 오퍼링 패키지 승인', '2026-02-27T10:00:00', '2026-02-27T10:00:00');

-- GIVC: criterion_id 1~7 completed, 8~9 pending
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-gv-01', 'bd-demo-bi-gv-001', 1, 'completed', '공급망 리스크 관리 시장: TAM 1.8조원, KG 기반 SAM 2,800억원', '2026-02-08T10:00:00', '2026-02-08T10:00:00');
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-gv-02', 'bd-demo-bi-gv-001', 2, 'completed', '2,443개 품목 온톨로지 구축 완료, chatGIVC PoC 동작', '2026-02-15T10:00:00', '2026-02-15T10:00:00');
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-gv-03', 'bd-demo-bi-gv-001', 3, 'completed', '경쟁사 분석: Resilinc, Everstream, Interos 등 5사 비교', '2026-02-22T10:00:00', '2026-02-22T10:00:00');
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-gv-04', 'bd-demo-bi-gv-001', 4, 'completed', 'BMC 9블록: VP=KG 기반 인과 추적, CS=기계산업 제조사', '2026-02-28T10:00:00', '2026-02-28T10:00:00');
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-gv-05', 'bd-demo-bi-gv-001', 5, 'completed', 'Commit Gate 통과: 4개 질문 전부 긍정', '2026-03-07T10:00:00', '2026-03-07T10:00:00');
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-gv-06', 'bd-demo-bi-gv-001', 6, 'completed', 'chatGIVC PRD 초안 작성 완료', '2026-03-15T10:00:00', '2026-03-15T10:00:00');
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-gv-07', 'bd-demo-bi-gv-001', 7, 'completed', '기술/사업/재무 타당성 분석 완료', '2026-03-20T10:00:00', '2026-03-20T10:00:00');
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-gv-08', 'bd-demo-bi-gv-001', 8, 'pending', NULL, NULL, '2026-03-25T10:00:00');
INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, evidence, completed_at, updated_at) VALUES ('bd-demo-dc-gv-09', 'bd-demo-bi-gv-001', 9, 'pending', NULL, NULL, '2026-03-25T10:00:00');

-- ============================================================
-- 섹션 7: pipeline_stages (12건 = 헬스 7 + GIVC 5)
-- ============================================================

-- 헬스케어AI — 7단계 완주
INSERT OR IGNORE INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by, notes) VALUES ('bd-demo-ps-hc-01', 'bd-demo-bi-hc-001', 'demo-org-001', 'REGISTERED', '2026-01-15T09:00:00', '2026-01-16T09:00:00', 'demo-user-001', '초기 등록 — AI 기반 의료기기 품질 예측 아이디어');
INSERT OR IGNORE INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by, notes) VALUES ('bd-demo-ps-hc-02', 'bd-demo-bi-hc-001', 'demo-org-001', 'DISCOVERY', '2026-01-16T09:00:00', '2026-02-10T17:00:00', 'demo-user-001', '5유형 분류(Tech) + 11단계 발굴 분석 완료');
INSERT OR IGNORE INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by, notes) VALUES ('bd-demo-ps-hc-03', 'bd-demo-bi-hc-001', 'demo-org-001', 'FORMALIZATION', '2026-02-10T17:00:00', '2026-02-20T17:00:00', 'demo-user-001', 'BMC 9블록 + BDP v1 작성 완료');
INSERT OR IGNORE INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by, notes) VALUES ('bd-demo-ps-hc-04', 'bd-demo-bi-hc-001', 'demo-org-001', 'REVIEW', '2026-02-20T17:00:00', '2026-02-25T17:00:00', 'demo-user-001', '팀 리뷰 완료 + O-G-D 검증 (0.875 CONVERGED)');
INSERT OR IGNORE INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by, notes) VALUES ('bd-demo-ps-hc-05', 'bd-demo-bi-hc-001', 'demo-org-001', 'DECISION', '2026-02-25T17:00:00', '2026-03-01T17:00:00', 'demo-user-001', 'Go 결정 — Commit Gate 4질문 전부 통과');
INSERT OR IGNORE INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by, notes) VALUES ('bd-demo-ps-hc-06', 'bd-demo-bi-hc-001', 'demo-org-001', 'OFFERING', '2026-03-01T17:00:00', '2026-03-15T17:00:00', 'demo-user-001', '오퍼링 패키지 4종(제안서/데모/기술검토/가격표) 구성 완료');
INSERT OR IGNORE INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by, notes) VALUES ('bd-demo-ps-hc-07', 'bd-demo-bi-hc-001', 'demo-org-001', 'MVP', '2026-03-15T17:00:00', NULL, 'demo-user-001', 'MVP 개발 진행 중 — React+FastAPI+TensorFlow');

-- GIVC — 5단계까지
INSERT OR IGNORE INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by, notes) VALUES ('bd-demo-ps-gv-01', 'bd-demo-bi-gv-001', 'demo-org-001', 'REGISTERED', '2026-02-01T09:00:00', '2026-02-02T09:00:00', 'demo-user-001', '초기 등록 — 산업 공급망 인과관계 예측');
INSERT OR IGNORE INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by, notes) VALUES ('bd-demo-ps-gv-02', 'bd-demo-bi-gv-001', 'demo-org-001', 'DISCOVERY', '2026-02-02T09:00:00', '2026-03-05T17:00:00', 'demo-user-001', 'KG 기반 분석 + chatGIVC PoC 동작 확인');
INSERT OR IGNORE INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by, notes) VALUES ('bd-demo-ps-gv-03', 'bd-demo-bi-gv-001', 'demo-org-001', 'FORMALIZATION', '2026-03-05T17:00:00', '2026-03-15T17:00:00', 'demo-user-001', 'BMC + chatGIVC PRD 초안 작성 완료');
INSERT OR IGNORE INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by, notes) VALUES ('bd-demo-ps-gv-04', 'bd-demo-bi-gv-001', 'demo-org-001', 'REVIEW', '2026-03-15T17:00:00', '2026-03-25T17:00:00', 'demo-user-001', 'O-G-D 검증 (0.89 CONVERGED) + 팀 리뷰 완료');
INSERT OR IGNORE INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by, notes) VALUES ('bd-demo-ps-gv-05', 'bd-demo-bi-gv-001', 'demo-org-001', 'DECISION', '2026-03-25T17:00:00', NULL, 'demo-user-001', '의사결정 진행 중 — commit (탐색 계속)');

-- ============================================================
-- 섹션 8: biz_item_discovery_stages (18건 = 헬스 11 + GIVC 7)
-- ============================================================

-- 헬스케어AI — 11단계(2-0~2-10) 전부 completed
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-hc-00', 'bd-demo-bi-hc-001', 'demo-org-001', '2-0', 'completed', '2026-01-16T09:00:00', '2026-01-17T17:00:00', '2026-01-16T09:00:00', '2026-01-17T17:00:00');
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-hc-01', 'bd-demo-bi-hc-001', 'demo-org-001', '2-1', 'completed', '2026-01-17T09:00:00', '2026-01-20T17:00:00', '2026-01-17T09:00:00', '2026-01-20T17:00:00');
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-hc-02', 'bd-demo-bi-hc-001', 'demo-org-001', '2-2', 'completed', '2026-01-20T09:00:00', '2026-01-25T17:00:00', '2026-01-20T09:00:00', '2026-01-25T17:00:00');
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-hc-03', 'bd-demo-bi-hc-001', 'demo-org-001', '2-3', 'completed', '2026-01-25T09:00:00', '2026-01-30T17:00:00', '2026-01-25T09:00:00', '2026-01-30T17:00:00');
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-hc-04', 'bd-demo-bi-hc-001', 'demo-org-001', '2-4', 'completed', '2026-01-30T09:00:00', '2026-02-03T17:00:00', '2026-01-30T09:00:00', '2026-02-03T17:00:00');
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-hc-05', 'bd-demo-bi-hc-001', 'demo-org-001', '2-5', 'completed', '2026-02-03T09:00:00', '2026-02-07T17:00:00', '2026-02-03T09:00:00', '2026-02-07T17:00:00');
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-hc-06', 'bd-demo-bi-hc-001', 'demo-org-001', '2-6', 'completed', '2026-02-07T09:00:00', '2026-02-12T17:00:00', '2026-02-07T09:00:00', '2026-02-12T17:00:00');
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-hc-07', 'bd-demo-bi-hc-001', 'demo-org-001', '2-7', 'completed', '2026-02-12T09:00:00', '2026-02-17T17:00:00', '2026-02-12T09:00:00', '2026-02-17T17:00:00');
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-hc-08', 'bd-demo-bi-hc-001', 'demo-org-001', '2-8', 'completed', '2026-02-17T09:00:00', '2026-02-22T17:00:00', '2026-02-17T09:00:00', '2026-02-22T17:00:00');
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-hc-09', 'bd-demo-bi-hc-001', 'demo-org-001', '2-9', 'completed', '2026-02-22T09:00:00', '2026-02-27T17:00:00', '2026-02-22T09:00:00', '2026-02-27T17:00:00');
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-hc-10', 'bd-demo-bi-hc-001', 'demo-org-001', '2-10', 'completed', '2026-02-27T09:00:00', '2026-03-03T17:00:00', '2026-02-27T09:00:00', '2026-03-03T17:00:00');

-- GIVC — 7단계(2-0~2-6) completed
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-gv-00', 'bd-demo-bi-gv-001', 'demo-org-001', '2-0', 'completed', '2026-02-02T09:00:00', '2026-02-03T17:00:00', '2026-02-02T09:00:00', '2026-02-03T17:00:00');
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-gv-01', 'bd-demo-bi-gv-001', 'demo-org-001', '2-1', 'completed', '2026-02-03T09:00:00', '2026-02-08T17:00:00', '2026-02-03T09:00:00', '2026-02-08T17:00:00');
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-gv-02', 'bd-demo-bi-gv-001', 'demo-org-001', '2-2', 'completed', '2026-02-08T09:00:00', '2026-02-15T17:00:00', '2026-02-08T09:00:00', '2026-02-15T17:00:00');
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-gv-03', 'bd-demo-bi-gv-001', 'demo-org-001', '2-3', 'completed', '2026-02-15T09:00:00', '2026-02-22T17:00:00', '2026-02-15T09:00:00', '2026-02-22T17:00:00');
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-gv-04', 'bd-demo-bi-gv-001', 'demo-org-001', '2-4', 'completed', '2026-02-22T09:00:00', '2026-02-28T17:00:00', '2026-02-22T09:00:00', '2026-02-28T17:00:00');
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-gv-05', 'bd-demo-bi-gv-001', 'demo-org-001', '2-5', 'completed', '2026-02-28T09:00:00', '2026-03-07T17:00:00', '2026-02-28T09:00:00', '2026-03-07T17:00:00');
INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, started_at, completed_at, created_at, updated_at) VALUES ('bd-demo-ds-gv-06', 'bd-demo-bi-gv-001', 'demo-org-001', '2-6', 'completed', '2026-03-07T09:00:00', '2026-03-15T17:00:00', '2026-03-07T09:00:00', '2026-03-15T17:00:00');

-- ============================================================
-- 섹션 9: ax_viability_checkpoints (12건 = 헬스 7 + GIVC 5)
-- ============================================================

-- 헬스케어AI — 7건(2-1~2-7 전부 go)
INSERT OR IGNORE INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, reason, decided_by, decided_at, created_at) VALUES ('bd-demo-vc-hc-01', 'bd-demo-bi-hc-001', 'demo-org-001', '2-1', 'go', '시장 규모가 충분한가?', '의료기기 품질관리 시장 TAM 2.3조원, AI 적용 SAM 4,500억원. CAGR 15.2%로 고성장 시장. 국내 의료기기 제조사 120개 중 AI 도입 10% 미만으로 선점 기회 충분', 'demo-user-001', '2026-01-20T14:00:00', '2026-01-20T14:00:00');
INSERT OR IGNORE INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, reason, decided_by, decided_at, created_at) VALUES ('bd-demo-vc-hc-02', 'bd-demo-bi-hc-001', 'demo-org-001', '2-2', 'go', '기술적으로 실현 가능한가?', 'CNN+LSTM 기반 예측 모델 PoC 정확도 94.2% 달성. 센서 데이터 파이프라인 구축 경험 보유. 설명 가능한 AI(XAI) 적용으로 규제 대응 가능', 'demo-user-001', '2026-01-25T14:00:00', '2026-01-25T14:00:00');
INSERT OR IGNORE INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, reason, decided_by, decided_at, created_at) VALUES ('bd-demo-vc-hc-03', 'bd-demo-bi-hc-001', 'demo-org-001', '2-3', 'go', '경쟁 우위가 있는가?', '실시간 공정 데이터 연동 + 도메인 특화 AI로 기존 SPC 대비 예측 정확도 30% 향상. Siemens QMS/GE Digital은 범용 솔루션으로 의료기기 특화 부족', 'demo-user-001', '2026-01-30T14:00:00', '2026-01-30T14:00:00');
INSERT OR IGNORE INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, reason, decided_by, decided_at, created_at) VALUES ('bd-demo-vc-hc-04', 'bd-demo-bi-hc-001', 'demo-org-001', '2-4', 'go', '사업 모델이 유효한가?', 'SaaS 구독 모델: 제조라인당 월 500만원. 불량률 감소에 따른 고객 ROI 명확(품질 비용 40% 절감). 손익분기 12개월 예상', 'demo-user-001', '2026-02-03T14:00:00', '2026-02-03T14:00:00');
INSERT OR IGNORE INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, reason, decided_by, decided_at, created_at) VALUES ('bd-demo-vc-hc-05', 'bd-demo-bi-hc-001', 'demo-org-001', '2-5', 'go', 'Commit Gate: 투자 대비 회수가 명확한가?', 'Commit Gate 4질문 전부 긍정 통과. MVP 6개월/2억원 규모 투자로 실패 시에도 기술 자산 재활용 가능. Go 결정', 'demo-user-001', '2026-02-07T14:00:00', '2026-02-07T14:00:00');
INSERT OR IGNORE INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, reason, decided_by, decided_at, created_at) VALUES ('bd-demo-vc-hc-06', 'bd-demo-bi-hc-001', 'demo-org-001', '2-6', 'go', '제품화 준비가 되었는가?', 'MVP 기능 정의 완료(센서수집/AI예측/대시보드 3모듈). 파트너사(○○메디칼) PoC 계약 체결. 기술 스택 확정(React+FastAPI+TensorFlow)', 'demo-user-001', '2026-02-17T14:00:00', '2026-02-17T14:00:00');
INSERT OR IGNORE INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, reason, decided_by, decided_at, created_at) VALUES ('bd-demo-vc-hc-07', 'bd-demo-bi-hc-001', 'demo-org-001', '2-7', 'go', 'GTM 전략이 수립되었는가?', '의료기기 전문 전시회(KIMES) + 파트너 채널 활용. 초기 3사 파일럿 확보 목표. 오퍼링 패키지 4종 구성 완료', 'demo-user-001', '2026-02-27T14:00:00', '2026-02-27T14:00:00');

-- GIVC — 5건(2-1~2-5)
INSERT OR IGNORE INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, reason, decided_by, decided_at, created_at) VALUES ('bd-demo-vc-gv-01', 'bd-demo-bi-gv-001', 'demo-org-001', '2-1', 'go', '시장 규모가 충분한가?', '공급망 리스크 관리 시장 TAM 1.8조원, KG 기반 SAM 2,800억원. 글로벌 공급망 불안정으로 수요 급증. 한국 기계산업 특화로 니치 시장 선점 가능', 'demo-user-001', '2026-02-08T14:00:00', '2026-02-08T14:00:00');
INSERT OR IGNORE INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, reason, decided_by, decided_at, created_at) VALUES ('bd-demo-vc-gv-02', 'bd-demo-bi-gv-001', 'demo-org-001', '2-2', 'go', '기술적으로 실현 가능한가?', '2,443개 품목 온톨로지 구축 완료. chatGIVC PoC 동작 확인. KG 기반 인과 추적 정확도가 범용 SCM 도구 대비 2배', 'demo-user-001', '2026-02-15T14:00:00', '2026-02-15T14:00:00');
INSERT OR IGNORE INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, reason, decided_by, decided_at, created_at) VALUES ('bd-demo-vc-gv-03', 'bd-demo-bi-gv-001', 'demo-org-001', '2-3', 'go', '경쟁 우위가 있는가?', '한국 기계산업 특화 KG는 진흥회 공식 데이터 기반으로 경쟁사 진입 장벽. Resilinc/Everstream은 글로벌 범용으로 한국 산업 세분화 부족', 'demo-user-001', '2026-02-22T14:00:00', '2026-02-22T14:00:00');
INSERT OR IGNORE INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, reason, decided_by, decided_at, created_at) VALUES ('bd-demo-vc-gv-04', 'bd-demo-bi-gv-001', 'demo-org-001', '2-4', 'go', '사업 모델이 유효한가?', '구독+컨설팅 하이브리드 모델: 기관당 연 1.2억원. 공공기관 납품 실적 확보 시 안정적 매출 기반. 손익분기 18개월 예상', 'demo-user-001', '2026-02-28T14:00:00', '2026-02-28T14:00:00');
INSERT OR IGNORE INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, reason, decided_by, decided_at, created_at) VALUES ('bd-demo-vc-gv-05', 'bd-demo-bi-gv-001', 'demo-org-001', '2-5', 'go', 'Commit Gate: 투자 대비 회수가 명확한가?', 'Commit Gate 4질문 전부 긍정. PoC 3개월/5천만원 규모, 실패해도 온톨로지 자산 활용 가능. 탐색 계속 결정', 'demo-user-001', '2026-03-07T14:00:00', '2026-03-07T14:00:00');

-- ============================================================
-- 섹션 10: ax_commit_gates (2건)
-- ============================================================

INSERT OR IGNORE INTO ax_commit_gates (id, biz_item_id, org_id, question_1_answer, question_2_answer, question_3_answer, question_4_answer, final_decision, reason, decided_by, decided_at, created_at)
VALUES (
  'bd-demo-cg-hc-001',
  'bd-demo-bi-hc-001',
  'demo-org-001',
  '이 사업 아이템 없이도 고객이 문제를 해결할 수 있는가? → 아니오. 현재 수동 SPC로 실시간 예측 불가, 불량 발생 후 사후 대응만 가능. AI 기반 사전 예측은 기존 방식으로 대체 불가능한 가치를 제공',
  '이 시장에서 3년 내 의미 있는 점유율을 확보할 수 있는가? → 예. 국내 의료기기 제조사 120개 중 AI 품질관리 도입 10% 미만. 선점 효과가 크고, 파트너사 PoC 성공 시 레퍼런스 확보 용이',
  '현재 팀이 이 사업을 실행할 역량이 있는가? → 예. AX BD팀 AI/ML 엔지니어 3명 + 의료기기 도메인 전문가 협업 체계 구축. PoC 94.2% 정확도 달성으로 기술 역량 검증 완료',
  '이 사업의 실패 시 조직에 미치는 영향은 감당 가능한가? → 예. MVP 6개월/2억원 규모. 실패 시 AI 품질 예측 기술 자산은 다른 제조 도메인(반도체, 자동차 부품)에 전용 가능',
  'commit',
  '4개 질문 전부 긍정 통과. 시장 기회, 기술 검증, 팀 역량, 리스크 관리 모두 충족. Go 결정',
  'demo-user-001',
  '2026-02-07T15:00:00',
  '2026-02-07T15:00:00'
);

INSERT OR IGNORE INTO ax_commit_gates (id, biz_item_id, org_id, question_1_answer, question_2_answer, question_3_answer, question_4_answer, final_decision, reason, decided_by, decided_at, created_at)
VALUES (
  'bd-demo-cg-gv-001',
  'bd-demo-bi-gv-001',
  'demo-org-001',
  '이 사업 아이템 없이도 고객이 문제를 해결할 수 있는가? → 부분적. Excel 기반 수동 추적 가능하나, 2,443개 품목의 인과 체인 분석은 수작업으로 불가능. 특히 2차/3차 영향 분석은 KG 없이 사각지대',
  '이 시장에서 3년 내 의미 있는 점유율을 확보할 수 있는가? → 예. 한국 기계산업 특화로 니치 시장 선점. 진흥회 파트너십이 경쟁사 진입 장벽으로 작용. 공공기관 3곳 파일럿 확보 목표',
  '현재 팀이 이 사업을 실행할 역량이 있는가? → 예. KG 전문가 2명 + 진흥회 데이터 접근권 확보. chatGIVC PoC 동작 확인으로 기술 실현 가능성 검증 완료',
  '이 사업의 실패 시 조직에 미치는 영향은 감당 가능한가? → 예. PoC 3개월/5천만원 규모로 소규모 투자. 실패해도 구축된 온톨로지(2,443 품목)와 KG 인프라는 다른 산업 분석에 재활용 가능',
  'commit',
  '4개 질문 전부 긍정. 니치 시장 특화 전략과 파트너십 기반의 진입 장벽이 강점. 탐색 계속 결정',
  'demo-user-001',
  '2026-03-07T15:00:00',
  '2026-03-07T15:00:00'
);

-- ============================================================
-- 섹션 11: bd_artifacts (16건 — 8 skill × 2 아이디어)
-- ============================================================

-- === 헬스케어AI 산출물 (8건) ===

-- HC-001: market-research (시장조사)
INSERT OR IGNORE INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by, created_at)
VALUES (
  'bd-demo-art-hc-001',
  'demo-org-001',
  'bd-demo-bi-hc-001',
  'market-research',
  '2-1',
  1,
  'AI 기반 의료기기 품질 예측 시스템에 대한 시장 규모 및 성장성 분석',
  '# 시장조사 보고서: AI 기반 의료기기 품질 예측 시스템

## 1. 시장 규모 (TAM/SAM/SOM)

| 구분 | 규모 | 산출 근거 |
|------|------|-----------|
| **TAM** (전체 시장) | **2.3조원** | 글로벌 의료기기 품질관리 소프트웨어 시장 (2025) |
| **SAM** (접근 가능) | **4,500억원** | 아시아태평양 AI 기반 제조 품질관리 시장 |
| **SOM** (초기 목표) | **450억원** | 한국 의료기기 제조사 중 AI 도입 의향 기업 |

## 2. 성장 동인

- **CAGR 15.2%** (2025~2030): AI/ML 기반 예측적 품질관리 수요 급증
- 의료기기 규제 강화(FDA, MDSAP)로 품질관리 자동화 필수
- CT/MRI 등 고가 장비 불량 비용 증가 → ROI 명확
- Industry 4.0 + 스마트팩토리 투자 확대

## 3. 시장 세그먼트

| 세그먼트 | 규모 | 특성 |
|----------|------|------|
| 대형 제조사 (연매출 1,000억+) | 35% | 자체 AI 팀 보유, 커스터마이징 요구 |
| 중형 제조사 (100~1,000억) | 45% | **핵심 타겟** — AI 역량 부족, SaaS 선호 |
| 소형 제조사 (100억 미만) | 20% | 비용 민감, 기본 기능 위주 |

## 4. 진입 전략

- **초기 타겟**: 중형 의료기기 제조사 (CT/MRI 부품 전문)
- **가격**: 제조라인당 월 500만원 (연 6,000만원)
- **첫해 목표**: 파일럿 3사 → 정식 계약 전환 70%
- **3년 목표**: 시장 점유율 10% (SOM 450억원 기준)',
  'claude-sonnet-4-5-20250514',
  3200,
  8500,
  'completed',
  'demo-user-001',
  '2026-01-20T10:00:00'
);

-- HC-002: competitor-analysis (경쟁분석)
INSERT OR IGNORE INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by, created_at)
VALUES (
  'bd-demo-art-hc-002',
  'demo-org-001',
  'bd-demo-bi-hc-001',
  'competitor-analysis',
  '2-3',
  1,
  '의료기기 품질관리 AI 솔루션 경쟁사 분석',
  '# 경쟁분석: 의료기기 AI 품질관리 솔루션

## 경쟁사 비교 매트릭스

| 기준 | **우리 솔루션** | Siemens QMS | GE Digital | Körber Pharma | 국내 A사 | 국내 B사 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| **실시간 예측** | ★★★ | ★★ | ★★ | ★ | ★ | ★ |
| **의료기기 특화** | ★★★ | ★★ | ★★ | ★★★ | ★ | ★★ |
| **XAI (설명가능)** | ★★★ | ★ | ★★ | ★ | ☆ | ☆ |
| **도입 용이성** | ★★★ | ★ | ★ | ★★ | ★★★ | ★★ |
| **가격 경쟁력** | ★★ | ★ | ★ | ★ | ★★★ | ★★★ |
| **한국 시장 지원** | ★★★ | ★ | ★ | ★ | ★★★ | ★★★ |

## 핵심 차별점

1. **실시간 공정 데이터 연동**: 경쟁사는 배치 분석 중심, 우리는 스트리밍 파이프라인
2. **도메인 특화 AI**: 범용 제조 AI가 아닌 의료기기 센서 데이터에 최적화된 모델
3. **설명 가능한 AI**: FDA/MDSAP 규제 대응 필수 요건 — 경쟁사 대부분 미충족
4. **클라우드 네이티브 SaaS**: 온프레미스 중심 경쟁사 대비 빠른 도입과 확장

## 경쟁 위협

- Siemens/GE의 번들 전략 (장비 + 소프트웨어 패키지)
- 국내 중소기업의 가격 경쟁
- 자체 개발 가능한 대형 제조사 이탈',
  'claude-sonnet-4-5-20250514',
  2800,
  7200,
  'completed',
  'demo-user-001',
  '2026-01-30T10:00:00'
);

-- HC-003: bmc-canvas (BMC)
INSERT OR IGNORE INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by, created_at)
VALUES (
  'bd-demo-art-hc-003',
  'demo-org-001',
  'bd-demo-bi-hc-001',
  'bmc-canvas',
  '2-4',
  1,
  'AI 의료기기 품질예측 시스템 Business Model Canvas 작성',
  '# Business Model Canvas: AI 의료기기 품질예측

## 9블록 캔버스

### 1. 가치 제안 (VP)
- AI/ML 기반 **실시간** 품질 예측으로 불량 사전 탐지
- 출하 전 품질 검사 비용 **40% 절감**
- 설명 가능한 AI로 **규제 대응** 지원 (FDA, MDSAP, ISO 13485)

### 2. 고객 세그먼트 (CS)
- **핵심**: 중형 의료기기 제조사 (CT/MRI 부품, 연매출 100~1,000억)
- **확장**: 대형 제조사의 신규 라인, 해외 제조 거점

### 3. 채널 (CH)
- 의료기기 전시회 (KIMES, MEDICA)
- 파트너사 소개 (○○메디칼 레퍼런스)
- 디지털 마케팅 + 기술 웨비나

### 4. 고객 관계 (CR)
- 전담 CSM (Customer Success Manager) 배정
- 월간 품질 리포트 + 분기별 모델 업데이트
- 24/7 기술 지원 (SLA 99.5%)

### 5. 수익원 (RS)
- **SaaS 구독**: 제조라인당 월 500만원
- **프리미엄**: 커스텀 모델 + 온프레미스 배포 (별도 견적)
- **컨설팅**: 도입 컨설팅 + 교육 (초기 3개월)

### 6. 핵심 자원 (KR)
- AI/ML 엔지니어 3명 + 도메인 전문가
- CNN+LSTM 예측 모델 (PoC 정확도 94.2%)
- 제조 센서 데이터 파이프라인

### 7. 핵심 활동 (KA)
- 실시간 데이터 수집 + 전처리 파이프라인 운영
- AI 모델 학습 + 배포 + 모니터링
- 고객 온보딩 + 커스터마이징

### 8. 핵심 파트너 (KP)
- ○○메디칼 (파일럿 파트너)
- 클라우드 인프라 (AWS/GCP)
- 의료기기 인증 컨설팅사

### 9. 비용 구조 (CS)
- 인건비: AI 엔지니어 + 도메인 전문가 (60%)
- 클라우드 인프라: GPU 서버 + 데이터 스토리지 (20%)
- 영업/마케팅: 전시회 + 파트너 관리 (15%)
- 기타: 인증, 법률 (5%)',
  'claude-sonnet-4-5-20250514',
  2500,
  6800,
  'completed',
  'demo-user-001',
  '2026-02-03T10:00:00'
);

-- HC-004: feasibility-study (타당성 분석)
INSERT OR IGNORE INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by, created_at)
VALUES (
  'bd-demo-art-hc-004',
  'demo-org-001',
  'bd-demo-bi-hc-001',
  'feasibility-study',
  '2-5',
  1,
  'AI 의료기기 품질예측 시스템 기술/사업/재무 타당성 분석',
  '# 타당성 분석: AI 의료기기 품질예측 시스템

## 1. 기술 타당성

| 항목 | 결과 | 근거 |
|------|------|------|
| AI 모델 정확도 | **94.2%** | CNN+LSTM PoC, 3개월 센서 데이터 학습 |
| 실시간 처리 | **< 200ms** | 스트리밍 파이프라인 PoC 검증 |
| 확장성 | **수평 확장** | 쿠버네티스 기반 아키텍처 |
| XAI 구현 | **SHAP 적용** | 피처 중요도 시각화 + 규제 대응 |

- **결론**: 기술적으로 실현 가능 (PoC → MVP 전환 가능)

## 2. 사업 타당성

| 항목 | 결과 | 근거 |
|------|------|------|
| 시장 성장률 | **CAGR 15.2%** | 의료기기 AI 품질관리 시장 |
| 고객 지불의향 | **70%** | 설문 조사 (중형 제조사 20곳) |
| 파트너십 | **1건 확보** | ○○메디칼 PoC 계약 |
| 차별화 | **명확** | 실시간 + 도메인특화 + XAI |

- **결론**: 시장 수요와 차별화 포인트가 명확

## 3. 재무 타당성

| 항목 | Year 1 | Year 2 | Year 3 |
|------|--------|--------|--------|
| 매출 | 3.6억 | 14.4억 | 36억 |
| 비용 | 8억 | 12억 | 18억 |
| 영업이익 | -4.4억 | 2.4억 | 18억 |
| 누적 | -4.4억 | -2억 | **16억** |

- **BEP**: 12개월 (파일럿 3사 + 정식 전환 기준)
- **IRR**: 32%
- **투자 규모**: MVP 6개월 / 2억원

## 4. 종합 판정

| 영역 | 점수 | 판정 |
|------|------|------|
| 기술 | 9/10 | **Go** |
| 사업 | 8/10 | **Go** |
| 재무 | 7/10 | **Go** (초기 투자 부담 있으나 회수 명확) |
| **종합** | **8/10** | **Go** |',
  'claude-sonnet-4-5-20250514',
  3000,
  7800,
  'completed',
  'demo-user-001',
  '2026-02-07T10:00:00'
);

-- HC-005: prd-draft (PRD 초안)
INSERT OR IGNORE INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by, created_at)
VALUES (
  'bd-demo-art-hc-005',
  'demo-org-001',
  'bd-demo-bi-hc-001',
  'prd-draft',
  '2-6',
  1,
  'AI 의료기기 품질예측 시스템 PRD v1 작성',
  '# PRD v1: AI 의료기기 품질 예측 시스템 (MediQA)

## 1. 제품 비전
의료기기 제조 공정의 품질 이상을 AI가 실시간으로 예측하여, 불량을 사전에 방지하고 품질 검사 비용을 40% 절감하는 SaaS 플랫폼

## 2. 핵심 기능

| # | 기능 | 우선순위 | 설명 |
|---|------|----------|------|
| F1 | 센서 데이터 수집 | P0 | 제조라인 센서(온도/압력/진동) 실시간 스트리밍 |
| F2 | AI 품질 예측 | P0 | CNN+LSTM 모델 기반 공정 이탈 사전 감지 |
| F3 | 대시보드 | P0 | 실시간 모니터링 + 이상 알림 + 트렌드 분석 |
| F4 | XAI 설명 | P1 | SHAP 기반 예측 근거 시각화 (규제 대응) |
| F5 | 리포트 생성 | P1 | 일/주/월 품질 리포트 자동 생성 |

## 3. 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | React 18 + Next.js + D3.js (시각화) |
| Backend | FastAPI + Celery (비동기 처리) |
| AI/ML | TensorFlow 2.x + SHAP |
| DB | PostgreSQL + TimescaleDB (시계열) |
| Infra | AWS EKS + S3 + CloudWatch |

## 4. 마일스톤

| Phase | 기간 | 산출물 |
|-------|------|--------|
| Phase 1 | M1~M2 | 센서 데이터 파이프라인 + DB 설계 |
| Phase 2 | M2~M3 | AI 모델 학습 + 추론 API |
| Phase 3 | M3~M4 | 대시보드 UI + 알림 시스템 |
| Phase 4 | M4~M5 | XAI + 리포트 기능 |
| Phase 5 | M5~M6 | 파일럿 배포 + 피드백 수집 |
| Phase 6 | M6 | 정식 출시 + 운영 안정화 |

## 5. 성공 지표 (KPI)
- 예측 정확도 ≥ 90% (PoC 대비 유지)
- 불량 사전 탐지율 30% 향상
- 품질 검사 비용 40% 절감
- 파일럿 → 정식 전환율 70%',
  'claude-sonnet-4-5-20250514',
  2600,
  6500,
  'completed',
  'demo-user-001',
  '2026-02-12T10:00:00'
);

-- HC-006: mvp-spec (MVP 스펙)
INSERT OR IGNORE INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by, created_at)
VALUES (
  'bd-demo-art-hc-006',
  'demo-org-001',
  'bd-demo-bi-hc-001',
  'mvp-spec',
  '2-8',
  1,
  'MediQA MVP 스펙 및 기술 아키텍처 정의',
  '# MVP 스펙: MediQA (AI 의료기기 품질예측)

## 1. MVP 범위 (3모듈)

### 모듈 1: 센서 데이터 수집
- MQTT/OPC-UA 프로토콜로 제조라인 센서 연동
- 5종 센서 지원: 온도, 압력, 진동, 습도, 전류
- 초당 100 포인트 스트리밍 처리
- 30일 원시 데이터 보관 + 1년 집계 데이터 보관

### 모듈 2: AI 예측 엔진
- CNN(공간 패턴) + LSTM(시계열) 앙상블 모델
- 추론 지연 < 200ms (P95)
- 배치 재학습: 주 1회 (새 데이터 반영)
- SHAP 기반 XAI: 예측 결과마다 상위 5개 피처 영향도 제공

### 모듈 3: 대시보드
- 실시간 공정 상태 모니터링 (WebSocket)
- 이상 감지 알림 (Slack/Email/SMS)
- 일간/주간 품질 트렌드 차트
- 예측 정확도 모니터링 (모델 드리프트 감지)

## 2. 기술 아키텍처

```
[센서] → MQTT Broker → [Kafka] → [전처리 Worker]
                                         ↓
                                   [TimescaleDB]
                                         ↓
                            [AI 추론 API (FastAPI)]
                                         ↓
                               [React 대시보드]
```

## 3. 인프라 요구사항
- GPU: A10G × 1 (추론), A100 × 1 (학습, on-demand)
- 스토리지: S3 100GB (모델 아티팩트 + 원시 데이터)
- DB: PostgreSQL r6g.large + TimescaleDB 확장
- 월 인프라 비용: 약 300만원

## 4. 일정
- MVP 개발: 6개월 (2026-03 ~ 2026-08)
- 파일럿 배포: 2026-09 (○○메디칼)
- 정식 출시: 2026-12',
  'claude-sonnet-4-5-20250514',
  2400,
  6200,
  'completed',
  'demo-user-001',
  '2026-02-22T10:00:00'
);

-- HC-007: bdp-executive (BDP 경영진 요약)
INSERT OR IGNORE INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by, created_at)
VALUES (
  'bd-demo-art-hc-007',
  'demo-org-001',
  'bd-demo-bi-hc-001',
  'bdp-executive',
  '2-9',
  1,
  'MediQA BDP 경영진 1페이지 요약 작성',
  '# BDP 경영진 요약: MediQA — AI 의료기기 품질예측

## 시장 기회
- 글로벌 의료기기 AI 품질관리 시장 **TAM 2.3조원**, CAGR 15.2%
- 국내 의료기기 제조사 120개 중 AI 도입 **10% 미만** → 선점 기회
- 규제 강화(FDA, MDSAP)로 품질관리 자동화 **의무화 추세**

## 솔루션
- CNN+LSTM 기반 **실시간** 품질 예측 (정확도 94.2%)
- 설명 가능한 AI(XAI)로 **규제 대응** 지원
- SaaS 제공으로 **빠른 도입** (2주 내 라인 연동)

## 재무 전망

| | Year 1 | Year 2 | Year 3 |
|--|--------|--------|--------|
| 매출 | 3.6억 | 14.4억 | 36억 |
| 영업이익 | -4.4억 | 2.4억 | 18억 |

- **BEP 12개월** / IRR 32% / 초기 투자 2억원

## 실행 계획
1. **M1~M6**: MVP 개발 (센서→AI→대시보드)
2. **M7~M9**: 파일럿 3사 배포 (○○메디칼 확정)
3. **M10~M12**: 정식 출시 + 영업 확대

## O-G-D 검증 결과
- 최종 점수: **0.875** (CONVERGED)
- 3 페르소나 평균: 기술 8.5 / 사업 8.0 / 고객 8.5
- 핵심 우려 2건: 의료기기 인증 비용, 온프레미스 요구 대응

## 의사결정 요청
**Go 결정** 승인 요청 — Commit Gate 4질문 전부 통과',
  'claude-sonnet-4-5-20250514',
  1800,
  4500,
  'completed',
  'demo-user-001',
  '2026-02-27T10:00:00'
);

-- HC-008: offering-pack (오퍼링 패키지)
INSERT OR IGNORE INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by, created_at)
VALUES (
  'bd-demo-art-hc-008',
  'demo-org-001',
  'bd-demo-bi-hc-001',
  'offering-pack',
  '2-10',
  1,
  'MediQA 오퍼링 패키지 구성',
  '# 오퍼링 패키지: MediQA — AI 의료기기 품질예측

## 패키지 구성 (4종)

### 1. 사업 제안서 (Executive Summary)
- MediQA 소개 + 핵심 가치 제안
- 시장 분석 + 경쟁 포지셔닝
- 도입 효과 (품질 비용 40% 절감, 불량률 30% 감소)
- 투자 대비 ROI 시뮬레이션
- 레퍼런스: ○○메디칼 PoC 결과 (94.2% 정확도)

### 2. 데모 환경
- URL: demo.mediqa.ai (샌드박스)
- 가상 센서 데이터 스트리밍 시연
- AI 예측 + XAI 설명 실시간 데모
- 대시보드 기능 체험 (알림, 트렌드, 리포트)

### 3. 기술 검토서 (Architecture Review)
- 시스템 아키텍처 다이어그램
- 데이터 파이프라인 상세 (MQTT → Kafka → TimescaleDB)
- AI 모델 구조 (CNN+LSTM 앙상블)
- 보안: 데이터 암호화 + 접근 제어 + 감사 로그
- 확장성: 수평 확장 (라인 추가 시 리니어 스케일)
- SLA: 99.5% 가용성, < 200ms 추론 지연

### 4. 가격 제안서
| 플랜 | 월 비용 | 포함 내용 |
|------|---------|-----------|
| **Standard** | 라인당 500만원 | 센서 연동 + AI 예측 + 대시보드 |
| **Professional** | 라인당 800만원 | Standard + XAI + 커스텀 리포트 |
| **Enterprise** | 별도 견적 | Professional + 온프레미스 + 전담 지원 |

- 연간 계약 시 10% 할인
- 파일럿: 1개 라인 3개월 무료 (PoC 검증)',
  'claude-sonnet-4-5-20250514',
  2200,
  5500,
  'completed',
  'demo-user-001',
  '2026-03-03T10:00:00'
);

-- === GIVC 산출물 (8건) ===

-- GV-001: market-research (시장조사)
INSERT OR IGNORE INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by, created_at)
VALUES (
  'bd-demo-art-gv-001',
  'demo-org-001',
  'bd-demo-bi-gv-001',
  'market-research',
  '2-1',
  1,
  '산업 공급망 인과관계 예측 플랫폼(chatGIVC) 시장 분석',
  '# 시장조사 보고서: 산업 공급망 인과관계 예측 플랫폼

## 1. 시장 규모

| 구분 | 규모 | 산출 근거 |
|------|------|-----------|
| **TAM** | **1.8조원** | 글로벌 공급망 리스크 관리 소프트웨어 시장 |
| **SAM** | **2,800억원** | 아태 지역 KG/AI 기반 공급망 분석 시장 |
| **SOM** | **280억원** | 한국 기계산업 공급망 분석 수요 |

## 2. 시장 동인

- 글로벌 공급망 불안정 (반도체 부족, 지정학 리스크, 팬데믹 영향)
- 한국 기계산업 수출 의존도 높음 (수출 비중 60%+)
- 공급망 실사법(EU CSDDD) 등 규제 대응 필요
- ESG + 공급망 투명성 요구 증가

## 3. 한국 기계산업 특화 기회

| 특성 | 기회 |
|------|------|
| 2,443개 품목 데이터 | GIVC 데이터 기반 온톨로지 **독점적 자산** |
| 원자재→완제품 체인 | 인과 추적으로 공급 리스크 **선제 대응** |
| 진흥회 파트너십 | 공공기관 납품 **진입 장벽** 형성 |
| 중소 제조사 니즈 | Excel 기반 수동 관리 **한계 도달** |

## 4. 진입 전략

- **Beachhead**: 한국 기계산업 중견 제조사 + 공공기관
- **확장**: 자동차 부품 → 전자 → 화학 산업으로 KG 확장
- **가격**: 기관당 연 1.2억원 (구독 + 컨설팅)
- **3년 목표**: 기관 20곳 확보, ARR 24억원',
  'claude-sonnet-4-5-20250514',
  2800,
  7000,
  'completed',
  'demo-user-001',
  '2026-02-08T10:00:00'
);

-- GV-002: competitor-analysis (경쟁분석)
INSERT OR IGNORE INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by, created_at)
VALUES (
  'bd-demo-art-gv-002',
  'demo-org-001',
  'bd-demo-bi-gv-001',
  'competitor-analysis',
  '2-3',
  1,
  '공급망 분석 도구 경쟁사 비교 분석',
  '# 경쟁분석: 공급망 인과관계 분석 솔루션

## 경쟁사 비교

| 기준 | **chatGIVC** | Resilinc | Everstream | Interos | 국내 C사 | 국내 D사 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| **인과 추적** | ★★★ | ★★ | ★★ | ★★ | ★ | ★ |
| **한국 산업 특화** | ★★★ | ☆ | ☆ | ☆ | ★★ | ★★ |
| **자연어 쿼리** | ★★★ | ★ | ★★ | ★ | ☆ | ☆ |
| **KG 기반** | ★★★ | ★ | ★★ | ★★ | ☆ | ☆ |
| **데이터 품질** | ★★★ | ★★★ | ★★★ | ★★ | ★ | ★★ |
| **가격** | ★★ | ★ | ★ | ★ | ★★★ | ★★★ |

## 핵심 차별점

1. **한국 기계산업 특화 KG**: 2,443개 품목 온톨로지 — 글로벌 경쟁사 없음
2. **chatGIVC 자연어 인터페이스**: "반도체 부족이 자동차 부품에 미치는 영향은?" 같은 질의
3. **인과 체인 시각화**: 원자재→1차→2차→완제품 영향 전파 시뮬레이션
4. **진흥회 공식 데이터**: 데이터 접근 독점 — 경쟁사 진입 장벽

## 위협 요인
- Resilinc/Everstream이 아태 시장 진출 시 브랜드 파워 우위
- 국내 ERP 벤더의 SCM 모듈 확장
- 대기업 자체 개발 가능성',
  'claude-sonnet-4-5-20250514',
  2500,
  6500,
  'completed',
  'demo-user-001',
  '2026-02-22T10:00:00'
);

-- GV-003: bmc-canvas (BMC)
INSERT OR IGNORE INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by, created_at)
VALUES (
  'bd-demo-art-gv-003',
  'demo-org-001',
  'bd-demo-bi-gv-001',
  'bmc-canvas',
  '2-4',
  1,
  'chatGIVC Business Model Canvas 작성',
  '# Business Model Canvas: chatGIVC — 공급망 인과관계 예측

## 9블록 캔버스

### 1. 가치 제안 (VP)
- KG 기반 산업 공급망 **인과관계 추적** + 리스크 예측
- chatGIVC **자연어 쿼리**로 비전문가도 분석 가능
- 원자재→완제품 **영향 전파 시뮬레이션**

### 2. 고객 세그먼트 (CS)
- **핵심**: 기계산업 중견 제조사 (부품/소재)
- **공공**: 산업통상자원부, 기계산업진흥회, 산업연구원
- **확장**: 자동차, 전자, 화학 산업 제조사

### 3. 채널 (CH)
- 진흥회 추천 + 공공 조달 (나라장터)
- 산업 컨퍼런스 + 세미나
- 학회 논문 + 기술 블로그

### 4. 고객 관계 (CR)
- 도입 컨설팅 (3개월 온보딩)
- 분기별 KG 업데이트 + 분석 리포트
- 연구 프로젝트 공동 수행

### 5. 수익원 (RS)
- **SaaS 구독**: 기관당 연 8,000만원
- **컨설팅**: 도입 + 맞춤 분석 연 4,000만원
- **합계**: 기관당 연 1.2억원

### 6. 핵심 자원 (KR)
- 2,443개 품목 온톨로지 + KG
- 진흥회 GIVC 데이터 접근권
- KG 전문가 2명 + NLP 엔지니어

### 7. 핵심 활동 (KA)
- KG 구축 + 유지보수 (분기별 업데이트)
- chatGIVC LLM 파인튜닝 + 추론
- 고객사 맞춤 분석 + 리포트

### 8. 핵심 파트너 (KP)
- 기계산업진흥회 (데이터 + 채널)
- 클라우드 (GPU 서버)
- 학계 (온톨로지 연구)

### 9. 비용 구조 (CS)
- 인건비: KG 전문가 + NLP 엔지니어 (55%)
- GPU 인프라: 모델 학습 + 추론 (25%)
- 데이터 관리: KG 업데이트 + 품질 관리 (10%)
- 영업/마케팅 (10%)',
  'claude-sonnet-4-5-20250514',
  2300,
  5800,
  'completed',
  'demo-user-001',
  '2026-02-28T10:00:00'
);

-- GV-004: feasibility-study (타당성 분석)
INSERT OR IGNORE INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by, created_at)
VALUES (
  'bd-demo-art-gv-004',
  'demo-org-001',
  'bd-demo-bi-gv-001',
  'feasibility-study',
  '2-5',
  1,
  'chatGIVC KG 기반 인과분석 기술/사업/재무 타당성 분석',
  '# 타당성 분석: chatGIVC — 공급망 인과관계 예측

## 1. 기술 타당성

| 항목 | 결과 | 근거 |
|------|------|------|
| 온톨로지 구축 | **2,443 품목 완료** | 진흥회 GIVC 데이터 기반 |
| KG 쿼리 성능 | **< 500ms** | Neo4j 기반, 3-hop 이내 |
| chatGIVC 정확도 | **82%** | GPT-4 파인튜닝 PoC |
| 인과 추적 | **2배 정확** | 범용 SCM 도구 대비 |

- **결론**: 핵심 기술 검증 완료, 정확도 개선 여지 있음

## 2. 사업 타당성

| 항목 | 결과 | 근거 |
|------|------|------|
| 시장 니즈 | **높음** | 공급망 불안정 + 실사법 규제 |
| 데이터 해자 | **강함** | 진흥회 독점 데이터 접근 |
| 경쟁 우위 | **니치 특화** | 한국 기계산업 KG는 유일 |
| 확장 가능성 | **중간** | 타 산업 확장 시 KG 재구축 필요 |

- **결론**: 니치 시장 특화 전략으로 유효

## 3. 재무 타당성

| 항목 | Year 1 | Year 2 | Year 3 |
|------|--------|--------|--------|
| 매출 | 3.6억 | 9.6억 | 24억 |
| 비용 | 6억 | 9억 | 14억 |
| 영업이익 | -2.4억 | 0.6억 | 10억 |

- **BEP**: 18개월
- **IRR**: 25%
- **초기 투자**: PoC 3개월 / 5천만원

## 4. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| KG 업데이트 비용 | 중 | 반자동화 파이프라인 구축 |
| 타 산업 확장 난이도 | 중 | 범용 온톨로지 프레임워크 설계 |
| GPU 비용 증가 | 저 | 모델 경량화 + 캐싱 |

## 5. 종합 판정: **Go** (니치 특화 + 데이터 해자)',
  'claude-sonnet-4-5-20250514',
  2700,
  7000,
  'completed',
  'demo-user-001',
  '2026-03-07T10:00:00'
);

-- GV-005: prd-draft (chatGIVC PRD 초안)
INSERT OR IGNORE INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by, created_at)
VALUES (
  'bd-demo-art-gv-005',
  'demo-org-001',
  'bd-demo-bi-gv-001',
  'prd-draft',
  '2-6',
  1,
  'chatGIVC PRD 초안 작성',
  '# PRD v1: chatGIVC — 산업 공급망 인과관계 예측 플랫폼

## 1. 제품 비전
한국 기계산업 2,443개 품목의 공급망 인과관계를 KG로 분석하고, 자연어 대화로 리스크를 예측하는 AI 플랫폼

## 2. 핵심 기능

| # | 기능 | 우선순위 | 설명 |
|---|------|----------|------|
| F1 | 인과 쿼리 엔진 | P0 | KG 기반 원자재→완제품 인과 체인 탐색 |
| F2 | chatGIVC 대화형 분석 | P0 | 자연어로 공급망 질의 + 분석 결과 응답 |
| F3 | 리스크 시각화 | P0 | 영향 전파 그래프 + 히트맵 + 타임라인 |
| F4 | 알림 시스템 | P1 | 공급 리스크 감지 시 자동 알림 |
| F5 | 리포트 생성 | P1 | 공급망 분석 보고서 자동 생성 |

## 3. 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | React + D3.js (그래프 시각화) |
| Backend | FastAPI + GraphQL |
| KG | Neo4j + RDF/OWL 온톨로지 |
| LLM | GPT-4 파인튜닝 (chatGIVC) |
| Infra | AWS EKS + Neptune (관리형 그래프DB) |

## 4. 데이터 파이프라인
```
진흥회 GIVC 원천 → ETL → 온톨로지 매핑 → Neo4j KG
                                              ↓
                                    chatGIVC (LLM + KG 쿼리)
                                              ↓
                                       사용자 대시보드
```

## 5. 성공 지표
- 인과 쿼리 정확도 ≥ 85%
- chatGIVC 응답 정확도 ≥ 80%
- 사용자 만족도 NPS ≥ 40
- 도입 기관 Year 1: 3곳, Year 2: 10곳',
  'claude-sonnet-4-5-20250514',
  2400,
  6000,
  'completed',
  'demo-user-001',
  '2026-03-15T10:00:00'
);

-- GV-006: cost-model (AI 인프라 비용 모델)
INSERT OR IGNORE INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by, created_at)
VALUES (
  'bd-demo-art-gv-006',
  'demo-org-001',
  'bd-demo-bi-gv-001',
  'cost-model',
  '2-2',
  1,
  'chatGIVC AI 인프라 비용 모델 분석',
  '# AI 인프라 비용 모델: chatGIVC

## 1. 월간 인프라 비용

| 항목 | 사양 | 월 비용 |
|------|------|---------|
| **GPU 서버** (추론) | A10G × 1 (g5.xlarge) | 80만원 |
| **GPU 서버** (학습) | A100 × 1 (p4d, on-demand) | 40만원 |
| **그래프DB** | Neptune db.r5.large | 45만원 |
| **앱 서버** | EKS t3.large × 2 | 20만원 |
| **스토리지** | S3 50GB + EBS 100GB | 5만원 |
| **네트워크** | Data Transfer + CloudFront | 10만원 |
| **합계** | | **200만원/월** |

## 2. 인건비 (월간)

| 역할 | 인원 | 월 비용 |
|------|------|---------|
| KG 전문가 | 1명 | 700만원 |
| NLP/LLM 엔지니어 | 1명 | 700만원 |
| 백엔드 개발자 | 1명 (공유) | 350만원 |
| **합계** | | **1,750만원/월** |

## 3. 연간 총 비용

| 항목 | 연간 |
|------|------|
| 인프라 | 2,400만원 |
| 인건비 | 2.1억원 |
| LLM API (GPT-4) | 1,200만원 |
| 기타 (데이터, 라이선스) | 600만원 |
| **합계** | **약 2.7억원** |

## 4. 비용 최적화 전략

- **Spot Instance**: 학습용 GPU 60% 절감 (40만→16만원)
- **모델 경량화**: GPT-4 → 파인튜닝 소형 모델 전환 시 API 비용 80% 절감
- **캐싱**: 빈도 높은 쿼리 캐싱으로 GPU 사용량 30% 절감
- **최적화 후**: 월 150만원 → 연 1,800만원 (25% 절감)

## 5. 손익분기 분석
- 기관당 연 매출: 1.2억원
- 기관당 변동비: 약 500만원 (인프라 배분)
- **BEP**: 3기관 확보 시 (연 3.6억 매출 > 2.7억 비용)',
  'claude-sonnet-4-5-20250514',
  2100,
  5400,
  'completed',
  'demo-user-001',
  '2026-02-15T10:00:00'
);

-- GV-007: regulation-scan (산업 안전 규제 스캔)
INSERT OR IGNORE INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by, created_at)
VALUES (
  'bd-demo-art-gv-007',
  'demo-org-001',
  'bd-demo-bi-gv-001',
  'regulation-scan',
  '2-2',
  1,
  'chatGIVC 관련 산업 안전 및 데이터 규제 검토',
  '# 규제 스캔: chatGIVC — 산업 공급망 분석 플랫폼

## 1. 관련 규제 개요

| 규제 | 관할 | 영향도 | 대응 상태 |
|------|------|--------|-----------|
| 산업안전보건법 | 고용노동부 | **높음** | 대응 필요 |
| 공급망 실사법 (EU CSDDD) | EU | **높음** | 대응 완료 |
| 데이터 3법 | 과기정통부/개인정보위 | **중간** | 대응 완료 |
| 산업기술보호법 | 산업부 | **중간** | 검토 중 |

## 2. 산업안전보건법

- **관련 조항**: 제15조(안전보건관리체계), 제36조(위험성평가)
- **영향**: 공급망 원자재의 안전성 정보 추적 시 활용 가능
- **기회**: 위험성평가 데이터와 연동하면 규제 대응 솔루션으로 확장
- **대응**: 안전보건 데이터 필드 추가, KOSHA 가이드 준수

## 3. EU 공급망 실사법 (CSDDD)

- **시행**: 2026년부터 대기업 의무화, 단계적 확대
- **영향**: 한국 수출 기업이 EU 거래처 요구로 공급망 투명성 필수
- **기회**: chatGIVC의 인과 추적이 실사 보고서 자동 생성에 직결
- **대응**: CSDDD 리포트 템플릿 기본 제공

## 4. 데이터 3법

- **개인정보보호법**: 공급망 데이터는 기업 데이터로 개인정보 해당 없음 (✅)
- **신용정보법**: 해당 없음 (✅)
- **정보통신망법**: API 서비스 시 보안 인증 (ISMS) 검토 필요
- **대응**: 기업 데이터만 처리, 개인정보 미수집 원칙 확립

## 5. 산업기술보호법

- **관련**: 국가핵심기술 지정 품목의 공급망 정보 보호
- **영향**: 일부 품목 데이터가 기술 유출 방지 대상일 수 있음
- **대응**: 민감 품목 분류 체계 + 접근 권한 관리 + 암호화

## 6. 종합 판정

**규제 리스크: 낮음~중간** — 기업 데이터 중심으로 개인정보 이슈 없음. EU CSDDD는 오히려 시장 확대 기회. 산업기술보호법 대응만 추가 검토 필요',
  'claude-sonnet-4-5-20250514',
  2300,
  5800,
  'completed',
  'demo-user-001',
  '2026-02-15T14:00:00'
);

-- GV-008: partner-map (파트너 에코시스템 맵)
INSERT OR IGNORE INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by, created_at)
VALUES (
  'bd-demo-art-gv-008',
  'demo-org-001',
  'bd-demo-bi-hc-001',
  'partner-map',
  '2-7',
  1,
  'MediQA 파트너 에코시스템 맵 작성',
  '# 파트너 에코시스템 맵: MediQA

## 1. 파트너 유형별 맵

### 데이터 파트너
| 파트너 | 역할 | 상태 |
|--------|------|------|
| ○○메디칼 | 파일럿 고객 + 센서 데이터 제공 | **계약 완료** |
| △△전자 의료기기 사업부 | 2차 파일럿 후보 | 접촉 중 |
| 식약처 데이터 포털 | 의료기기 품질 데이터 | 검토 중 |

### 기술 파트너
| 파트너 | 역할 | 상태 |
|--------|------|------|
| AWS | 클라우드 인프라 (EKS, S3, SageMaker) | **활성** |
| NVIDIA | GPU 최적화 + 모델 가속 | 파트너 프로그램 지원 |
| 센서 제조사 (Bosch, Honeywell) | OPC-UA/MQTT 연동 지원 | 기술 검토 |

### 채널 파트너
| 파트너 | 역할 | 상태 |
|--------|------|------|
| KIMES (의료기기 전시회) | 연간 전시 + 발표 | **2026년 참가 확정** |
| 의료기기산업협회 | 회원사 대상 세미나 | 접촉 중 |
| SI 파트너 (삼성SDS, LG CNS) | 대기업 납품 채널 | 검토 중 |

### 인증 파트너
| 파트너 | 역할 | 상태 |
|--------|------|------|
| 의료기기 인증 컨설팅사 | MDSAP, ISO 13485 대응 | 검토 중 |
| 보안 인증 (ISMS) | 정보보안 인증 | 2026 하반기 예정 |

## 2. 에코시스템 전략

```
[데이터 파트너] → 센서 데이터 + 도메인 지식
        ↓
    [MediQA 플랫폼]
        ↓
[기술 파트너] ← 인프라 + GPU + 연동
        ↓
[채널 파트너] → 고객 확보 + 레퍼런스
        ↓
[인증 파트너] → 규제 대응 + 신뢰 확보
```

## 3. 핵심 파트너십 KPI
- ○○메디칼 PoC 성공 → 레퍼런스 케이스 확보 (Q3 2026)
- KIMES 2026 전시 → 리드 20건 이상 확보
- AWS 파트너 프로그램 → 크레딧 + 공동 마케팅
- SI 파트너 1곳 확보 → 대기업 채널 오픈 (Q4 2026)',
  'claude-sonnet-4-5-20250514',
  2000,
  5200,
  'completed',
  'demo-user-001',
  '2026-02-17T10:00:00'
);

-- ============================================================
-- 섹션 12: bdp_versions (3건)
-- ============================================================

INSERT OR IGNORE INTO bdp_versions (id, org_id, biz_item_id, version_num, content, is_final, created_by, created_at)
VALUES (
  'bd-demo-bdp-hc-001',
  'demo-org-001',
  'bd-demo-bi-hc-001',
  1,
  '# BDP v1 초안 — AI 의료기기 품질예측 시스템 (MediQA)

## 사업 개요
의료기기 제조 공정에서 AI/ML 기반 실시간 품질 예측 SaaS 플랫폼. CNN+LSTM 모델로 불량을 사전 탐지하여 품질 검사 비용 40% 절감.

## 시장 기회
- TAM 2.3조원 / SAM 4,500억원 / SOM 450억원
- CAGR 15.2% (2025~2030)
- 국내 의료기기 제조사 AI 도입률 10% 미만

## 기술 검증
- PoC 정확도: 94.2% (CNN+LSTM 앙상블)
- 추론 지연: < 200ms
- XAI: SHAP 기반 설명 가능

## 재무 전망
- 초기 투자: 2억원 (6개월)
- BEP: 12개월 / IRR: 32%
- Year 3 매출: 36억원

## 실행 일정
- Phase 1~6: MVP 개발 6개월
- 파일럿: ○○메디칼 (Q3 2026)
- 정식 출시: Q4 2026',
  0,
  'demo-user-001',
  '2026-02-20T10:00:00'
);

INSERT OR IGNORE INTO bdp_versions (id, org_id, biz_item_id, version_num, content, is_final, created_by, created_at)
VALUES (
  'bd-demo-bdp-hc-002',
  'demo-org-001',
  'bd-demo-bi-hc-001',
  2,
  '# BDP v2 최종 — AI 의료기기 품질예측 시스템 (MediQA)

## O-G-D 검증 반영 (0.875 CONVERGED)
- 3 페르소나 평균: 기술 8.5 / 사업 8.0 / 고객 8.5
- 주요 피드백 반영: 온프레미스 배포 옵션 추가, 의료기기 인증 비용 예산 반영

## 사업 개요
의료기기 제조 공정에서 AI/ML 기반 실시간 품질 예측 SaaS 플랫폼. CNN+LSTM 모델로 불량을 사전 탐지하여 품질 검사 비용 40% 절감. 설명 가능한 AI(XAI)로 FDA/MDSAP 규제 대응.

## 시장 기회
- TAM 2.3조원 / SAM 4,500억원 / SOM 450억원 (CAGR 15.2%)
- 초기 타겟: 중형 의료기기 제조사 (CT/MRI 부품)
- 선점 전략: 도메인 특화 + XAI로 규제 대응 차별화

## 기술 검증 (업데이트)
- PoC 정확도: 94.2% → 목표 정확도: 90% 이상 유지
- XAI 규제 대응: SHAP 기반 → FDA 21 CFR Part 11 대응
- 온프레미스 옵션: 하이브리드 배포 아키텍처 추가

## 재무 전망 (수정)
- 초기 투자: 2.5억원 (인증 비용 추가)
- BEP: 14개월 (기존 12개월 + 인증 기간)
- IRR: 28% (기존 32% → 인증 비용 반영)
- Year 3 매출: 36억원 (변동 없음)

## Commit Gate 결과
4개 질문 전부 통과 → **Go 결정**

## 다음 단계
1. MVP 개발 착수 (2026-03)
2. ○○메디칼 파일럿 (2026-09)
3. 정식 출시 (2026-12)',
  1,
  'demo-user-001',
  '2026-02-25T10:00:00'
);

INSERT OR IGNORE INTO bdp_versions (id, org_id, biz_item_id, version_num, content, is_final, created_by, created_at)
VALUES (
  'bd-demo-bdp-gv-001',
  'demo-org-001',
  'bd-demo-bi-gv-001',
  1,
  '# BDP v1 초안 — chatGIVC 공급망 인과관계 예측

## 사업 개요
한국 기계산업 2,443개 품목의 공급망 인과관계를 KG로 분석하고, 자연어 대화(chatGIVC)로 리스크를 예측하는 AI 플랫폼.

## 시장 기회
- TAM 1.8조원 / SAM 2,800억원 / SOM 280억원
- 글로벌 공급망 불안정으로 수요 급증
- EU CSDDD 시행으로 공급망 투명성 의무화

## 기술 현황
- 2,443개 품목 온톨로지 구축 완료
- chatGIVC PoC 동작 확인 (정확도 82%)
- 인과 추적 정확도: 범용 SCM 대비 2배

## 재무 전망
- 초기 투자: 5천만원 (PoC 3개월)
- BEP: 18개월 / IRR: 25%
- Year 3 매출: 24억원

## O-G-D 검증: 0.89 CONVERGED
- Commit Gate 통과 — 탐색 계속 결정',
  0,
  'demo-user-001',
  '2026-03-15T10:00:00'
);

-- ============================================================
-- 섹션 13: offering_packs + offering_pack_items (1 + 4건)
-- ============================================================

INSERT OR IGNORE INTO offering_packs (id, biz_item_id, org_id, title, description, status, created_by, created_at, updated_at)
VALUES (
  'bd-demo-op-hc-001',
  'bd-demo-bi-hc-001',
  'demo-org-001',
  'AI 의료기기 품질예측 — 오퍼링 패키지',
  '○○메디칼 외 파일럿 고객 대상 사업 제안 패키지. 제안서/데모/기술검토/가격표 4종 포함',
  'approved',
  'demo-user-001',
  '2026-03-03T10:00:00',
  '2026-03-15T10:00:00'
);

INSERT OR IGNORE INTO offering_pack_items (id, pack_id, item_type, title, content, sort_order, created_at)
VALUES ('bd-demo-opi-hc-001', 'bd-demo-op-hc-001', 'proposal', '사업 제안서 (Executive Summary)', 'MediQA 소개, 핵심 가치 제안, 시장 분석, 도입 효과(불량률 30%↓, 비용 40%↓), ROI 시뮬레이션, ○○메디칼 PoC 레퍼런스', 1, '2026-03-03T10:00:00');
INSERT OR IGNORE INTO offering_pack_items (id, pack_id, item_type, title, content, sort_order, created_at)
VALUES ('bd-demo-opi-hc-002', 'bd-demo-op-hc-001', 'demo_link', '데모 환경 링크', 'demo.mediqa.ai — 가상 센서 데이터 스트리밍 + AI 예측 + XAI 설명 실시간 데모 + 대시보드 체험', 2, '2026-03-03T10:00:00');
INSERT OR IGNORE INTO offering_pack_items (id, pack_id, item_type, title, content, sort_order, created_at)
VALUES ('bd-demo-opi-hc-003', 'bd-demo-op-hc-001', 'tech_review', '기술 검토서 (Architecture Review)', '시스템 아키텍처, 데이터 파이프라인(MQTT→Kafka→TimescaleDB), AI 모델(CNN+LSTM), 보안(암호화+접근제어), SLA(99.5%)', 3, '2026-03-03T10:00:00');
INSERT OR IGNORE INTO offering_pack_items (id, pack_id, item_type, title, content, sort_order, created_at)
VALUES ('bd-demo-opi-hc-004', 'bd-demo-op-hc-001', 'pricing', '가격 제안서 (라인당 월 500만원)', 'Standard 500만원/Professional 800만원/Enterprise 별도. 연간 10% 할인. 파일럿 1라인 3개월 무료', 4, '2026-03-03T10:00:00');

-- ============================================================
-- 섹션 14: mvp_tracking (1건 — 헬스케어AI만)
-- ============================================================

INSERT OR IGNORE INTO mvp_tracking (id, biz_item_id, org_id, title, description, status, tech_stack, created_by, created_at, updated_at)
VALUES (
  'bd-demo-mvp-hc-001',
  'bd-demo-bi-hc-001',
  'demo-org-001',
  '의료기기 품질예측 MVP',
  'AI 기반 실시간 품질 예측 시스템 MVP. 센서 데이터 수집 → AI 예측 엔진 → 대시보드 3모듈 구성. ○○메디칼 CT 부품 제조라인 파일럿 적용 대상.',
  'released',
  'React, FastAPI, TensorFlow, PostgreSQL, TimescaleDB',
  'demo-user-001',
  '2026-03-15T10:00:00',
  '2026-03-25T10:00:00'
);
