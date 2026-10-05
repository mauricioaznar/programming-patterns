import React, { useMemo, useState } from 'react';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, useTheme } from '@mui/material';
import { GeodeButton, Typography } from '@eog/geode-core';
import { useNativeFieldStyle } from '../../../ui';
import { lineColumnOf, runModel } from './formula';
import type { DiagnosticCode, FormulaSubModel, FormulaValues, FormulaVariable, StatementResult } from './formula';

const MONO = "'Roboto Mono', ui-monospace, monospace";

/** Errors only a run can find; anything else is a formula error the editor already lists above. */
const RUN_ERRORS = new Set<DiagnosticCode>([
  'MISSING_VALUE',
  'OUT_OF_RANGE',
  'DIVISION_BY_ZERO',
  'NOT_FINITE',
  'CIRCULAR_SUB_MODEL',
  'SUB_MODEL_ERROR',
]);

const formatRange = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 10 }) : '—';

/** Which part of a line produced its value, for the per-line breakdown. */
const branchLabel = (branch: StatementResult['branch']) => {
  if (branch === null) return 'expression';
  if (branch === 'else') return 'ELSE';
  return branch === 0 ? 'IF matched' : `ELSE IF ${branch} matched`;
};

const formatAmount = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Blank inputs count as 0, as in the design reference; anything non-numeric stays NaN so the run reports it. */
const toSampleValue = (text: string | undefined) => (!text || text.trim() === '' ? 0 : Number(text));

const isOutOfRange = (text: string | undefined, variable: FormulaVariable) => {
  if (!text || text.trim() === '') return false;
  const n = Number(text);
  return Number.isNaN(n) || n < variable.min || n > variable.max;
};

interface FormulaTestPanelProps {
  formula: string;
  /** Every variable on the model, including ones mapped in from sub-models. */
  variables: FormulaVariable[];
  subModels: FormulaSubModel[];
}

/**
 * PS-13 — runs the Advanced Model formula against sample variable values so the
 * user can confirm it calculates the expected result before saving. Evaluates
 * live as values change; sample values are local to the editor and never saved.
 */
export const FormulaTestPanel: React.FC<FormulaTestPanelProps> = ({ formula, variables, subModels }) => {
  const theme = useTheme();
  const fieldStyle = useNativeFieldStyle();
  const [samples, setSamples] = useState<Record<string, string>>({});

  // Unnamed rows can't be referenced, and a duplicate name is one input (the validator flags the duplicate).
  const testable = useMemo(() => {
    const seen = new Set<string>();
    return variables.filter((v) => {
      if (v.name === '' || seen.has(v.name)) return false;
      seen.add(v.name);
      return true;
    });
  }, [variables]);

  const result = useMemo(() => {
    if (formula.trim() === '') return null;
    const values: FormulaValues = {};
    testable.forEach((v) => {
      values[v.name] = toSampleValue(samples[v.name]);
    });
    return runModel(formula, testable, values, subModels);
  }, [formula, testable, samples, subModels]);

  return (
    <Box sx={{ mt: 2.5, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
        <ScienceOutlinedIcon fontSize='small' color='primary' />
        <div style={{ flex: 1 }}>
          <Typography variant='subtitle2' sx={{ fontWeight: 500 }}>
            Test formula
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            Enter sample values to check the result before saving · blank counts as 0 · not saved
          </Typography>
        </div>
        <GeodeButton variant='outlined' size='small' onClick={() => setSamples({})} disabled={!Object.keys(samples).length}>
          Reset
        </GeodeButton>
      </div>

      <Box sx={{ px: 2, pb: 2 }}>
        {testable.length === 0 ? (
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            Add a variable to test the formula with sample values.
          </Typography>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {testable.map((variable) => {
              const text = samples[variable.name] ?? '';
              const outOfRange = isOutOfRange(text, variable);
              return (
                <label key={variable.name} style={{ display: 'block' }}>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                    <Box component='span' sx={{ fontFamily: MONO, fontSize: 12.5, color: 'primary.main' }}>
                      @{variable.name}
                    </Box>
                    <Box component='span' sx={{ fontSize: 11, color: 'text.secondary', flex: 1, textAlign: 'right' }}>
                      {formatRange(variable.min)} – {formatRange(variable.max)}
                    </Box>
                  </span>
                  <input
                    aria-label={`Sample value for @${variable.name}`}
                    type='number'
                    step='any'
                    placeholder='0'
                    value={text}
                    onChange={(e) => setSamples((prev) => ({ ...prev, [variable.name]: e.target.value }))}
                    style={{
                      ...fieldStyle,
                      fontFamily: MONO,
                      ...(outOfRange && { borderColor: theme.palette.warning.main }),
                    }}
                  />
                  {outOfRange && (
                    <Typography variant='caption' sx={{ display: 'block', mt: 0.5, color: 'warning.main' }}>
                      Outside the allowed range {formatRange(variable.min)} – {formatRange(variable.max)}
                    </Typography>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </Box>

      <Box sx={{ px: 2, py: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'action.hover' }} aria-live='polite'>
        <Typography
          variant='overline'
          sx={{ display: 'block', mb: 1, color: 'text.secondary', fontSize: 10, letterSpacing: '0.14em' }}
        >
          Result
        </Typography>
        {result === null ? (
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            Write a formula to see its result.
          </Typography>
        ) : !result.ok && !result.diagnostics.every((d) => RUN_ERRORS.has(d.code)) ? (
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            Fix the formula errors above to run a test.
          </Typography>
        ) : !result.ok ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {result.diagnostics.map((d) => (
              <Typography
                key={`${d.code}-${d.start}-${d.end}`}
                variant='body2'
                sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, color: 'error.main' }}
              >
                <ErrorOutlineIcon sx={{ fontSize: 17, mt: '1px' }} />
                {d.message}
              </Typography>
            ))}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <Typography component='span' sx={{ fontWeight: 500, fontSize: 20, color: 'text.secondary' }}>
                $
              </Typography>
              <Typography component='span' sx={{ fontWeight: 500, fontSize: 32, lineHeight: 1, color: 'text.primary' }}>
                {formatAmount(result.total)}
              </Typography>
            </div>
            <Typography variant='caption' sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
              Sum of {result.statements.length} line{result.statements.length === 1 ? '' : 's'}
            </Typography>
            {result.statements.length > 1 && (
              <Box
                component='ul'
                sx={{ listStyle: 'none', p: 0, m: 0, mt: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}
              >
                {result.statements.map((s) => (
                  <Typography
                    key={s.start}
                    component='li'
                    variant='caption'
                    sx={{ display: 'flex', gap: 1, color: 'text.secondary' }}
                  >
                    <span style={{ fontFamily: MONO, minWidth: 56 }}>line {lineColumnOf(formula, s.start).line}</span>
                    <span style={{ flex: 1 }}>{branchLabel(s.branch)}</span>
                    <span style={{ fontFamily: MONO }}>{formatAmount(s.value)}</span>
                  </Typography>
                ))}
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default FormulaTestPanel;
