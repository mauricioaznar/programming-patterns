import React, { useState } from 'react';
import { Box } from '@mui/material';
import { GeodeMenu, GeodeMenuItem, Typography } from '@eog/geode-core';
import type { FormulaVariable } from './formula';

const MONO = "'Roboto Mono', ui-monospace, monospace";

/** Text inserted at the cursor; `|` marks where the cursor lands afterwards. */
interface PaletteButton {
  label: string;
  snippet: string;
  /** Wide buttons hold words (IF … THEN … ELSE) rather than a single symbol. */
  wide?: boolean;
}

// Mirrors the reference builder's palette (docs/design/price-sheets.reference.html, `_paintPalette`).
const GROUPS: Array<{ title: string; buttons: PaletteButton[] }> = [
  {
    title: 'Conditions',
    buttons: [
      { label: 'IF … THEN … ELSE', snippet: 'IF (|) THEN  ELSE 0,\n', wide: true },
      { label: 'New line', snippet: ',\n', wide: true },
    ],
  },
  {
    title: 'Operators',
    buttons: [
      { label: '+', snippet: ' + ' },
      { label: '−', snippet: ' - ' },
      { label: '×', snippet: ' * ' },
      { label: '÷', snippet: ' / ' },
      { label: '^', snippet: '^' },
      { label: '( )', snippet: '(|)' },
    ],
  },
  {
    title: 'Compare',
    buttons: [
      { label: '>', snippet: ' > ' },
      { label: '<', snippet: ' < ' },
      { label: '>=', snippet: ' >= ' },
      { label: '<=', snippet: ' <= ' },
      { label: '=', snippet: ' = ' },
      { label: '<>', snippet: ' <> ' },
    ],
  },
  { title: 'Logic', buttons: [{ label: 'AND', snippet: ' AND ', wide: true }] },
];

const formatRange = (n: number) => (Number.isFinite(n) ? n.toLocaleString('en-US') : '?');

interface PaletteButtonBaseProps {
  wide?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}

const PaletteButtonBase: React.FC<PaletteButtonBaseProps> = ({ wide, disabled, title, onClick, children }) => (
  <Box
    component='button'
    type='button'
    disabled={disabled}
    title={title}
    onClick={onClick}
    sx={{
      px: wide ? 1.375 : 1.125,
      py: 0.75,
      minWidth: wide ? 'auto' : 32,
      borderRadius: 1,
      border: 1,
      borderColor: 'divider',
      bgcolor: 'background.paper',
      color: 'text.primary',
      fontFamily: wide ? 'inherit' : MONO,
      fontWeight: 500,
      fontSize: 12.5,
      cursor: 'pointer',
      transition: 'all .14s',
      '&:hover:not(:disabled)': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'action.hover' },
      '&:disabled': { cursor: 'not-allowed', color: 'text.disabled' },
    }}
  >
    {children}
  </Box>
);

const GroupTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant='overline'
    sx={{ display: 'block', mb: 0.75, color: 'text.secondary', fontSize: 9.5, letterSpacing: '0.14em', lineHeight: 1.4 }}
  >
    {children}
  </Typography>
);

interface FormulaInsertPaletteProps {
  /** Named variables the "@ variable" menu offers. */
  variables: FormulaVariable[];
  /** Attached sub-models, also offered by the "@ variable" menu. */
  subModelNames: string[];
  onInsert: (snippet: string) => void;
  /** Opens the sub-model picker, which inserts the chosen model. */
  onPickSubModel: () => void;
}

/**
 * PS-12 — buttons that insert formula syntax at the editor's cursor. "@ variable"
 * lists the defined variables and attached sub-models; "Sub-model" opens the
 * saved-model picker.
 */
export const FormulaInsertPalette: React.FC<FormulaInsertPaletteProps> = ({
  variables,
  subModelNames,
  onInsert,
  onPickSubModel,
}) => {
  const [variableMenuAnchor, setVariableMenuAnchor] = useState<HTMLElement | null>(null);
  const named = variables.filter((v) => v.name);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 12 }}>
      {GROUPS.map((group) => (
        <div key={group.title}>
          <GroupTitle>{group.title}</GroupTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {group.buttons.map((button) => (
              <PaletteButtonBase key={button.label} wide={button.wide} onClick={() => onInsert(button.snippet)}>
                {button.label}
              </PaletteButtonBase>
            ))}
          </div>
        </div>
      ))}

      <div>
        <GroupTitle>Insert</GroupTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <GeodeMenu
            open={Boolean(variableMenuAnchor)}
            anchorEl={variableMenuAnchor}
            onClose={() => setVariableMenuAnchor(null)}
            // Keep focus in the formula editor (where the insert lands) instead of the trigger.
            disableRestoreFocus
            menuButton={
              <PaletteButtonBase wide onClick={(event) => setVariableMenuAnchor(event.currentTarget)}>
                @ variable
              </PaletteButtonBase>
            }
          >
            {named.length === 0 && subModelNames.length === 0 && (
              <GeodeMenuItem text='No variables yet — add one above' disabled />
            )}
            {named.map((v, i) => (
              <GeodeMenuItem
                // Duplicate names are possible while editing (the validator flags them).
                key={`var-${v.name}-${i}`}
                text={`@${v.name}   ${formatRange(v.min)} – ${formatRange(v.max)}`}
                onClick={() => onInsert(`@${v.name} `)}
              />
            ))}
            {subModelNames.map((name) => (
              <GeodeMenuItem key={`sub-${name}`} text={`@${name}   sub-model`} onClick={() => onInsert(`@${name} `)} />
            ))}
          </GeodeMenu>
          <PaletteButtonBase wide onClick={onPickSubModel}>
            Sub-model
          </PaletteButtonBase>
        </div>
      </div>
    </div>
  );
};

export default FormulaInsertPalette;
