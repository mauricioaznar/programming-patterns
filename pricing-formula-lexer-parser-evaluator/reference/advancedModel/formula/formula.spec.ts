import { analyzeModel, runModel } from '.';
import type { DiagnosticCode, FormulaSubModel, FormulaValues, FormulaVariable } from '.';
import { lex } from './lexer';
import { REFERENCE_MODELS, SUB_MODEL_LIBRARY } from './referenceModels.fixture';

const VARS: FormulaVariable[] = [
  { name: 'A', min: 0, max: 100 },
  { name: 'B', min: 0, max: 100 },
  { name: 'PUMPINGHOURS', min: 0, max: 1000 },
  { name: 'RATEPERSIDE', min: 0, max: 500 },
];

const codes = (source: string, variables = VARS): DiagnosticCode[] =>
  analyzeModel(source, variables).diagnostics.map((d) => d.code);

const total = (source: string, values: FormulaValues, variables = VARS): number => {
  const result = runModel(source, variables, values);
  if (!result.ok) throw new Error(`expected a total, got ${result.diagnostics.map((d) => d.message).join('; ')}`);
  return result.total;
};

describe('reference models (sub-model picker library + builder models)', () => {
  describe.each(REFERENCE_MODELS.map((m) => [m.name, m] as const))('%s', (_name, model) => {
    it('parses and validates with no diagnostics or variable issues', () => {
      const analysis = analyzeModel(model.formula, model.variables);
      expect(analysis.diagnostics).toEqual([]);
      expect(analysis.variableIssues).toEqual([]);
      expect(analysis.ok).toBe(true);
    });

    it.each(model.cases.map((c) => [JSON.stringify(c.values), c] as const))('evaluates %s', (_label, testCase) => {
      const result = runModel(model.formula, model.variables, testCase.values);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.total).toBeCloseTo(testCase.total, 6);
      if (testCase.branches) expect(result.statements.map((s) => s.branch)).toEqual(testCase.branches);
    });
  });

  it('rejects a sample value outside the variable range instead of clamping', () => {
    const evo4 = REFERENCE_MODELS.find((m) => m.name === 'EVO4PUMPHR (current)');
    const result = runModel(evo4!.formula, evo4!.variables, { PUMPINGHOURS: 1200, PUMPRATEMAX: 80 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.map((d) => d.code)).toEqual(['OUT_OF_RANGE']);
    expect(result.diagnostics[0].message).toBe('@PUMPINGHOURS = 1,200 is outside its allowed range 0 – 1,000');
  });
});

describe('lexer', () => {
  it('tokenizes keywords case-insensitively and uppercases variable references', () => {
    const { tokens, diagnostics } = lex('if @pumpingHours >= 1.5 then 2 else 0');
    expect(diagnostics).toEqual([]);
    expect(tokens.map((t) => t.kind)).toEqual([
      'keyword',
      'variable',
      'operator',
      'number',
      'keyword',
      'number',
      'keyword',
      'number',
      'eof',
    ]);
    expect(tokens[1]).toMatchObject({ kind: 'variable', name: 'PUMPINGHOURS', start: 3, end: 16 });
  });

  it('treats <> as !=', () => {
    expect(lex('1 <> 2').tokens[1]).toMatchObject({ kind: 'operator', operator: '!=' });
  });

  it.each([
    ['@A # 2', 'UNEXPECTED_CHAR'],
    ['1.2.3', 'BAD_NUMBER'],
    ['5.', 'BAD_NUMBER'],
    ['@ + 1', 'EMPTY_VARIABLE'],
  ])('%s → %s', (source, code) => {
    expect(lex(source).diagnostics.map((d) => d.code)).toEqual([code]);
  });
});

describe('arithmetic', () => {
  it.each([
    ['2 + 3 * 4', 14],
    ['(2 + 3) * 4', 20],
    ['2 - 3 - 4', -5],
    ['8 / 4 / 2', 1],
    ['-2 + 5', 3],
    ['--2', 2],
    ['2 ^ 3 ^ 2', 512],
    ['-2 ^ 2', -4],
    ['2 ^ -1', 0.5],
    ['1, 2, 3', 6],
    ['1, 2,', 3],
  ])('%s = %d', (source, expected) => {
    expect(total(source, {})).toBeCloseTo(expected, 10);
  });
});

