'use client';

import { useEffect, useState } from 'react';
import { dataAsOf } from './dataLoader';
import { ageInHours, freshnessLevel, type FreshnessLevel } from './time';

/**
 * Age of the bundled data, computed in the visitor's browser. The static build
 * cannot know how old it will be when viewed, so this runs after hydration
 * (the server render always shows the neutral "unknown" state).
 */
export function useDataFreshness(): { level: FreshnessLevel; ageHours: number | null } {
  const [state, setState] = useState<{ level: FreshnessLevel; ageHours: number | null }>({ level: 'unknown', ageHours: null });

  useEffect(() => {
    const update = () => {
      const age = ageInHours(dataAsOf);
      setState({ level: freshnessLevel(age), ageHours: age });
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  return state;
}
