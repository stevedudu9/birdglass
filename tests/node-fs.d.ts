// Minimal typing for the verification test's results file; the project ships without @types/node.
declare module 'node:fs' {
  export function writeFileSync(path: string, data: string): void;
}