describe('IF / ELSE IF / ELSE', () => {
  const tiers = 'IF @A < 10 THEN 1 ELSE IF @A < 20 THEN 2 ELSE IF @A < 30 THEN 3 ELSE 4';

  it.each([
    [5, 1, 0],
    [15, 2, 1],
    [25, 3, 2],
    [35, 4, 'else'],
  ] as const)('@A = %d → %d (branch %s)', (a, expected, branch) => {
    const result = runModel(tiers, VARS, { A: a });
    expect(result).toMatchObject({ ok: true, total: expected, statements: [{ branch }] });
  });

  it('supports AND / OR with AND binding tighter', () => {
    const source = 'IF @A = 1 OR @A = 2 AND @B = 3 THEN 1 ELSE 0';
    expect(total(source, { A: 1, B: 0 })).toBe(1);
    expect(total(source, { A: 2, B: 0 })).toBe(0);
    expect(total(source, { A: 2, B: 3 })).toBe(1);
  });

  it('short-circuits, so an unreachable division by zero is not an error', () => {
    expect(total('IF @A > 0 AND 1 / @A > 0 THEN 1 ELSE 0', { A: 0 })).toBe(0);
  });

  it('only evaluates the chosen branch', () => {
    expect(total('IF @A = 0 THEN 0 ELSE 10 / @A', { A: 0 })).toBe(0);
  });
});

describe('diagnostics', () => {
  it.each<[string, DiagnosticCode[]]>([
    // parser
    ['', ['EMPTY_FORMULA']],
    ['   \n ', ['EMPTY_FORMULA']],
    ['@A, , @B', ['EMPTY_STATEMENT']],
    [', @A', ['EMPTY_STATEMENT']],
    ['IF @A > 1 @A ELSE 0', ['EXPECTED_THEN']],
    ['IF @A > 1', ['EXPECTED_THEN']],
    ['IF @A > 1 THEN 5', ['MISSING_ELSE']],
    ['IF @A > 1 THEN 5 ELSE IF @A > 2 THEN 6', ['MISSING_ELSE']],
    ['(@A + 1', ['UNBALANCED_PAREN']],
    ['@A + 1)', ['UNBALANCED_PAREN']],
    ['()', ['EXPECTED_VALUE']],
    ['@A *', ['EXPECTED_VALUE']],
    ['@A * * 2', ['EXPECTED_VALUE']],
    ['@A @B', ['UNEXPECTED_TOKEN']],
    ['@A\n@B', ['UNEXPECTED_TOKEN']],
    ['1 + IF @A > 1 THEN 1 ELSE 0', ['MISPLACED_IF']],
    ['IF @A > 1 THEN IF @B > 1 THEN 1 ELSE 0 ELSE 0', ['MISPLACED_IF']],
    ['IF 1 < @A < 5 THEN 1 ELSE 0', ['CHAINED_COMPARISON']],
    // validator
    ['@RATE * 2', ['UNKNOWN_VARIABLE']],
    ['PUMPINGHOURS * 2', ['MISSING_AT_PREFIX']],
    ['FOO * 2', ['UNKNOWN_NAME']],
    ['IF @A THEN 1 ELSE 0', ['CONDITION_EXPECTED']],
    ['IF (@A > 1) AND 5 THEN 1 ELSE 0', ['CONDITION_EXPECTED']],
    ['@A > 1', ['NUMBER_EXPECTED']],
    ['(@A > 1) * 5', ['NUMBER_EXPECTED']],
    ['IF @A > 1 THEN @B > 1 ELSE 0', ['NUMBER_EXPECTED']],
  ])('%j → %j', (source, expected) => {
    expect(codes(source)).toEqual(expected);
  });

  it('keeps going after a syntax error and reports every bad statement', () => {
    expect(codes('IF @A > 1 THEN 5,\n@A +,\n@B * 2,\n(@A')).toEqual([
      'MISSING_ELSE',
      'EXPECTED_VALUE',
      'UNBALANCED_PAREN',
    ]);
  });

  it('points at the offending text', () => {
    const source = 'IF @A > 1\nTHEN @RATE ELSE 0';
    const [diagnostic] = analyzeModel(source, VARS).diagnostics;
    expect(source.slice(diagnostic.start, diagnostic.end)).toBe('@RATE');
    expect(diagnostic.message).toBe('Unknown variable @RATE — did you mean @RATEPERSIDE?');
  });

  it('suggests the @ prefix for a bare variable name', () => {
    expect(analyzeModel('PUMPINGHOURS * 2', VARS).diagnostics[0].message).toBe(
      'Did you mean @PUMPINGHOURS? Variables start with "@"',
    );
  });

  it('hints at a missing comma when a new line starts without one', () => {
    expect(analyzeModel('@A\n@B', VARS).diagnostics[0].message).toMatch(/Missing "," between statements/);
  });

  it('does not report a variable as unused just because its statement has a syntax error', () => {
    const { variableIssues } = analyzeModel('@A +', [{ name: 'A', min: 0, max: 1 }]);
    expect(variableIssues).toEqual([]);
  });
});

