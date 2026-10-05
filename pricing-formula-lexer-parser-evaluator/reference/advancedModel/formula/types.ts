// Shared types for the Advanced Model formula language (PS-11 / PS-12 / PS-13).
// Pipeline: source → lex → parse → validate → evaluate. No stage throws for user
// errors; each one returns Diagnostics that point back into the source text.

/** Half-open [start, end) offsets into the formula source. */
export interface Span {
  start: number;
  end: number;
}

export type DiagnosticCode =
  // lexer
  | 'UNEXPECTED_CHAR'
  | 'BAD_NUMBER'
  | 'EMPTY_VARIABLE'
  // parser
  | 'EMPTY_FORMULA'
  | 'EMPTY_STATEMENT'
  | 'EXPECTED_VALUE'
  | 'EXPECTED_THEN'
  | 'MISSING_ELSE'
  | 'UNBALANCED_PAREN'
  | 'UNEXPECTED_TOKEN'
  | 'MISPLACED_IF'
  | 'CHAINED_COMPARISON'
  // validator
  | 'UNKNOWN_VARIABLE'
  | 'MISSING_AT_PREFIX'
  | 'UNKNOWN_NAME'
  | 'CONDITION_EXPECTED'
  | 'NUMBER_EXPECTED'
  // evaluator
  | 'MISSING_VALUE'
  | 'OUT_OF_RANGE'
  | 'DIVISION_BY_ZERO'
  | 'NOT_FINITE'
  | 'CIRCULAR_SUB_MODEL'
  | 'SUB_MODEL_ERROR';

export interface Diagnostic extends Span {
  severity: 'error' | 'warning';
  code: DiagnosticCode;
  message: string;
}

/** PS-11 — a custom variable, referenced in the formula as `@NAME`. */
export interface FormulaVariable {
  name: string;
  min: number;
  max: number;
}

/**
 * A saved model referenced by name (`@NAME`) inside another formula. It evaluates
 * to its own summed total, reading the same input values by variable name and
 * enforcing its own min/max ranges.
 */
export interface FormulaSubModel {
  name: string;
  formula: string;
  variables: FormulaVariable[];
}

export type VariableIssueCode = 'INVALID_NAME' | 'DUPLICATE_NAME' | 'INVALID_NUMBER' | 'INVALID_RANGE' | 'UNUSED_VARIABLE';

/** A problem with a variable definition (PS-11), tied to its row rather than to formula text. */
export interface VariableIssue {
  index: number;
  field: 'name' | 'min' | 'max' | null;
  severity: 'error' | 'warning';
  code: VariableIssueCode;
  message: string;
}

export const error = (code: DiagnosticCode, message: string, span: Span): Diagnostic => ({
  severity: 'error',
  code,
  message,
  start: span.start,
  end: span.end,
});

export const hasErrors = (diagnostics: Diagnostic[]): boolean => diagnostics.some((d) => d.severity === 'error');

/** 1-based line/column of an offset, for "line 3, col 5" style messages. */
export const lineColumnOf = (source: string, offset: number): { line: number; column: number } => {
  const before = source.slice(0, offset);
  const line = before.split('\n').length;
  const column = offset - before.lastIndexOf('\n');
  return { line, column };
};
