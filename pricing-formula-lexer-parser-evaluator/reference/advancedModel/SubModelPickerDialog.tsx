import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { GeodeButton, GeodeDialog, TextField, Typography } from '@eog/geode-core';
import type { SavedModel } from '../../../shared/types';

const MONO = "'Roboto Mono', ui-monospace, monospace";

interface SubModelPickerDialogProps {
  open: boolean;
  onClose: () => void;
  models: SavedModel[];
  isLoading: boolean;
  /** Variable names already on the model, to preview which ones will be mapped in. */
  currentVariableNames: Set<string>;
  onSelect: (model: SavedModel) => void;
}

/**
 * "Insert sub-model" — pick a saved model to reference by name. Previews its
 * variables and formula, and which variables will be added to this model.
 */
export const SubModelPickerDialog: React.FC<SubModelPickerDialogProps> = ({
  open,
  onClose,
  models,
  isLoading,
  currentVariableNames,
  onSelect,
}) => {
  const [query, setQuery] = useState('');
  const [pickedName, setPickedName] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setPickedName(null);
  }, [open]);

  const list = models.filter((m) => m.name.includes(query.trim().toUpperCase()));
  // Default to the first model, like the reference.
  const picked = models.find((m) => m.name === pickedName) ?? list[0] ?? null;
  const shared = picked ? picked.variables.filter((v) => currentVariableNames.has(v.name)) : [];
  const added = picked ? picked.variables.filter((v) => !currentVariableNames.has(v.name)) : [];

  const select = () => {
    if (!picked) return;
    onSelect(picked);
    onClose();
  };

  return (
    <GeodeDialog
      open={open}
      onClose={onClose}
      title='Insert sub-model'
      subtitle='Saved models are referenced by name · their variables are mapped automatically'
      showCloseButton
      maxWidth='md'
      fullWidth
      // The chosen model is inserted into the formula editor; keep focus there.
      disableRestoreFocus
      actions={
        <>
          <Typography variant='caption' sx={{ color: 'text.secondary', flex: 1 }}>
            {picked &&
              `${shared.length ? `${shared.length} variable${shared.length > 1 ? 's' : ''} already mapped` : 'No shared variables yet'}${
                added.length ? ` · ${added.map((v) => `@${v.name}`).join(', ')} will be added to this model` : ''
              }`}
          </Typography>
          <GeodeButton variant='outlined' onClick={onClose}>
            Cancel
          </GeodeButton>
          <GeodeButton variant='contained' disabled={!picked} onClick={select}>
            Select
          </GeodeButton>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) minmax(0, 1fr)', gap: 16, minHeight: 320 }}>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <TextField
            size='small'
            placeholder='Search models'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ width: '100%', mb: 1 }}
          />
          <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: 360, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            {isLoading && (
              <Typography variant='body2' sx={{ color: 'text.secondary', p: 2 }}>
                Loading models…
              </Typography>
            )}
            {!isLoading && list.length === 0 && (
              <Typography variant='body2' sx={{ color: 'text.secondary', p: 2 }}>
                No models match that search.
              </Typography>
            )}
            {list.map((m) => {
              const active = picked?.name === m.name;
              return (
                <Box
                  key={m.name}
                  component='button'
                  type='button'
                  onClick={() => setPickedName(m.name)}
                  sx={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    px: 2,
                    py: 1.25,
                    border: 'none',
                    borderLeft: 3,
                    borderLeftColor: active ? 'primary.main' : 'transparent',
                    bgcolor: active ? 'action.selected' : 'transparent',
                    color: 'text.primary',
                    font: 'inherit',
                    fontSize: 13.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: active ? 'action.selected' : 'action.hover' },
                  }}
                >
                  {m.name}
                </Box>
              );
            })}
          </Box>
        </div>

        <div style={{ minWidth: 0 }}>
          {!picked ? (
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              Select a model to preview its formula.
            </Typography>
          ) : (
            <>
              <Typography variant='h6' sx={{ fontWeight: 500, mb: 1.5 }}>
                {picked.name}
              </Typography>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {picked.variables.map((v) => (
                  <Box
                    key={v.name}
                    component='span'
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 4,
                      bgcolor: 'action.hover',
                      fontFamily: MONO,
                      fontSize: 12,
                      color: 'text.secondary',
                    }}
                  >
                    @{v.name}
                    <span style={{ fontFamily: 'inherit', opacity: 0.8 }}>
                      {v.min.toLocaleString('en-US')} – {v.max.toLocaleString('en-US')}
                    </span>
                  </Box>
                ))}
              </div>
              <Box
                component='pre'
                sx={{
                  m: 0,
                  pt: 2,
                  borderTop: 1,
                  borderColor: 'divider',
                  fontFamily: MONO,
                  fontSize: 13,
                  lineHeight: 1.85,
                  whiteSpace: 'pre-wrap',
                  color: 'text.primary',
                }}
              >
                {picked.formula}
              </Box>
            </>
          )}
        </div>
      </div>
    </GeodeDialog>
  );
};

export default SubModelPickerDialog;
