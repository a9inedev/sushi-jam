/* Hand-authored wall boards. Tokens are colour index + direction (^ > v <), '.' is empty. */
export const AUTHORED: Record<number, string[]> = {
  10: ['0v 1v 2v 3v', '4< 0< 1> 2>', '3< 4< 0< 1<', '2< 3< 4> 0>', '1< 2< 3< 4<'],
  20: [
    '0v 1v 2v 3v 4v 5v',
    '6< 0< 1< 2< 3< 4<',
    '5> 6> 0> 1> 2> 3>',
    '4< 5< 6< 0< 1< 2<',
    '3> 4> 5> 6> 0> 1>',
    '2< 3< 4< 5< 6< 0<',
  ],
  30: [
    '0^ 1v 2^ 3v 4^ 5v',
    '6^ 0v 1^ 2v 3^ 4v',
    '5^ 6v 0^ 1v 2^ 3v',
    '4^ 5v 6^ 0v 1^ 2v',
    '3^ 4v 5^ 6v 0^ 1v',
    '2^ 3v 4^ 5v 6^ 0v',
  ],
};
