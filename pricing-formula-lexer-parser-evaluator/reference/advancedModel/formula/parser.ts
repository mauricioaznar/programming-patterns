import { lex } from './lexer';
import type { Keyword, Operator, Token } from './lexer';
import type { ComparisonOperator, Expr, IfBranch, Program, Statement } from './ast';
import { error } from './types';
import type { Diagnostic, DiagnosticCode, Span } from './types';

// Hand-written recursive descent: one method per grammar rule, lowest
// precedence first.
//
//   program        := statement (',' statement)* ','?
//   statement      := IF expr THEN expr (ELSE IF expr THEN expr)* ELSE expr | expr
//   expr           := and (OR and)*
//   and            := comparison (AND comparison)*
//   comparison     := additive (('<' | '<=' | '>' | '>=' | '=' | '!=') additive)?
//   additive       := multiplicative (('+' | '-') multiplicative)*
//   multiplicative := unary (('*' | '/') unary)*
//   unary          := '-' unary | power
//   power          := primary ('^' unary)?
//   primary        := NUMBER | VARIABLE | IDENTIFIER | '(' expr ')'
//
// Conditions and numbers share one grammar; the validator type-checks which one
// is allowed where.

export interface ParseResult {
  program: Program;
  tokens: Token[];
  /** Lexer + parser diagnostics, in source order. */
  diagnostics: Diagnostic[];
}

/** Internal control flow only: aborts the current statement, never escapes `parse`. */
class ParseError extends Error {
  constructor(readonly diagnostic: Diagnostic) {
    super(diagnostic.message);
  }
}

const COMPARISON_OPERATORS: readonly Operator[] = ['<', '<=', '>', '>=', '=', '!='];

const spanOf = (from: Span, to: Span): Span => ({ start: from.start, end: to.end });

class Parser {
  private pos = 0;

  constructor(private readonly source: string, private readonly tokens: Token[]) {}

  /** Parses every statement, recovering at the next comma after an error. */
  parseProgram(diagnostics: Diagnostic[]): Statement[] {
    const statements: Statement[] = [];
    if (this.peek().kind === 'eof' && diagnostics.length === 0) {
      diagnostics.push(error('EMPTY_FORMULA', 'The formula is empty', { start: 0, end: 0 }));
    }
    while (this.peek().kind !== 'eof') {
      if (this.peek().kind === ',') {
        diagnostics.push(error('EMPTY_STATEMENT', 'Empty statement between commas', this.peek()));
        this.advance();
        continue;
      }
      try {
        const statement = this.statement();
        statements.push(statement);
        this.expectStatementEnd(statement);
      } catch (e) {
        if (!(e instanceof ParseError)) throw e;
        diagnostics.push(e.diagnostic);
        this.synchronize();
      }
      // A trailing comma is fine — the IF snippet inserts one.
      if (this.peek().kind === ',') this.advance();
    }
    return statements;
  }

  // ---------- token helpers ----------

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private previous(): Token | undefined {
    return this.tokens[this.pos - 1];
  }

  private advance(): Token {
    const token = this.tokens[this.pos];
    if (token.kind !== 'eof') this.pos++;
    return token;
  }

  private isKeyword(keyword: Keyword): boolean {
    const token = this.peek();
    return token.kind === 'keyword' && token.keyword === keyword;
  }

  /** Consumes and returns the next operator if it is one of `operators`. */
  private matchOperator(operators: readonly Operator[]): Operator | null {
    const token = this.peek();
    if (token.kind !== 'operator' || !operators.includes(token.operator)) return null;
    this.advance();
    return token.operator;
  }

  private describe(token: Token): string {
    return token.kind === 'eof' ? 'the end of the formula' : `"${this.source.slice(token.start, token.end)}"`;
  }

  private fail(code: DiagnosticCode, message: string, span: Span): never {
    throw new ParseError(error(code, message, span));
  }

  /** After an error, skip to the next statement. Commas only ever separate statements. */
  private synchronize() {
    while (this.peek().kind !== ',' && this.peek().kind !== 'eof') this.advance();
  }

  // ---------- statements ----------

  private statement(): Statement {
    if (this.isKeyword('IF')) return this.ifStatement();
    const expression = this.expression();
    return { kind: 'Expression', expression, start: expression.start, end: expression.end };
  }

  private ifStatement(): Statement {
    const ifToken = this.advance();
    const branches = [this.branch()];
    for (;;) {
      if (!this.isKeyword('ELSE')) {
        const last = branches[branches.length - 1].value;
        this.fail('MISSING_ELSE', 'IF needs an ELSE — use "ELSE 0" when nothing should be charged', spanOf(ifToken, last));
      }
      this.advance();
      if (!this.isKeyword('IF')) break;
      this.advance();
      branches.push(this.branch());
    }
    const otherwise = this.expression();
    return { kind: 'If', branches, otherwise, start: ifToken.start, end: otherwise.end };
  }

  /** `condition THEN value` — shared by IF and ELSE IF. */
  private branch(): IfBranch {
    const condition = this.expression();
    if (!this.isKeyword('THEN')) {
      const next = this.peek();
      this.fail('EXPECTED_THEN', `Expected THEN before ${this.describe(next)}`, next.kind === 'eof' ? condition : next);
    }
    this.advance();
    return { condition, value: this.expression() };
  }

