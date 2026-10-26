/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function getFilesRecursively(dir: string, fileList: string[] = []): string[] {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (item !== '__tests__') {
        getFilesRecursively(fullPath, fileList);
      }
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe('Privacy Audit: Zero Leaks in src/ Codebase', () => {
  it('confirms no console.log, localStorage, sessionStorage, fetch, or XMLHttpRequest exist in src/ (excluding tests)', () => {
    const srcDir = path.resolve(__dirname, '..');
    const sourceFiles = getFilesRecursively(srcDir);

    expect(sourceFiles.length).toBeGreaterThan(0);

    const violations: { file: string; rule: string; match: string }[] = [];

    const checks = [
      { name: 'console.log', pattern: /\bconsole\.log\b/ },
      { name: 'localStorage', pattern: /\blocalStorage\b/ },
      { name: 'sessionStorage', pattern: /\bsessionStorage\b/ },
      { name: 'fetch', pattern: /\bfetch\s*\(/ },
      { name: 'XMLHttpRequest', pattern: /\bXMLHttpRequest\b/ },
    ];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const check of checks) {
        if (check.pattern.test(content)) {
          violations.push({
            file: path.relative(srcDir, filePath),
            rule: check.name,
            match: check.name,
          });
        }
      }
    }

    expect(
      violations,
      `Privacy violation detected! Found forbidden calls in production source files: ${JSON.stringify(
        violations,
        null,
        2
      )}`
    ).toEqual([]);
  });
});
