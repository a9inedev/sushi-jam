import type { MechKind } from '../engine/types';

/** Level at which each rule first appears. */
export const MECH_UNLOCK: Record<MechKind, number> = {
  wasabi: 21,
  covered: 31,
  vip: 41,
  lock: 51,
  frozen: 61,
  double: 71,
  chain: 81,
  rush: 91,
  special: 101,
  picky: 111,
  reserved: 121,
  reverse: 131,
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
  chain: {
    title: 'Chained seats',
    text: 'Two stools share one queue. The back stool only waits: its guest eats after the front guest leaves.',
  },
  rush: {
    title: 'Rush hour',
    text: 'When the bell rings, plates come faster and the belt speeds up for fifteen seconds.',
  },
  special: {
    title: "Chef's special",
    text: 'A bonus plate any guest may take. VIPs and ticket guests refuse it. The chef takes back what it replaces.',
  },
  picky: {
    title: 'Ticket guest',
    text: 'Their plates are made to order and arrive in the printed sequence. Nobody else can take them.',
  },
  reserved: {
    title: 'Reserved seat',
    text: 'The marked stool only takes guests of its colour. Everyone else needs another seat.',
  },
  reverse: {
    title: 'Belt reversal',
    text: 'Every so often the belt runs backwards. Plates that reach the kitchen door go back inside for a while.',
  },
};
