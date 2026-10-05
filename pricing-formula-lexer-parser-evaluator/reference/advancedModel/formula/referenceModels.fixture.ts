// Established models from the design reference (docs/design/price-sheets.reference.html),
// used as the language's acceptance fixtures: every one must parse and validate
// cleanly and evaluate to the hand-computed totals below.
//   - LIB: the sub-model picker's saved-model library
//   - EVO4PUMPHR: the builder's current model (`this.M`) and its versions (`this.VERS`)
//   - EVO3PUMPHR (3 tiers): the create screen's DEMO_MODEL (docs/design/price-sheets.logic.js)
import type { FormulaValues, FormulaVariable } from '.';

export interface ReferenceModel {
  name: string;
  variables: FormulaVariable[];
  formula: string;
  cases: Array<{
    values: FormulaValues;
    total: number;
    /** Expected matched branch per statement (index, 'else', or null for a plain expression). */
    branches?: Array<number | 'else' | null>;
  }>;
}

const v = (name: string, min: number, max: number): FormulaVariable => ({ name, min, max });

export const SUB_MODEL_LIBRARY: ReferenceModel[] = [
  {
    name: 'TEMPAMSYSWATERHAUL',
    variables: [v('BBL', 0, 1000000), v('MILES', 0, 2000)],
    formula: '(@BBL * 0.42) + (@MILES * 3.15)',
    cases: [{ values: { BBL: 100, MILES: 10 }, total: 73.5 }],
  },
  {
    name: 'EVO5PUMPHR',
    variables: [v('PUMPINGHOURS', 0, 1000), v('RATEPERSIDE', 0, 500)],
    formula:
      'IF (@RATEPERSIDE < 70) THEN @PUMPINGHOURS * ((12420.00 + 510)/2) ELSE 0,\n' +
      'IF (@RATEPERSIDE >= 70) THEN @PUMPINGHOURS * ((12420.00 + 640)/2) ELSE 0',
    cases: [
      { values: { PUMPINGHOURS: 2.5, RATEPERSIDE: 72 }, total: 16325, branches: ['else', 0] },
      { values: { PUMPINGHOURS: 2.5, RATEPERSIDE: 60 }, total: 16162.5, branches: [0, 'else'] },
    ],
  },
  {
    name: 'EVO3PUMPHR',
    variables: [v('PUMPINGHOURS', 0, 1000), v('RATEPERSIDE', 0, 500)],
    formula:
      'IF (@RATEPERSIDE < 65)\nTHEN @PUMPINGHOURS * ((10695.27 + 435)/2) ELSE 0,\n\n' +
      'IF (@RATEPERSIDE < 70) AND (@RATEPERSIDE >= 65)\nTHEN @PUMPINGHOURS * ((10695.27 + 480)/2) ELSE 0,\n\n' +
      'IF (@RATEPERSIDE < 75) AND (@RATEPERSIDE >= 70)\nTHEN @PUMPINGHOURS * ((10695.27 + 525)/2) ELSE 0,\n\n' +
      'IF (@RATEPERSIDE < 80) AND (@RATEPERSIDE >= 75)\nTHEN @PUMPINGHOURS * ((10695.27 + 626)/2) ELSE 0,\n\n' +
      'IF (@RATEPERSIDE >= 80)\nTHEN @PUMPINGHOURS * ((10695.27 + 710)/2) ELSE 0',
    cases: [
      { values: { PUMPINGHOURS: 2.5, RATEPERSIDE: 72 }, total: 14025.3375, branches: ['else', 'else', 0, 'else', 'else'] },
      // Tier boundaries: >= 65 falls into the second tier, not the first.
      { values: { PUMPINGHOURS: 2.5, RATEPERSIDE: 65 }, total: 13969.0875, branches: ['else', 0, 'else', 'else', 'else'] },
      { values: { PUMPINGHOURS: 2.5, RATEPERSIDE: 85 }, total: 14256.5875, branches: ['else', 'else', 'else', 'else', 0] },
    ],
  },
  {
    name: 'SAEVO2PUMPHR',
    variables: [v('PUMPINGHOURS', 0, 1000)],
    formula: '@PUMPINGHOURS * 7425',
    cases: [{ values: { PUMPINGHOURS: 2 }, total: 14850, branches: [null] }],
  },
  {
    name: 'TESTMODELHOURS',
    variables: [v('HOURS', 0, 10000)],
    formula: '@HOURS * 125',
    cases: [{ values: { HOURS: 8 }, total: 1000 }],
  },
  {
    name: 'PEPFRESHWATER',
    variables: [v('BBL', 0, 10000000)],
    formula: '@BBL * 0.85',
    cases: [{ values: { BBL: 500 }, total: 425 }],
  },
  {
    name: 'PEPBRINEWATER',
    variables: [v('BBL', 0, 10000000)],
    formula: '@BBL * 1.35',
    cases: [{ values: { BBL: 500 }, total: 675 }],
  },
  {
    name: 'TEST123',
    variables: [v('HOURS', 0, 1000000)],
    formula: '@HOURS * 1',
    cases: [{ values: { HOURS: 3 }, total: 3 }],
  },
  {
    name: 'PEPDISPOSAL',
    variables: [v('HOURS', 0, 1000000), v('BBL', 0, 10000000)],
    formula: '(@BBL * 1) + (@HOURS * 90)',
    cases: [{ values: { HOURS: 2, BBL: 100 }, total: 280 }],
  },
  {
    name: 'AMSYSWATERHAUL2',
    variables: [v('BBL', 0, 1000000), v('MILES', 0, 2000)],
    formula: '(@BBL * 0.45) + (@MILES * 3.40)',
    cases: [{ values: { BBL: 100, MILES: 10 }, total: 79 }],
  },
];

