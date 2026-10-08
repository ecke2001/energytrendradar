'use client';

import { useEffect, useState } from 'react';
import { spotPriceData } from './dataLoader';
import { computePriceNow, storedPriceNow, type PriceNow } from './priceNow';

/**
 * Current spot price slot and tomorrow's average for the viewer's clock.
 * Renders the stored values first (identical to the static HTML, no hydration
 * mismatch) and switches to the live values after mount, refreshing every minute.
 */
export function usePriceNow(): PriceNow {
  const [state, setState] = useState<PriceNow>(() => storedPriceNow(spotPriceData));

  useEffect(() => {
    const update = () => setState(computePriceNow(spotPriceData, Math.floor(Date.now() / 1000)));
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  return state;
}
