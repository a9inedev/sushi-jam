export interface DecorItem {
  id: string;
  name: string;
  cost: number;
  desc: string;
}

export const DECOR: DecorItem[] = [
  { id: 'noren', name: 'Noren curtain', cost: 250, desc: 'Hangs above the counter.' },
  { id: 'lantern', name: 'Paper lanterns', cost: 300, desc: 'Two red lanterns by the kitchen.' },
  { id: 'plant', name: 'Bonsai', cost: 350, desc: 'A little tree inside the belt.' },
  { id: 'tank', name: 'Fish tank', cost: 500, desc: 'Live fish. Very fresh.' },
  { id: 'neon', name: 'Neon sign', cost: 800, desc: 'The house sign, glowing.' },
];
