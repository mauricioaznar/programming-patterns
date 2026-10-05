import type { ArithmeticOperator, ComparisonOperator, Expr, Program, Statement } from './ast';
import { parse } from './parser';
import { referencedVariables, validateFormula } from './validate';
import { error } from './types';
import type { Diagnostic, DiagnosticCode, FormulaSubModel, FormulaVariable, Span } from './types';

/** Sample (PS-13) or real input values, keyed by variable name without the `@`. */
export type FormulaValues = Record<string, number | undefined>;

export interface StatementResult extends Span {
  value: number;
  /** Index of the IF/ELSE IF branch that matched, 'else', or null for a plain expression. */
  branch: number | 'else' | null;
}

export type EvaluationResult =
  | { ok: true; total: number; statements: StatementResult[] }
  | { ok: false; diagnostics: Diagnostic[] };

/** Internal control flow only: aborts the run, never escapes `evaluate`. */
class EvaluationError extends Error {
  constructor(readonly diagnostic: Diagnostic) {
    super(diagnostic.message);
  }
}

const formatNumber = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 10 });

/**
 * Runs a formula that has already passed parse + validate. Every statement is
 * evaluated and the results are summed; the per-statement breakdown shows which
 * IF branch matched. Values outside a variable's min/max are reported as
 * OUT_OF_RANGE and never clamped — callers decide what that means for them.
 *
 * `@NAME` resolves to a variable first, then to a sub-model, which evaluates to
 * its own total. `chain` holds the sub-models currently being evaluated, to
 * detect cycles.
 */
export const evaluate = (
  program: Program,
  variables: FormulaVariable[],
  values: FormulaValues,
  subModels: FormulaSubModel[] = [],
  chain: string[] = [],
): EvaluationResult => {
  const byName = new Map(variables.map((v) => [v.name, v]));
  const subModelsByName = new Map(subModels.map((m) => [m.name, m]));
  const inputErrors: Diagnostic[] = [];

  referencedVariables(program).forEach((span, name) => {
    // Sub-models check their own inputs when they run.
    if (!byName.has(name) && subModelsByName.has(name)) return;
    const value = values[name];
    const variable = byName.get(name);
    if (value === undefined || !Number.isFinite(value)) {
      inputErrors.push(error('MISSING_VALUE', `@${name} needs a value`, span));
    } else if (variable && (value < variable.min || value > variable.max)) {
      inputErrors.push(
        error(
          'OUT_OF_RANGE',
          `@${name} = ${formatNumber(value)} is outside its allowed range ${formatNumber(variable.min)} – ${formatNumber(variable.max)}`,
          span,
        ),
      );
    }
  });
  if (inputErrors.length) return { ok: false, diagnostics: inputErrors };

  const fail = (code: DiagnosticCode, message: string, span: Span): never => {
    throw new EvaluationError(error(code, message, span));
  };

  const subModelTotals = new Map<string, number>();

  /** A sub-model's total; its errors are reported at the reference to it in this formula. */
  const subModelTotal = (name: string, span: Span): number => {
    const cached = subModelTotals.get(name);
    if (cached !== undefined) return cached;
    if (chain.includes(name)) {
      fail('CIRCULAR_SUB_MODEL', `@${name} refers back to itself (${[...chain, name].map((n) => `@${n}`).join(' → ')})`, span);
    }
    const subModel = subModelsByName.get(name) as FormulaSubModel;
    const parsed = parse(subModel.formula);
    const [invalid] = [...parsed.diagnostics, ...validateFormula(parsed.program, subModel.variables, subModels)].filter(
      (d) => d.severity === 'error',
    );
    if (invalid) fail('SUB_MODEL_ERROR', `@${name}: ${invalid.message}`, span);

    const result = evaluate(parsed.program, subModel.variables, values, subModels, [...chain, name]);
    if (!result.ok) {
      const [cause] = result.diagnostics;
      // A cycle keeps its own code and full path all the way up.
      return cause.code === 'CIRCULAR_SUB_MODEL'
        ? fail(cause.code, cause.message, span)
        : fail('SUB_MODEL_ERROR', `@${name}: ${cause.message}`, span);
    }
    subModelTotals.set(name, result.total);
    return result.total;
  };

  const finite = (value: number, span: Span) =>
    Number.isFinite(value) ? value : fail('NOT_FINITE', 'This calculation does not produce a finite number', span);

  const arithmetic = (operator: ArithmeticOperator, left: number, right: number, span: Span): number => {
    switch (operator) {
      case '+':
        return finite(left + right, span);
      case '-':
        return finite(left - right, span);
      case '*':
        return finite(left * right, span);
      case '/':
        return right === 0 ? fail('DIVISION_BY_ZERO', 'Division by zero', span) : finite(left / right, span);
      case '^':
        return finite(left ** right, span);
    }
  };

  const compare = (operator: ComparisonOperator, left: number, right: number): boolean => {
    switch (operator) {
      case '<':
        return left < right;
      case '<=':
        return left <= right;
      case '>':
        return left > right;
      case '>=':
        return left >= right;
      case '=':
        return left === right;
      case '!=':
        return left !== right;
    }
  };

  const number = (expr: Expr): number => {
    switch (expr.kind) {
      case 'Number':
        return expr.value;
      case 'Variable':
        return byName.has(expr.name) ? (values[expr.name] as number) : subModelTotal(expr.name, expr);
      case 'Negate':
        return -number(expr.operand);
      case 'Arithmetic':
        return arithmetic(expr.operator, number(expr.left), number(expr.right), expr);
      default:
        // The validator rejects identifiers and conditions in a number position.
        throw new Error(`evaluate: unvalidated ${expr.kind} used as a number`);
    }
  };

  const condition = (expr: Expr): boolean => {
    switch (expr.kind) {
      case 'Comparison':
        return compare(expr.operator, number(expr.left), number(expr.right));
      case 'Logical':
        // Short-circuits, so a division by zero in an unreachable operand is not an error.
        return expr.operator === 'AND'
          ? condition(expr.left) && condition(expr.right)
          : condition(expr.left) || condition(expr.right);
      default:
        throw new Error(`evaluate: unvalidated ${expr.kind} used as a condition`);
    }
  };

  const run = (statement: Statement): StatementResult => {
    const span = { start: statement.start, end: statement.end };
    if (statement.kind === 'Expression') return { ...span, value: number(statement.expression), branch: null };
    const matched = statement.branches.findIndex((b) => condition(b.condition));
    return matched >= 0
      ? { ...span, value: number(statement.branches[matched].value), branch: matched }
      : { ...span, value: number(statement.otherwise), branch: 'else' };
  };

  try {
    const statements = program.statements.map(run);
    const total = finite(statements.reduce((sum, s) => sum + s.value, 0), program);
    return { ok: true, total, statements };
  } catch (e) {
    if (e instanceof EvaluationError) return { ok: false, diagnostics: [e.diagnostic] };
    throw e;
  }
};
