/**
 * Markdown/JSON merge utilities for harness generation.
 * Preserves existing content — only adds new sections/keys.
 */

/** Markdown를 ## 헤딩 기준으로 섹션 분리 */
export function parseSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = markdown.split('\n');

  let currentHeading: string | null = null;
  let currentContent: string[] = [];

  // Content before first ## heading
  const preambleLines: string[] = [];
  let foundFirstHeading = false;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (!foundFirstHeading && preambleLines.length > 0) {
        const preamble = preambleLines.join('\n').trim();
        if (preamble) sections.set('__preamble__', preamble);
      }
      foundFirstHeading = true;

      // Save previous section
      if (currentHeading !== null) {
        sections.set(currentHeading, currentContent.join('\n'));
      }

      currentHeading = line.replace('## ', '').trim();
      currentContent = [line];
    } else if (!foundFirstHeading) {
      preambleLines.push(line);
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentHeading !== null) {
    sections.set(currentHeading, currentContent.join('\n'));
  }

  // Handle no-heading documents
  if (!foundFirstHeading) {
    const content = lines.join('\n').trim();
    if (content) sections.set('__preamble__', content);
  }

  return sections;
}

/** 기존 Markdown에 템플릿의 신규 섹션만 추가 (기존 보존) */
export function mergeMarkdown(existing: string, template: string): string {
  const existingSections = parseSections(existing);
  const templateSections = parseSections(template);

  const newSections: string[] = [];

  for (const [heading, content] of templateSections) {
    if (heading === '__preamble__') continue;
    if (!existingSections.has(heading)) {
      newSections.push(content);
    }
  }

  if (newSections.length === 0) return existing;

  const trimmed = existing.trimEnd();
  return trimmed + '\n\n' + newSections.join('\n\n') + '\n';
}

/** JSON deep merge (기존 키 보존, 신규 키만 추가) */
export function mergeJson(
  existing: Record<string, unknown>,
  template: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...existing };

  for (const [key, templateValue] of Object.entries(template)) {
    if (!(key in result)) {
      result[key] = templateValue;
      continue;
    }

    const existingValue = result[key];

    // Recurse into nested objects (non-array, non-null)
    if (
      isPlainObject(existingValue) &&
      isPlainObject(templateValue)
    ) {
      result[key] = mergeJson(
        existingValue as Record<string, unknown>,
        templateValue as Record<string, unknown>,
      );
    }
    // Existing key preserved — no overwrite
  }

  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
