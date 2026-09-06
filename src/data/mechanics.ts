import type { MechKind } from '../engine/types';

/** Level at which each rule first appears. */
export const MECH_UNLOCK: Record<MechKind, number> = {
  wasabi: 21,
  covered: 31,
  vip: 41,
  lock: 51,
  frozen: 61,
  double: 71,
};

export const MECH_INFO: Record<MechKind, { title: string; text: string }> = {
  wasabi: {
    title: 'Wasabi plate',
    text: 'It spoils when its timer runs out. Seat a diner of its colour before that happens.',
  },
  covered: {
    title: 'Covered plate',
    text: 'Its colour hides once on the belt for one full loop. Memorise it in the kitchen window.',
  },
  vip: { title: 'VIP guests', text: 'Gold guests only eat gold plates, and nobody else will touch them.' },
  lock: {
    title: 'Chopstick lock',
    text: 'A locked diner cannot move until a diner of the shown colour has been served.',
  },
  frozen: { title: 'Frozen dessert', text: 'Tap a frozen diner three times to crack the ice before they can move.' },
  double: {
    title: 'Double-decker',
    text: 'A stacked plate fills two appetite points at once. Only a diner still needing two can take it.',
  },
};
