// Advanced Model formula language (PS-11 / PS-12; evaluation backs PS-13).
// A tiny interpreted language — never `eval`/`new Function`:
//   source → lex → parse → validate → evaluate
import { parse } from './parser';
import { evaluate } from './evaluate';
import type { EvaluationResult, FormulaValues } from './evaluate';
import { validateFormula, validateVariables } from './validate';
import type { Program } from './ast';
import { hasErrors } from './types';
import type { Diagnostic, FormulaSubModel, FormulaVariable, VariableIssue } from './types';

export interface ModelAnalysis {
  program: Program;
  /** Syntax + semantic problems in the formula text, in source order. */
  diagnostics: Diagnostic[];
  /** Problems with the variable definitions, per row. */
  variableIssues: VariableIssue[];
  /** Every `@NAME` the formula mentions (variables and sub-models). */
  referenced: Set<string>;
  /** True when nothing blocks saving or running the model (warnings are allowed). */
  ok: boolean;
}

const bySource = (a: Diagnostic, b: Diagnostic) => a.start - b.start;

/** Everything the editor needs to show: formula diagnostics plus variable issues. */
export const analyzeModel = (
  source: string,
  variables: FormulaVariable[],
  subModels: FormulaSubModel[] = [],
): ModelAnalysis => {
  const parsed = parse(source);
  const diagnostics = [...parsed.diagnostics, ...validateFormula(parsed.program, variables, subModels)].sort(bySource);
  // Usage comes from tokens, not the AST, so a statement with a syntax error
  // doesn't make its variables look unused.
  const referenced = new Set(parsed.tokens.flatMap((t) => (t.kind === 'variable' ? [t.name] : [])));
  // A referenced sub-model uses its own variables, so they aren't "unused" here.
  const used = new Set(referenced);
  subModels.filter((m) => referenced.has(m.name)).forEach((m) => m.variables.forEach((v) => used.add(v.name)));
  const variableIssues = validateVariables(variables, used);
  return {
    program: parsed.program,
    diagnostics,
    variableIssues,
    referenced,
    ok: !hasErrors(diagnostics) && !variableIssues.some((i) => i.severity === 'error'),
  };
};

/**
 * Parses, validates and, if the formula has no errors, evaluates it against the
 * given values. Variable-definition issues are the editor's concern (see
 * `analyzeModel`); they don't block a run.
 */
export const runModel = (
  source: string,
  variables: FormulaVariable[],
  values: FormulaValues,
  subModels: FormulaSubModel[] = [],
): EvaluationResult => {
  const parsed = parse(source);
  const errors = [...parsed.diagnostics, ...validateFormula(parsed.program, variables, subModels)].filter(
    (d) => d.severity === 'error',
  );
  if (errors.length) return { ok: false, diagnostics: errors.sort(bySource) };
  return evaluate(parsed.program, variables, values, subModels);
};

export { lineColumnOf } from './types';
export type { Diagnostic, DiagnosticCode, FormulaSubModel, FormulaVariable, VariableIssue } from './types';
export type { EvaluationResult, FormulaValues, StatementResult } from './evaluate';
