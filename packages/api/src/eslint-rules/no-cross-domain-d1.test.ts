// C75 no-cross-domain-d1 ESLint 룰 단위 테스트 (TDD Red phase)
// ESLint v9+ RuleTester는 전역 describe/it을 감지하여 개별 테스트를 등록함 — run()을 describe() 안에서 직접 호출
import { RuleTester } from 'eslint';
import { describe } from 'vitest';
import { noCrossDomainD1 } from './no-cross-domain-d1.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const DISCOVERY_FILE = '/project/packages/api/src/core/discovery/services/foo.ts';
const SHAPING_FILE = '/project/packages/api/src/core/shaping/services/bar.ts';
const OFFERING_FILE = '/project/packages/api/src/core/offering/services/baz.ts';
const AGENT_FILE = '/project/packages/api/src/core/agent/services/qux.ts';

describe('C75 foundry-x-api/no-cross-domain-d1', () => {
  ruleTester.run('no-cross-domain-d1', noCrossDomainD1, {
    valid: [
      // 같은 도메인 테이블 접근 — 허용
      {
        code: 'db.prepare(`SELECT * FROM shaping_runs WHERE id = ?`);',
        filename: SHAPING_FILE,
      },
      {
        code: 'db.prepare(`SELECT * FROM discovery_pipeline_runs WHERE id = ?`);',
        filename: DISCOVERY_FILE,
      },
      {
        code: 'db.prepare(`INSERT INTO offering_versions (id) VALUES (?)`);',
        filename: OFFERING_FILE,
      },
      {
        code: 'db.prepare(`UPDATE agent_sessions SET status = ? WHERE id = ?`);',
        filename: AGENT_FILE,
      },
      // 레거시 공유 테이블(도메인 prefix 없음) — 모든 도메인 허용
      {
        code: 'db.prepare(`SELECT * FROM biz_items WHERE id = ?`);',
        filename: SHAPING_FILE,
      },
      {
        code: 'db.prepare(`SELECT * FROM ax_bmc_blocks WHERE id = ?`);',
        filename: DISCOVERY_FILE,
      },
      {
        code: 'db.prepare(`SELECT * FROM projects WHERE id = ?`);',
        filename: AGENT_FILE,
      },
      // core/ 경로 밖 파일 — 룰 미적용
      {
        code: 'db.prepare(`SELECT * FROM offering_versions WHERE id = ?`);',
        filename: '/project/packages/api/src/services/some-service.ts',
      },
      // 면제: migrations/ 경로 (db/migrations/ 하위의 .ts seed/helper 파일)
      {
        code: 'const sql = "SELECT * FROM shaping_runs WHERE id = ?";',
        filename: '/project/packages/api/src/db/migrations/seed.ts',
      },
      // 면제: __tests__/ 경로
      {
        code: 'db.prepare(`SELECT * FROM offering_versions WHERE id = ?`);',
        filename: '/project/packages/api/src/core/shaping/__tests__/service.test.ts',
      },
      // 면제: archive/ 경로
      {
        code: 'db.prepare(`SELECT * FROM discovery_pipeline_runs WHERE id = ?`);',
        filename: '/project/packages/api/src/core/offering/archive/old.ts',
      },
      // 일반 문자열 리터럴 — SQL DML 키워드 없으면 통과 (오탐 방지)
      {
        code: 'const msg = "hello from offering_versions table";',
        filename: SHAPING_FILE,
      },
      // SQL DML 키워드 없으면 FROM 절도 통과
      {
        code: 'const info = "data from offering_versions source";',
        filename: SHAPING_FILE,
      },
      // agents (agent 도메인 소속) — agent 파일에서 허용
      {
        code: 'db.prepare(`SELECT * FROM agents WHERE id = ?`);',
        filename: AGENT_FILE,
      },
    ],
    invalid: [
      // shaping → offering 테이블 접근 금지
      {
        code: 'db.prepare(`SELECT * FROM offering_prototypes WHERE id = ?`);',
        filename: SHAPING_FILE,
        errors: [{ messageId: 'noCrossDomainD1' }],
      },
      // shaping → discovery 테이블 접근 금지
      {
        code: 'db.prepare(`SELECT * FROM discovery_pipeline_runs WHERE id = ?`);',
        filename: SHAPING_FILE,
        errors: [{ messageId: 'noCrossDomainD1' }],
      },
      // offering → discovery 테이블 접근 금지
      {
        code: 'db.prepare(`SELECT * FROM discovery_pipeline_runs WHERE id = ?`);',
        filename: OFFERING_FILE,
        errors: [{ messageId: 'noCrossDomainD1' }],
      },
      // discovery → shaping 테이블 접근 금지
      {
        code: 'db.prepare(`SELECT * FROM shaping_runs WHERE id = ?`);',
        filename: DISCOVERY_FILE,
        errors: [{ messageId: 'noCrossDomainD1' }],
      },
      // agent → shaping 테이블 접근 금지
      {
        code: 'db.prepare(`SELECT * FROM shaping_six_hats WHERE id = ?`);',
        filename: AGENT_FILE,
        errors: [{ messageId: 'noCrossDomainD1' }],
      },
      // offering → agent 테이블 접근 금지
      {
        code: 'db.prepare(`SELECT * FROM agent_sessions WHERE id = ?`);',
        filename: OFFERING_FILE,
        errors: [{ messageId: 'noCrossDomainD1' }],
      },
      // 일반 string literal에서도 감지
      {
        code: 'const sql = "SELECT * FROM offering_versions WHERE id = ?";',
        filename: SHAPING_FILE,
        errors: [{ messageId: 'noCrossDomainD1' }],
      },
      // JOIN 절에서도 감지
      {
        code: 'db.prepare(`SELECT a.* FROM shaping_runs a JOIN offering_prototypes b ON a.id = b.shaping_id`);',
        filename: DISCOVERY_FILE,
        errors: [
          { messageId: 'noCrossDomainD1' }, // shaping_runs
          { messageId: 'noCrossDomainD1' }, // offering_prototypes
        ],
      },
      // agents — agent 도메인 소속, shaping 파일에서 금지
      {
        code: 'db.prepare(`SELECT * FROM agents WHERE domain = ?`);',
        filename: SHAPING_FILE,
        errors: [{ messageId: 'noCrossDomainD1' }],
      },
    ],
  });
});
