import { useEffect, useState } from 'react';
import { fetchSavedModels, fetchVariableLibrary } from '../../../mocks/models';
import type { LibraryVariable, SavedModel } from '../../../shared/types';

/** Loads the saved-model and variable libraries for the Advanced Model editor. */
export function useModelLibrary() {
  const [savedModels, setSavedModels] = useState<SavedModel[]>([]);
  const [variableLibrary, setVariableLibrary] = useState<LibraryVariable[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // TODO: fetchSavedModels/fetchVariableLibrary read the mock libraries — swap for the real endpoints once they exist.
    Promise.all([fetchSavedModels(), fetchVariableLibrary()]).then(([models, variables]) => {
      if (cancelled) return;
      setSavedModels(models);
      setVariableLibrary(variables);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { savedModels, variableLibrary, isLoading };
}
