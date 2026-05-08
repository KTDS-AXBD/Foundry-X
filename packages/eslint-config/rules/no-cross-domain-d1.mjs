// MSA 원칙: core/{domain}/ 파일에서 다른 도메인 소속 D1 테이블 직접 접근 차단
const DOMAIN_TABLE_PREFIXES = {
  discovery_: 'discovery',
  shaping_: 'shaping',
  offering_: 'offering',
  agent_: 'agent',
};

const AGENT_EXACT_TABLES = new Set(['agents']);

const EXEMPT_PATH_SEGMENTS = ['/db/migrations/', '/__tests__/', '/archive/'];

function isExemptPath(filename) {
  return EXEMPT_PATH_SEGMENTS.some((seg) => filename.includes(seg));
}

function getDomainFromFilePath(filepath) {
  const match = filepath.match(/\/core\/([^/]+)\//);
  return match ? match[1] : null;
}

function getTableDomain(tableName) {
  for (const [prefix, domain] of Object.entries(DOMAIN_TABLE_PREFIXES)) {
    if (tableName.startsWith(prefix)) return domain;
  }
  if (AGENT_EXACT_TABLES.has(tableName)) return 'agent';
  return null;
}

const SQL_DML_RE = /\b(?:SELECT|INSERT|DELETE|CREATE|DROP|ALTER)\b/i;
const SQL_TABLE_RE = /\b(?:FROM|INTO|UPDATE|JOIN)\s+(\w+)/gi;

function looksLikeSql(str) {
  return SQL_DML_RE.test(str) || /\bUPDATE\s+\w+\s+SET\b/i.test(str);
}

function extractTableNames(sql) {
  if (!looksLikeSql(sql)) return [];
  return [...sql.matchAll(SQL_TABLE_RE)].map((m) => m[1]);
}

export const noCrossDomainD1 = {
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

    function checkSql(node, sql) {
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
        checkSql(node, node.value);
      },
      TemplateLiteral(node) {
        const sql = node.quasis.map((q) => q.value.raw).join(' ');
        checkSql(node, sql);
      },
    };
  },
};
