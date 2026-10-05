import type { Span } from './types';

// One expression tree covers both arithmetic and conditions; the validator's
// type check decides which is allowed where (a condition after IF, a number
// everywhere else). This avoids backtracking on "(": `(@A > 1)` and `(@A + 1)`
// parse the same way.

export type ArithmeticOperator = '+' | '-' | '*' | '/' | '^';
export type ComparisonOperator = '<' | '<=' | '>' | '>=' | '=' | '!=';
export type LogicalOperator = 'AND' | 'OR';

export type Expr =
  | (Span & { kind: 'Number'; value: number })
  | (Span & { kind: 'Variable'; name: string })
  /** Bare word without `@`; always rejected by the validator with a helpful message. */
  | (Span & { kind: 'Identifier'; name: string })
  | (Span & { kind: 'Negate'; operand: Expr })
  | (Span & { kind: 'Arithmetic'; operator: ArithmeticOperator; left: Expr; right: Expr })
  | (Span & { kind: 'Comparison'; operator: ComparisonOperator; left: Expr; right: Expr })
  | (Span & { kind: 'Logical'; operator: LogicalOperator; left: Expr; right: Expr });

export interface IfBranch {
  condition: Expr;
  value: Expr;
}

/** `IF c1 THEN v1 ELSE IF c2 THEN v2 … ELSE otherwise` */
export type Statement =
  | (Span & { kind: 'If'; branches: IfBranch[]; otherwise: Expr })
  | (Span & { kind: 'Expression'; expression: Expr });

/** Comma-separated statements; every statement is evaluated and the results are summed. */
export interface Program extends Span {
  statements: Statement[];
}
