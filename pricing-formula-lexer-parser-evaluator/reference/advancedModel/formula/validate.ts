import type { Expr, Program } from './ast';
import { error } from './types';
import type { Diagnostic, FormulaSubModel, FormulaVariable, Span, VariableIssue } from './types';

export const VARIABLE_NAME_PATTERN = /^[A-Z_][A-Z0-9_]*$/;

type ValueType = 'number' | 'condition';

const levenshtein = (a: string, b: string): number => {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return row[b.length];
};

/** Closest defined name for a typo: small edit distance, or one name is a prefix of the other. */
const suggest = (name: string, known: string[]): string | undefined =>
  known
    .map((candidate) => ({ candidate, distance: levenshtein(name, candidate) }))
    .filter(({ candidate, distance }) => distance <= 2 || candidate.startsWith(name) || name.startsWith(candidate))
    .sort((a, b) => a.distance - b.distance)[0]?.candidate;

/**
 * Semantic checks on a parsed formula: every `@NAME` must be a defined variable
 * or an attached sub-model, bare words are rejected (with "did you mean @X?"),
 * and conditions/numbers are type-checked — IF needs a comparison, everything
 * else must be an amount.
 */
export const validateFormula = (
  program: Program,
  variables: FormulaVariable[],
  subModels: FormulaSubModel[] = [],
): Diagnostic[] => {
  const known = [...variables.map((v) => v.name), ...subModels.map((m) => m.name)];
  const diagnostics: Diagnostic[] = [];

  /** Reports a mismatch between the type an expression has and the one its position needs. */
  const check = (actual: ValueType, wanted: ValueType, expr: Expr, message?: string) => {
    if (actual === wanted) return;
    diagnostics.push(
      wanted === 'condition'
        ? error('CONDITION_EXPECTED', message ?? 'Expected a comparison here, e.g. @X > 0', expr)
        : error('NUMBER_EXPECTED', message ?? 'A comparison can\'t be used as an amount here', expr),
    );
  };

  /** Infers an expression's type, reporting problems in its sub-expressions along the way. */
  const typeOf = (expr: Expr): ValueType => {
    switch (expr.kind) {
      case 'Number':
        return 'number';
      case 'Variable': {
        if (!known.includes(expr.name)) {
          const hint = suggest(expr.name, known);
          diagnostics.push(
            error('UNKNOWN_VARIABLE', `Unknown variable @${expr.name}${hint ? ` — did you mean @${hint}?` : ''}`, expr),
          );
        }
        return 'number';
      }
      case 'Identifier':
        diagnostics.push(
          known.includes(expr.name)
            ? error('MISSING_AT_PREFIX', `Did you mean @${expr.name}? Variables start with "@"`, expr)
            : error('UNKNOWN_NAME', `Unknown name "${expr.name}" — variables are written with "@", e.g. @${expr.name}`, expr),
        );
        return 'number';
      case 'Negate':
        check(typeOf(expr.operand), 'number', expr.operand);
        return 'number';
      case 'Arithmetic':
      case 'Comparison':
        check(typeOf(expr.left), 'number', expr.left);
        check(typeOf(expr.right), 'number', expr.right);
        return expr.kind === 'Arithmetic' ? 'number' : 'condition';
      case 'Logical':
        check(typeOf(expr.left), 'condition', expr.left);
        check(typeOf(expr.right), 'condition', expr.right);
        return 'condition';
    }
  };

  for (const statement of program.statements) {
    if (statement.kind === 'If') {
      statement.branches.forEach(({ condition, value }) => {
        check(typeOf(condition), 'condition', condition);
        check(typeOf(value), 'number', value);
      });
      check(typeOf(statement.otherwise), 'number', statement.otherwise);
    } else {
      check(
        typeOf(statement.expression),
        'number',
        statement.expression,
        'Each statement must produce an amount, not a true/false comparison — did you mean IF … THEN … ELSE?',
      );
    }
  }

  return diagnostics.sort((a, b) => a.start - b.start);
};

/**
 * PS-11 — checks the variable definitions themselves: `@`-safe uppercase names,
 * no duplicates, numeric min ≤ max. `referenced` (names used in the formula) adds
 * an "unused" warning per variable, like the reference's pill tag.
 */
export const validateVariables = (variables: FormulaVariable[], referenced?: Set<string>): VariableIssue[] => {
  const issues: VariableIssue[] = [];
  const seen = new Set<string>();

  variables.forEach(({ name, min, max }, index) => {
    if (!name) {
      issues.push({ index, field: 'name', severity: 'error', code: 'INVALID_NAME', message: 'Variable needs a name' });
    } else if (!VARIABLE_NAME_PATTERN.test(name)) {
      issues.push({
        index,
        field: 'name',
        severity: 'error',
        code: 'INVALID_NAME',
        message: 'Use uppercase letters, digits and "_", not starting with a digit',
      });
    } else if (seen.has(name)) {
      issues.push({ index, field: 'name', severity: 'error', code: 'DUPLICATE_NAME', message: `@${name} is already defined` });
    }
    seen.add(name);

    if (!Number.isFinite(min)) {
      issues.push({ index, field: 'min', severity: 'error', code: 'INVALID_NUMBER', message: 'Min must be a number' });
    }
    if (!Number.isFinite(max)) {
      issues.push({ index, field: 'max', severity: 'error', code: 'INVALID_NUMBER', message: 'Max must be a number' });
    }
    if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
      issues.push({ index, field: 'max', severity: 'error', code: 'INVALID_RANGE', message: 'Max must be at least min' });
    }

    if (referenced && name && !referenced.has(name)) {
      issues.push({
        index,
        field: null,
        severity: 'warning',
        code: 'UNUSED_VARIABLE',
        message: `@${name} is not used in the formula`,
      });
    }
  });

  return issues;
};

/** First source span of every `@NAME` the program references. */
export const referencedVariables = (program: Program): Map<string, Span> => {
  const found = new Map<string, Span>();
  const visit = (expr: Expr): void => {
    switch (expr.kind) {
      case 'Variable':
        if (!found.has(expr.name)) found.set(expr.name, expr);
        return;
      case 'Negate':
        return visit(expr.operand);
      case 'Arithmetic':
      case 'Comparison':
      case 'Logical':
        visit(expr.left);
        return visit(expr.right);
      default:
        return;
    }
  };
  for (const statement of program.statements) {
    if (statement.kind === 'If') {
      statement.branches.forEach(({ condition, value }) => {
        visit(condition);
        visit(value);
      });
      visit(statement.otherwise);
    } else {
      visit(statement.expression);
    }
  }
  return found;
};
