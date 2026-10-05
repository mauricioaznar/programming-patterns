import { error } from './types';
import type { Diagnostic, Span } from './types';

export type Keyword = 'IF' | 'THEN' | 'ELSE' | 'AND' | 'OR';

export type Operator = '+' | '-' | '*' | '/' | '^' | '<' | '<=' | '>' | '>=' | '=' | '!=';

export type Token =
  | (Span & { kind: 'number'; value: number })
  /** `@NAME`, uppercased so references are case-insensitive. */
  | (Span & { kind: 'variable'; name: string })
  /** A bare word that isn't a keyword — usually a variable missing its `@`. */
  | (Span & { kind: 'identifier'; name: string })
  | (Span & { kind: 'keyword'; keyword: Keyword })
  | (Span & { kind: 'operator'; operator: Operator })
  | (Span & { kind: '(' | ')' | ',' | 'eof' });

const KEYWORDS: readonly Keyword[] = ['IF', 'THEN', 'ELSE', 'AND', 'OR'];

// Longest match first so `<=` wins over `<`. `<>` is an alias for `!=` (the
// reference palette inserts it).
const OPERATORS: ReadonlyArray<[string, Operator]> = [
  ['<=', '<='],
  ['>=', '>='],
  ['!=', '!='],
  ['<>', '!='],
  ['<', '<'],
  ['>', '>'],
  ['=', '='],
  ['+', '+'],
  ['-', '-'],
  ['*', '*'],
  ['/', '/'],
  ['^', '^'],
];

/** The operator starting at `i`, if any (longest match wins). */
const operatorAt = (source: string, i: number) => OPERATORS.find(([text]) => source.startsWith(text, i));

const isDigit = (ch: string) => ch >= '0' && ch <= '9';
const isWordChar = (ch: string) => /[A-Za-z0-9_]/.test(ch);

export interface LexResult {
  tokens: Token[];
  diagnostics: Diagnostic[];
}

/** Turns formula source into tokens. Bad input becomes a diagnostic and is skipped. */
export const lex = (source: string): LexResult => {
  const tokens: Token[] = [];
  const diagnostics: Diagnostic[] = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];
    const start = i;

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (isDigit(ch)) {
      while (isDigit(source[i] ?? '')) i++;
      if (source[i] === '.' && isDigit(source[i + 1] ?? '')) {
        i++;
        while (isDigit(source[i] ?? '')) i++;
      }
      // Anything number-like glued on (`1.2.3`, `5.`) makes the whole run bad.
      if (source[i] === '.') {
        while (source[i] === '.' || isDigit(source[i] ?? '')) i++;
        diagnostics.push(error('BAD_NUMBER', `"${source.slice(start, i)}" is not a valid number`, { start, end: i }));
        continue;
      }
      tokens.push({ kind: 'number', value: Number(source.slice(start, i)), start, end: i });
      continue;
    }

    if (ch === '@') {
      i++;
      while (isWordChar(source[i] ?? '')) i++;
      const name = source.slice(start + 1, i).toUpperCase();
      if (!name) {
        diagnostics.push(error('EMPTY_VARIABLE', '"@" must be followed by a variable name', { start, end: i }));
        continue;
      }
      tokens.push({ kind: 'variable', name, start, end: i });
      continue;
    }

    if (isWordChar(ch)) {
      while (isWordChar(source[i] ?? '')) i++;
      const word = source.slice(start, i);
      const keyword = KEYWORDS.find((k) => k === word.toUpperCase());
      tokens.push(
        keyword
          ? { kind: 'keyword', keyword, start, end: i }
          : { kind: 'identifier', name: word.toUpperCase(), start, end: i },
      );
      continue;
    }

    if (ch === '(' || ch === ')' || ch === ',') {
      i++;
      tokens.push({ kind: ch, start, end: i });
      continue;
    }

    const op = operatorAt(source, i);
    if (op) {
      i += op[0].length;
      tokens.push({ kind: 'operator', operator: op[1], start, end: i });
      continue;
    }

    i++;
    diagnostics.push(error('UNEXPECTED_CHAR', `Unexpected character "${ch}"`, { start, end: i }));
  }

  tokens.push({ kind: 'eof', start: source.length, end: source.length });
  return { tokens, diagnostics };
};
