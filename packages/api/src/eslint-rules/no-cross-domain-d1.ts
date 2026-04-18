// MSA 원칙: core/{domain}/ 파일에서 다른 도메인 소속 D1 테이블 직접 접근 차단
// 도메인 소속 판정: 테이블명 prefix 기준 (discovery_* / shaping_* / offering_* / agent_*)
// 면제: db/migrations/, __tests__/, archive/
import type { Rule } from 'eslint';

// 도메인별 테이블명 prefix (이 prefix로 시작하는 테이블은 해당 도메인 소속)
const DOMAIN_TABLE_PREFIXES: Record<string, string> = {
  discovery_: 'discovery',
  shaping_: 'shaping',
  offering_: 'offering',
  agent_: 'agent',
};

// 정확한 이름으로 도메인 소속이 확정되는 테이블 (prefix 규칙으로 미포함)
const AGENT_EXACT_TABLES = new Set(['agents']);

const EXEMPT_PATH_SEGMENTS = ['/db/migrations/', '/__tests__/', '/archive/'];

function isExemptPath(filename: string): boolean {
  return EXEMPT_PATH_SEGMENTS.some((seg) => filename.includes(seg));
}

function getDomainFromFilePath(filepath: string): string | null {
  const match = filepath.match(/\/core\/([^/]+)\//);
  return match?.[1] ?? null;
}

function getTableDomain(tableName: string): string | null {
  for (const [prefix, domain] of Object.entries(DOMAIN_TABLE_PREFIXES)) {
    if (tableName.startsWith(prefix)) return domain;
  }
  if (AGENT_EXACT_TABLES.has(tableName)) return 'agent';
  return null; // 도메인 prefix 없는 레거시/공유 테이블
}

// 문자열이 SQL 쿼리인지 판단하는 최소 휴리스틱 (오탐 방지)
const SQL_DML_RE = /\b(?:SELECT|INSERT|DELETE|CREATE|DROP|ALTER)\b/i;
const SQL_TABLE_RE = /\b(?:FROM|INTO|UPDATE|JOIN)\s+(\w+)/gi;

function looksLikeSql(str: string): boolean {
  return SQL_DML_RE.test(str) || /\bUPDATE\s+\w+\s+SET\b/i.test(str);
}

function extractTableNames(sql: string): string[] {
  if (!looksLikeSql(sql)) return [];
  return [...sql.matchAll(SQL_TABLE_RE)].map((m) => m[1]).filter((t): t is string => t !== undefined);
}

export const noCrossDomainD1: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow cross-domain D1 table access in MSA core domains. Each domain may only access tables with its own prefix (discovery_*, shaping_*, offering_*, agent_*).',
    },
    messages: {
      noCrossDomainD1:
        'Domain "{{currentDomain}}" cannot access table "{{table}}" which belongs to domain "{{tableDomain}}". Access only {{currentDomain}}_* tables or shared (unprefixed) tables.',
    },
    schema: [],
  },
  create(context) {
    if (isExemptPath(context.filename)) return {};

    const currentDomain = getDomainFromFilePath(context.filename);
    if (!currentDomain) return {};

    function checkSql(node: Rule.Node, sql: string): void {
      for (const table of extractTableNames(sql)) {
        const tableDomain = getTableDomain(table);
        if (tableDomain && tableDomain !== currentDomain) {
          context.report({
            node,
            messageId: 'noCrossDomainD1',
            data: { currentDomain, table, tableDomain },
          });
        }
      }
    }

    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        checkSql(node as unknown as Rule.Node, node.value);
      },
      TemplateLiteral(node) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ESLint AST TemplateLiteral quasis
        const quasis = (node as any).quasis as Array<{ value: { raw: string } }>;
        const sql = quasis.map((q) => q.value.raw).join(' ');
        checkSql(node as unknown as Rule.Node, sql);
      },
    };
  },
};
