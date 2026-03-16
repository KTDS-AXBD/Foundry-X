import { describe, it, expect } from 'vitest';
import { parseSections, mergeMarkdown, mergeJson } from './merge-utils.js';

describe('parseSections', () => {
  it('parses markdown into sections by ## headings', () => {
    const md = '# Title\nIntro\n## Section A\nContent A\n## Section B\nContent B';
    const sections = parseSections(md);
    expect(sections.size).toBe(3);
    expect(sections.has('__preamble__')).toBe(true);
    expect(sections.has('Section A')).toBe(true);
    expect(sections.has('Section B')).toBe(true);
  });
});

describe('mergeMarkdown', () => {
  it('adds new sections from template without overwriting existing', () => {
    const existing = '## Existing\nMy custom content';
    const template = '## Existing\nTemplate content\n## New Section\nNew content';
    const result = mergeMarkdown(existing, template);
    expect(result).toContain('My custom content');
    expect(result).toContain('## New Section');
    expect(result).not.toContain('Template content');
  });

  it('is idempotent — second merge adds nothing', () => {
    const existing = '## A\nContent A\n## B\nContent B';
    const template = '## A\nTemplate A\n## B\nTemplate B';
    const first = mergeMarkdown(existing, template);
    const second = mergeMarkdown(first, template);
    expect(first).toBe(second);
  });
});

describe('mergeJson', () => {
  it('adds new keys without overwriting existing', () => {
    const existing = { a: 1, b: { c: 2 } };
    const template = { a: 99, b: { d: 3 }, e: 4 };
    const result = mergeJson(existing, template);
    expect(result.a).toBe(1);
    expect((result.b as Record<string, unknown>).c).toBe(2);
    expect((result.b as Record<string, unknown>).d).toBe(3);
    expect(result.e).toBe(4);
  });

  it('is idempotent', () => {
    const existing = { a: 1 };
    const template = { a: 2, b: 3 };
    const first = mergeJson(existing, template);
    const second = mergeJson(first, template);
    expect(first).toEqual(second);
  });
});