describe('variable definitions (PS-11)', () => {
  const issues = (variables: FormulaVariable[], formula = '') =>
    analyzeModel(formula, variables).variableIssues.map(({ index, field, code }) => ({ index, field, code }));

  it('flags empty, malformed and duplicate names', () => {
    expect(
      issues(
        [
          { name: '', min: 0, max: 1 },
          { name: '1ABC', min: 0, max: 1 },
          { name: 'bbl', min: 0, max: 1 },
          { name: 'BBL', min: 0, max: 1 },
          { name: 'BBL', min: 0, max: 1 },
        ],
        '@BBL',
      ).filter((i) => i.code !== 'UNUSED_VARIABLE'),
    ).toEqual([
      { index: 0, field: 'name', code: 'INVALID_NAME' },
      { index: 1, field: 'name', code: 'INVALID_NAME' },
      { index: 2, field: 'name', code: 'INVALID_NAME' },
      { index: 4, field: 'name', code: 'DUPLICATE_NAME' },
    ]);
  });

  it('requires numeric min ≤ max', () => {
    expect(
      issues(
        [
          { name: 'A', min: NaN, max: 1 },
          { name: 'B', min: 5, max: 1 },
        ],
        '@A + @B',
      ),
    ).toEqual([
      { index: 0, field: 'min', code: 'INVALID_NUMBER' },
      { index: 1, field: 'max', code: 'INVALID_RANGE' },
    ]);
  });

  it('warns about unused variables without blocking the model', () => {
    const analysis = analyzeModel('@A * 2', [
      { name: 'A', min: 0, max: 1 },
      { name: 'B', min: 0, max: 1 },
    ]);
    expect(analysis.variableIssues).toEqual([
      expect.objectContaining({ index: 1, severity: 'warning', code: 'UNUSED_VARIABLE' }),
    ]);
    expect(analysis.ok).toBe(true);
  });
});

describe('evaluation errors', () => {
  it.each<[string, FormulaValues, DiagnosticCode]>([
    ['@A * 2', {}, 'MISSING_VALUE'],
    ['@A * 2', { A: NaN }, 'MISSING_VALUE'],
    ['@A * 2', { A: 101 }, 'OUT_OF_RANGE'],
    ['@A * 2', { A: -1 }, 'OUT_OF_RANGE'],
    ['10 / @A', { A: 0 }, 'DIVISION_BY_ZERO'],
    ['10 ^ 400', {}, 'NOT_FINITE'],
  ])('%s with %j → %s', (source, values, code) => {
    const result = runModel(source, VARS, values);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics.map((d) => d.code)).toEqual([code]);
  });

  it('accepts values exactly on the range bounds', () => {
    expect(total('@A + @B', { A: 0, B: 100 })).toBe(100);
  });

  it('refuses to run a formula that has errors', () => {
    const result = runModel('@A +', VARS, { A: 1 });
    expect(result).toEqual({ ok: false, diagnostics: [expect.objectContaining({ code: 'EXPECTED_VALUE' })] });
  });
});