const EVO4_TIERS_V3 =
  'IF (@PUMPINGHOURS > 0) AND (@PUMPINGHOURS < 1) THEN 9350 ELSE 0,\n' +
  'IF (@PUMPINGHOURS >= 1) AND (@PUMPINGHOURS < 1.5) THEN 11550 ELSE 0,\n' +
  'IF (@PUMPINGHOURS >= 1.5) AND (@PUMPINGHOURS < 2) THEN 16500 ELSE 0,\n' +
  'IF (@PUMPINGHOURS >= 2) AND (@PUMPINGHOURS < 2.5) THEN 20900 ELSE 0,\n' +
  'IF (@PUMPINGHOURS >= 2.5) AND (@PUMPINGHOURS < 3) THEN 26675 ELSE 0,\n';

export const BUILDER_MODELS: ReferenceModel[] = [
  {
    name: 'EVO4PUMPHR (current)',
    variables: [v('PUMPINGHOURS', 0, 1000), v('PUMPRATEMAX', 0, 500)],
    formula:
      EVO4_TIERS_V3 +
      'IF (@PUMPINGHOURS >= 3) AND (@PUMPINGHOURS < 3.5) THEN 30800 ELSE 0,\n' +
      'IF (@PUMPINGHOURS >= 3.5) AND (@PUMPINGHOURS < 4) THEN 34650 ELSE 0,\n' +
      'IF (@PUMPRATEMAX < 75) THEN 0 ELSE ((@PUMPRATEMAX - 75)/5) * @PUMPINGHOURS * 825',
    cases: [
      // The builder's own test inputs: 26675 tier + ((80 - 75) / 5) * 2.5 * 825 premium.
      {
        values: { PUMPINGHOURS: 2.5, PUMPRATEMAX: 80 },
        total: 28737.5,
        branches: ['else', 'else', 'else', 'else', 0, 'else', 'else', 'else'],
      },
      { values: { PUMPINGHOURS: 2.5, PUMPRATEMAX: 70 }, total: 26675 },
    ],
  },
  {
    name: 'EVO4PUMPHR v1',
    variables: [v('PUMPINGHOURS', 0, 500)],
    formula:
      'IF (@PUMPINGHOURS > 0) AND (@PUMPINGHOURS < 1) THEN 8800 ELSE 0,\n' +
      'IF (@PUMPINGHOURS >= 1) AND (@PUMPINGHOURS < 2) THEN 15400 ELSE 0,\n' +
      'IF (@PUMPINGHOURS >= 2) THEN 24200 ELSE 0',
    cases: [
      { values: { PUMPINGHOURS: 2.5 }, total: 24200 },
      { values: { PUMPINGHOURS: 0.5 }, total: 8800 },
      // 0 hours matches no tier.
      { values: { PUMPINGHOURS: 0 }, total: 0, branches: ['else', 'else', 'else'] },
    ],
  },
  {
    name: 'EVO4PUMPHR v2',
    variables: [v('PUMPINGHOURS', 0, 1000)],
    formula:
      'IF (@PUMPINGHOURS > 0) AND (@PUMPINGHOURS < 1) THEN 9350 ELSE 0,\n' +
      'IF (@PUMPINGHOURS >= 1) AND (@PUMPINGHOURS < 1.5) THEN 11550 ELSE 0,\n' +
      'IF (@PUMPINGHOURS >= 1.5) AND (@PUMPINGHOURS < 2) THEN 16500 ELSE 0,\n' +
      'IF (@PUMPINGHOURS >= 2) THEN 24200 ELSE 0',
    cases: [{ values: { PUMPINGHOURS: 1.25 }, total: 11550 }],
  },
  {
    name: 'EVO4PUMPHR v3',
    variables: [v('PUMPINGHOURS', 0, 1000), v('PUMPRATEMAX', 0, 400)],
    formula: EVO4_TIERS_V3 + 'IF (@PUMPRATEMAX < 75) THEN 0 ELSE ((@PUMPRATEMAX - 75)/5) * @PUMPINGHOURS * 780',
    cases: [{ values: { PUMPINGHOURS: 2.5, PUMPRATEMAX: 80 }, total: 28625 }],
  },
  {
    name: 'EVO3PUMPHR (create-screen demo)',
    variables: [v('PUMPINGHOURS', 0, 1000), v('RATEPERSIDE', 0, 500)],
    formula:
      'IF (@RATEPERSIDE < 65)\nTHEN @PUMPINGHOURS * ((10695.27 + 435)/2) ELSE 0,\n\n' +
      'IF (@RATEPERSIDE < 70) AND (@RATEPERSIDE >= 65)\nTHEN @PUMPINGHOURS * ((10695.27 + 480)/2) ELSE 0,\n\n' +
      'IF (@RATEPERSIDE >= 70)\nTHEN @PUMPINGHOURS * ((10695.27 + 525)/2) ELSE 0',
    cases: [{ values: { PUMPINGHOURS: 2.5, RATEPERSIDE: 72 }, total: 14025.3375, branches: ['else', 'else', 0] }],
  },
];

export const REFERENCE_MODELS = [...SUB_MODEL_LIBRARY, ...BUILDER_MODELS];