  private expectStatementEnd(statement: Statement) {
    const next = this.peek();
    if (next.kind === ',' || next.kind === 'eof') return;
    if (next.kind === ')') this.fail('UNBALANCED_PAREN', 'Unexpected ")" — there is no matching "("', next);
    const onNewLine = this.source.slice(statement.end, next.start).includes('\n');
    this.fail(
      'UNEXPECTED_TOKEN',
      onNewLine
        ? 'Missing "," between statements — end every line except the last with a comma'
        : `Unexpected ${this.describe(next)} — expected an operator or ","`,
      next,
    );
  }

  // ---------- expressions, lowest precedence first ----------

  private expression(): Expr {
    let left = this.and();
    while (this.isKeyword('OR')) {
      this.advance();
      const right = this.and();
      left = { kind: 'Logical', operator: 'OR', left, right, ...spanOf(left, right) };
    }
    return left;
  }

  private and(): Expr {
    let left = this.comparison();
    while (this.isKeyword('AND')) {
      this.advance();
      const right = this.comparison();
      left = { kind: 'Logical', operator: 'AND', left, right, ...spanOf(left, right) };
    }
    return left;
  }

  private comparison(): Expr {
    const left = this.additive();
    const operator = this.matchOperator(COMPARISON_OPERATORS) as ComparisonOperator | null;
    if (!operator) return left;
    const right = this.additive();
    if (this.matchOperator(COMPARISON_OPERATORS)) {
      this.fail(
        'CHAINED_COMPARISON',
        'Comparisons can\'t be chained — combine them with AND, e.g. (@X > 1) AND (@X < 5)',
        this.previous() ?? right,
      );
    }
    return { kind: 'Comparison', operator, left, right, ...spanOf(left, right) };
  }

  private additive(): Expr {
    let left = this.multiplicative();
    for (let op = this.matchOperator(['+', '-']); op; op = this.matchOperator(['+', '-'])) {
      const right = this.multiplicative();
      left = { kind: 'Arithmetic', operator: op as '+' | '-', left, right, ...spanOf(left, right) };
    }
    return left;
  }

  private multiplicative(): Expr {
    let left = this.unary();
    for (let op = this.matchOperator(['*', '/']); op; op = this.matchOperator(['*', '/'])) {
      const right = this.unary();
      left = { kind: 'Arithmetic', operator: op as '*' | '/', left, right, ...spanOf(left, right) };
    }
    return left;
  }

  private unary(): Expr {
    const minus = this.peek();
    if (!this.matchOperator(['-'])) return this.power();
    const operand = this.unary();
    return { kind: 'Negate', operand, ...spanOf(minus, operand) };
  }

  private power(): Expr {
    const base = this.primary();
    if (!this.matchOperator(['^'])) return base;
    // Right-associative, and `2 ^ -1` is allowed.
    const exponent = this.unary();
    return { kind: 'Arithmetic', operator: '^', left: base, right: exponent, ...spanOf(base, exponent) };
  }

  private primary(): Expr {
    const token = this.peek();
    switch (token.kind) {
      case 'number':
        this.advance();
        return { kind: 'Number', value: token.value, start: token.start, end: token.end };
      case 'variable':
        this.advance();
        return { kind: 'Variable', name: token.name, start: token.start, end: token.end };
      case 'identifier':
        this.advance();
        return { kind: 'Identifier', name: token.name, start: token.start, end: token.end };
      case '(':
        return this.parenthesized();
      case ')':
        return this.fail('UNBALANCED_PAREN', 'Unexpected ")" — there is no matching "("', token);
      case 'keyword':
        if (token.keyword === 'IF') return this.fail('MISPLACED_IF', 'IF can only start a statement or follow ELSE', token);
        break;
      default:
        break;
    }
    const before = this.previous();
    const message =
      before && before.kind === 'operator'
        ? `Expected a value after ${this.describe(before)}, found ${this.describe(token)}`
        : `Expected a number, @variable or "(", found ${this.describe(token)}`;
    return this.fail('EXPECTED_VALUE', message, token.kind === 'eof' && before ? before : token);
  }

  private parenthesized(): Expr {
    const open = this.advance();
    if (this.peek().kind === ')') this.fail('EXPECTED_VALUE', 'Empty parentheses', spanOf(open, this.peek()));
    const inner = this.expression();
    const close = this.peek();
    if (close.kind === 'eof' || close.kind === ',') this.fail('UNBALANCED_PAREN', 'Missing ")" to close this "("', open);
    if (close.kind !== ')') {
      this.fail('UNEXPECTED_TOKEN', `Expected ")" or an operator before ${this.describe(close)}`, close);
    }
    this.advance();
    // Widen the span to include the parentheses so errors underline them too.
    return { ...inner, start: open.start, end: close.end };
  }
}

/** Lexes and parses a formula. Never throws; problems come back as diagnostics. */
export const parse = (source: string): ParseResult => {
  const { tokens, diagnostics } = lex(source);
  const statements = new Parser(source, tokens).parseProgram(diagnostics);
  diagnostics.sort((a, b) => a.start - b.start);
  return { program: { statements, start: 0, end: source.length }, tokens, diagnostics };
};
