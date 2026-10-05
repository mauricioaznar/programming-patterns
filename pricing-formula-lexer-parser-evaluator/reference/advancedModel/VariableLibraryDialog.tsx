import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { GeodeButton, GeodeCheckbox, GeodeDialog, TextField, Typography } from '@eog/geode-core';
import type { LibraryVariable } from '../../../shared/types';

const MONO = "'Roboto Mono', ui-monospace, monospace";

interface VariableLibraryDialogProps {
  open: boolean;
  onClose: () => void;
  variables: LibraryVariable[];
  isLoading: boolean;
  /** Names already on the model; shown but not selectable. */
  existingNames: Set<string>;
  onAdd: (selected: LibraryVariable[]) => void;
}

/** PS-11 "Add existing" — reuse variables already defined on other models. */
export const VariableLibraryDialog: React.FC<VariableLibraryDialogProps> = ({
  open,
  onClose,
  variables,
  isLoading,
  existingNames,
  onAdd,
}) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Start fresh every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelected(new Set());
  }, [open]);

  const rows = variables.filter((v) => v.name.includes(query.trim().toUpperCase()));

  const toggle = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const add = () => {
    onAdd(variables.filter((v) => selected.has(v.name)));
    onClose();
  };

  return (
    <GeodeDialog
      open={open}
      onClose={onClose}
      title='Add existing variables'
      subtitle='Variables you have already defined on other models'
      showCloseButton
      maxWidth='sm'
      fullWidth
      actions={
        <>
          <Typography variant='caption' sx={{ color: 'text.secondary', flex: 1 }}>
            {selected.size ? `${selected.size} selected` : 'Select the variables to reuse'}
          </Typography>
          <GeodeButton variant='outlined' onClick={onClose}>
            Cancel
          </GeodeButton>
          <GeodeButton variant='contained' disabled={selected.size === 0} onClick={add}>
            {selected.size ? `Add ${selected.size} variable${selected.size > 1 ? 's' : ''}` : 'Add'}
          </GeodeButton>
        </>
      }
    >
      <TextField
        size='small'
        placeholder='Search variables'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ width: '100%', mb: 1 }}
      />
      {isLoading && (
        <Typography variant='body2' sx={{ color: 'text.secondary', py: 2 }}>
          Loading variables…
        </Typography>
      )}
      {!isLoading && rows.length === 0 && (
        <Typography variant='body2' sx={{ color: 'text.secondary', py: 2 }}>
          No saved variables match that search.
        </Typography>
      )}
      {rows.map((v) => {
        const already = existingNames.has(v.name);
        return (
          <Box
            key={v.name}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              opacity: already ? 0.55 : 1,
            }}
          >
            <GeodeCheckbox
              size='small'
              checked={already || selected.has(v.name)}
              disabled={already}
              onChange={() => toggle(v.name)}
              inputProps={{ 'aria-label': `Select @${v.name}` }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
                <Box component='span' sx={{ fontFamily: MONO, fontSize: 12.5, color: 'primary.main' }}>
                  @{v.name}
                </Box>
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                  {v.min.toLocaleString('en-US')} – {v.max.toLocaleString('en-US')}
                </Typography>
                <Typography variant='caption' sx={{ color: 'text.secondary', ml: 'auto' }}>
                  {already
                    ? 'already on this model'
                    : `used on ${v.usedByModelCount} model${v.usedByModelCount === 1 ? '' : 's'}`}
                </Typography>
              </div>
              <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.25, fontSize: 12 }}>
                {v.description}
              </Typography>
            </div>
          </Box>
        );
      })}
    </GeodeDialog>
  );
};

export default VariableLibraryDialog;