describe('sub-models', () => {
  const LIBRARY: FormulaSubModel[] = SUB_MODEL_LIBRARY.map(({ name, formula, variables }) => ({ name, formula, variables }));
  const bbl: FormulaVariable[] = [{ name: 'BBL', min: 0, max: 10000000 }];

  it('evaluates a referenced sub-model to its own total', () => {
    const result = runModel('@PEPFRESHWATER + @PEPBRINEWATER', bbl, { BBL: 500 }, LIBRARY);
    expect(result).toMatchObject({ ok: true, total: 1100 });
  });

  it('can be used inside expressions and conditions', () => {
    const source = 'IF @SAEVO2PUMPHR > 10000 THEN @SAEVO2PUMPHR * 0.9 ELSE @SAEVO2PUMPHR';
    const vars = [{ name: 'PUMPINGHOURS', min: 0, max: 1000 }];
    expect(runModel(source, vars, { PUMPINGHOURS: 2 }, LIBRARY)).toMatchObject({ ok: true, total: 13365 });
    expect(runModel(source, vars, { PUMPINGHOURS: 1 }, LIBRARY)).toMatchObject({ ok: true, total: 7425 });
  });

  it('is only known when attached', () => {
    expect(codes('@PEPFRESHWATER * 2')).toEqual(['UNKNOWN_VARIABLE']);
    expect(analyzeModel('@PEPFRESHWATER * 2', bbl, LIBRARY).diagnostics).toEqual([]);
  });

  it('suggests attached sub-model names for typos', () => {
    const [diagnostic] = analyzeModel('@PEPFRESHWATR', bbl, LIBRARY).diagnostics;
    expect(diagnostic.message).toBe('Unknown variable @PEPFRESHWATR — did you mean @PEPFRESHWATER?');
  });

  it("applies the sub-model's own ranges and reports them at the reference", () => {
    // BBL is allowed up to 10,000,000 here, but TEMPAMSYSWATERHAUL caps it at 1,000,000.
    const vars = [...bbl, { name: 'MILES', min: 0, max: 2000 }];
    const source = '@BBL * 0 + @TEMPAMSYSWATERHAUL';
    const result = runModel(source, vars, { BBL: 2000000, MILES: 10 }, LIBRARY);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics[0]).toMatchObject({ code: 'SUB_MODEL_ERROR', start: 11, end: 30 });
    expect(result.diagnostics[0].message).toBe(
      '@TEMPAMSYSWATERHAUL: @BBL = 2,000,000 is outside its allowed range 0 – 1,000,000',
    );
  });

  it('counts the variables of a referenced sub-model as used', () => {
    const vars = [...bbl, { name: 'MILES', min: 0, max: 2000 }];
    expect(analyzeModel('@AMSYSWATERHAUL2', vars, LIBRARY).variableIssues).toEqual([]);
    expect(analyzeModel('1', vars, LIBRARY).variableIssues.map((i) => i.code)).toEqual([
      'UNUSED_VARIABLE',
      'UNUSED_VARIABLE',
    ]);
  });

  it('prefers a variable over a sub-model with the same name', () => {
    const clash: FormulaSubModel[] = [{ name: 'BBL', formula: '999', variables: [] }];
    expect(runModel('@BBL', bbl, { BBL: 5 }, clash)).toMatchObject({ ok: true, total: 5 });
  });

  it('detects cycles between sub-models', () => {
    const cyclic: FormulaSubModel[] = [
      { name: 'A_MODEL', formula: '@B_MODEL + 1', variables: [] },
      { name: 'B_MODEL', formula: '@A_MODEL + 1', variables: [] },
    ];
    const result = runModel('@A_MODEL', [], {}, cyclic);
    expect(result).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: 'CIRCULAR_SUB_MODEL',
          message: '@A_MODEL refers back to itself (@A_MODEL → @B_MODEL → @A_MODEL)',
        }),
      ],
    });
  });

  it('reports a broken sub-model formula at the reference', () => {
    const broken: FormulaSubModel[] = [{ name: 'BROKEN', formula: '1 +', variables: [] }];
    const result = runModel('2 * @BROKEN', [], {}, broken);
    expect(result).toEqual({
      ok: false,
      diagnostics: [expect.objectContaining({ code: 'SUB_MODEL_ERROR', start: 4, end: 11 })],
    });
  });
});
