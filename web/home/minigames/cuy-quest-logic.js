/**
 * cuy-quest-logic.js — Pure game logic & 12-level campaign for Cuy Quest: Three Piggies.
 * Inspired by 3 Pandas & Snail Bob: switch between Kuki, Ned, and Glen, stack piggies,
 * click levers/fans/bridges, chew ropes, push crates, and reach the cozy house!
 */
(function (root) {
  'use strict';

  const COLS = 22;
  const ROWS = 16;

  const PIG_DEFS = [
    { id: 'kuki', name: 'Kuki', role: 'Tiny: fits in log tunnels', color: 0xf5a3a2, scale: 0.72, jumpVel: -245, speed: 95, canTunnel: true, canPush: false, canChew: false },
    { id: 'ned',  name: 'Ned',  role: 'Strong: pushes crates & heavy plates', color: 0xd26e3a, scale: 1.0, jumpVel: -215, speed: 78, canTunnel: false, canPush: true, canChew: false },
    { id: 'glen', name: 'Glen', role: 'Nimble: chews hay ropes & jumps high', color: 0xc7aa8a, scale: 0.88, jumpVel: -270, speed: 102, canTunnel: false, canPush: false, canChew: true }
  ];

  // Tile legend in ASCII maps:
  // '#' = grass ground (0), '=' = wood platform (1), 'B' = brick wall (2)
  // 'G' = goal house, 'S' = star clover
  // 'K'/'N'/'L' = spawn Kuki / Ned / Glen
  // 'p' = log tunnel (only Kuki), 'C' = pushable crate (only Ned)
  // 'R' = hay rope (chewed by Glen), 'M' = bouncy mushroom
  // '1'..'4' = clickable levers, 'a'..'d' = gates linked to levers 1..4
  // 'P' = heavy pressure plate, 'A' = gate linked to heavy plate P
  // 'F' = clickable fan (updraft 4 tiles high)

  const LEVELS = [
    {
      id: 1,
      chapter: 'Garden Burrows',
      title: '1. The Log Tunnel',
      hint: 'Kuki (1) fits through hollow log tunnels! Press 1/2/3 or click a pig to switch.',
      map: [
        'BBBBBBBBBBBBBBBBBBBBBB',
        'B....................B',
        'B....................B',
        'B............S.......B',
        'B..........=====.....B',
        'B....................B',
        'B....S...............B',
        'B..=====........a....B',
        'B...............a..S.B',
        'B.......1.......a==G=B',
        'B.......====..B.B....B',
        'B.............B.B....B',
        'B..K.N.L......p......B',
        '######################',
        '######################',
        '######################'
      ],
      links: { '1': ['a'] }
    },
    {
      id: 2,
      chapter: 'Garden Burrows',
      title: '2. Apple Crate',
      hint: 'Ned (2) is strong enough to push apple crates onto heavy plates!',
      map: [
        'BBBBBBBBBBBBBBBBBBBBBB',
        'B....................B',
        'B....................B',
        'B....................B',
        'B....................B',
        'B..........S.........B',
        'B........=====.......B',
        'B.................A..B',
        'B............S....A..B',
        'B..........=====..A.GB',
        'B......C..........====',
        'B.....===..P.........B',
        'B..K.N.L..====..S....B',
        '######################',
        '######################',
        '######################'
      ],
      links: { 'P': ['A'] }
    },
    {
      id: 3,
      chapter: 'Garden Burrows',
      title: '3. Chew the Rope',
      hint: 'Glen (3) can chew through hay ropes (press E near a rope) and jump high!',
      map: [
        'BBBBBBBBBBBBBBBBBBBBBB',
        'B....................B',
        'B......S.............B',
        'B.....===............B',
        'B....................B',
        'B..........R.........B',
        'B..........R......S..B',
        'B..........a.....===.B',
        'B..........a.........B',
        'B....M.....a......S.GB',
        'B...===....=========##',
        'B....................B',
        'B..K.N.L.............B',
        '######################',
        '######################',
        '######################'
      ],
      links: { 'R': ['a'] }
    },
    {
      id: 4,
      chapter: 'Garden Burrows',
      title: '4. Piggy Stack',
      hint: 'Walk close together and press E (Stack) to climb on each other!',
      map: [
        'BBBBBBBBBBBBBBBBBBBBBB',
        'B....................B',
        'B....................B',
        'B...........S........B',
        'B..........===.......B',
        'B....................B',
        'B...............S....B',
        'B..............====..B',
        'B....................B',
        'B.......S........a...B',
        'B......=====.....a..GB',
        'B............1...=====',
        'B..K.N.L....===......B',
        '######################',
        '######################',
        '######################'
      ],
      links: { '1': ['a'] }
    },
    {
      id: 5,
      chapter: 'Barn Contraptions',
      title: '5. Barn Breeze',
      hint: 'Click fans to toggle updrafts and float piggies up to high lofts!',
      map: [
        'BBBBBBBBBBBBBBBBBBBBBB',
        'B....................B',
        'B.......S............B',
        'B......====..........B',
        'B....................B',
        'B..............S.....B',
        'B.............====...B',
        'B....................B',
        'B....F...............B',
        'B...====......a......B',
        'B.............a...S.GB',
        'B.......1.....a=======',
        'B..K.N.L====.........B',
        '######################',
        '######################',
        '######################'
      ],
      links: { '1': ['a'] }
    },
    {
      id: 6,
      chapter: 'Barn Contraptions',
      title: '6. Twin Locks',
      hint: 'Combine Kuki in the tunnel and Ned on the crate plate!',
      map: [
        'BBBBBBBBBBBBBBBBBBBBBB',
        'B....................B',
        'B....................B',
        'B.....S..............B',
        'B....===.............B',
        'B............a.......B',
        'B.......1....a...S...B',
        'B......====..a..====.B',
        'B............b.......B',
        'B...C........b.....S.B',
        'B..===..P....b....==GB',
        'B......===...B.......B',
        'B..K.N.L.....p.......B',
        '######################',
        '######################',
        '######################'
      ],
      links: { '1': ['a'], 'P': ['b'] }
    },
    {
      id: 7,
      chapter: 'Barn Contraptions',
      title: '7. Mushroom Loft',
      hint: 'Bounce on pink mushrooms and chew the hay rope to drop the bridge!',
      map: [
        'BBBBBBBBBBBBBBBBBBBBBB',
        'B....................B',
        'B........S...........B',
        'B.......===..........B',
        'B.............R......B',
        'B.............R...S..B',
        'B......M......a..===.B',
        'B.....====....a......B',
        'B.............a......B',
        'B..M..........a...S.GB',
        'B.===...F.....========',
        'B......===...........B',
        'B..K.N.L.............B',
        '######################',
        '######################',
        '######################'
      ],
      links: { 'R': ['a'] }
    },
    {
      id: 8,
      chapter: 'Barn Contraptions',
      title: '8. Wind & Weight',
      hint: 'Use the fan to lift a crate or piggie across the barn rafters!',
      map: [
        'BBBBBBBBBBBBBBBBBBBBBB',
        'B....................B',
        'B............S.......B',
        'B...........===......B',
        'B....................B',
        'B......C.............B',
        'B.....====....P......B',
        'B............====..A.B',
        'B....F.............A.B',
        'B...===......S.....A.B',
        'B...........===....AGB',
        'B..............S...===',
        'B..K.N.L......===....B',
        '######################',
        '######################',
        '######################'
      ],
      links: { 'P': ['A'] }
    },
    {
      id: 9,
      chapter: 'Night Park Locks',
      title: '9. Park Fountain',
      hint: 'Two levers, one tunnel, and three piggies working together.',
      map: [
        'BBBBBBBBBBBBBBBBBBBBBB',
        'B....................B',
        'B.......S............B',
        'B......===...........B',
        'B.............2......B',
        'B............===.....B',
        'B....................B',
        'B....1..........a.b..B',
        'B...===....S....a.b..B',
        'B.........===...a.bSGB',
        'B...............======',
        'B..........B.........B',
        'B..K.N.L...p.........B',
        '######################',
        '######################',
        '######################'
      ],
      links: { '1': ['a'], '2': ['b'] }
    },
    {
      id: 10,
      chapter: 'Night Park Locks',
      title: '10. Rope & Crate',
      hint: 'Glen cuts the upper rope while Ned pushes the lower crate.',
      map: [
        'BBBBBBBBBBBBBBBBBBBBBB',
        'B....................B',
        'B.........R..........B',
        'B.........R...S......B',
        'B....M....a..===.....B',
        'B...===...a..........B',
        'B.........a..........B',
        'B.........a.......b..B',
        'B.....C...........bS.B',
        'B....===....P.....b=GB',
        'B..........====...====',
        'B....S...............B',
        'B..K.N.L.............B',
        '######################',
        '######################',
        '######################'
      ],
      links: { 'R': ['a'], 'P': ['b'] }
    },
    {
      id: 11,
      chapter: 'Night Park Locks',
      title: '11. Fan Relay',
      hint: 'Chain two updraft fans and a log tunnel to reach the lantern house!',
      map: [
        'BBBBBBBBBBBBBBBBBBBBBB',
        'B....................B',
        'B..............S.....B',
        'B.............===....B',
        'B....................B',
        'B........F...........B',
        'B.......===......a...B',
        'B................a.S.B',
        'B....F.......1...a==GB',
        'B...===.....===..=====',
        'B................B...B',
        'B.......S........p...B',
        'B..K.N.L===..........B',
        '######################',
        '######################',
        '######################'
      ],
      links: { '1': ['a'] }
    },
    {
      id: 12,
      chapter: 'Night Park Locks',
      title: '12. Grand Finale',
      hint: 'Use all three piggies, crates, ropes, fans, and tunnels to get home!',
      map: [
        'BBBBBBBBBBBBBBBBBBBBBB',
        'B....................B',
        'B......S.............B',
        'B.....===....R.......B',
        'B............R...S...B',
        'B....M.......a..===..B',
        'B...===......a.......B',
        'B.........1..a..b..c.B',
        'B....C...===.a..b..c.B',
        'B...===......P..b..cGB',
        'B...........===.======',
        'B....F......B........B',
        'B..K.N.L....p...S....B',
        '######################',
        '######################',
        '######################'
      ],
      links: { 'R': ['a'], '1': ['b'], 'P': ['c'] }
    }
  ];

  function parseLevel(levelIndex) {
    const def = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, levelIndex))];
    const solids = [];
    const tunnels = [];
    const gates = {};
    const levers = [];
    const fans = [];
    const plates = [];
    const ropes = [];
    const crates = [];
    const mushrooms = [];
    const stars = [];
    const pigSpawns = {};
    let goal = { col: 19, row: 12 };

    for (let r = 0; r < def.map.length; r++) {
      const line = def.map[r];
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (ch === '#' || ch === '=' || ch === 'B') {
          solids.push({ col: c, row: r, tile: ch === '#' ? 0 : (ch === '=' ? 1 : 2) });
        } else if (ch === 'p') {
          tunnels.push({ col: c, row: r });
        } else if (ch >= 'a' && ch <= 'd' || ch === 'A') {
          const key = ch;
          if (!gates[key]) gates[key] = [];
          gates[key].push({ col: c, row: r, open: false });
        } else if (ch >= '1' && ch <= '4') {
          levers.push({ id: ch, col: c, row: r, on: false });
        } else if (ch === 'F') {
          fans.push({ id: `fan_${c}_${r}`, col: c, row: r, on: false });
        } else if (ch === 'P') {
          plates.push({ id: 'P', col: c, row: r, pressed: false });
        } else if (ch === 'R') {
          ropes.push({ col: c, row: r, intact: true });
        } else if (ch === 'C') {
          crates.push({ col: c, row: r });
        } else if (ch === 'M') {
          mushrooms.push({ col: c, row: r });
        } else if (ch === 'S') {
          stars.push({ col: c, row: r, collected: false });
        } else if (ch === 'G') {
          goal = { col: c, row: r };
        } else if (ch === 'K') {
          pigSpawns.kuki = { col: c, row: r };
        } else if (ch === 'N') {
          pigSpawns.ned = { col: c, row: r };
        } else if (ch === 'L') {
          pigSpawns.glen = { col: c, row: r };
        }
      }
    }

    return {
      def,
      cols: COLS,
      rows: ROWS,
      solids,
      tunnels,
      gates,
      levers,
      fans,
      plates,
      ropes,
      crates,
      mushrooms,
      stars,
      pigSpawns,
      goal
    };
  }

  function calculateStars(starsCollected, elapsedSec) {
    if (starsCollected >= 3) return 3;
    if (starsCollected === 2 || elapsedSec <= 45) return 2;
    return 1;
  }

  root.CuyQuestLogic = {
    COLS,
    ROWS,
    PIG_DEFS,
    LEVELS,
    parseLevel,
    calculateStars
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.CuyQuestLogic;
  }
})(typeof window !== 'undefined' ? window : globalThis);
