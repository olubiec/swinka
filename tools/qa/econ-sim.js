#!/usr/bin/env node
// Clover economy simulator (D2e-D4e): free sources, fixed sinks and a simple buying policy for three player profiles.
// Usage (repo root): node tools/qa/econ-sim.js [--days 365] [--seed 1] [--csv <dir>] [--repeat-records]
// --csv <dir>        writes one CSV per profile (day by day) into <dir>, e.g. tools/qa/out/econ (git-ignored) or a scratch folder
// --repeat-records   after the one-time goals, the surplus buys common records again (an endless sink, off by default)
// Reads assets/data/{economy,farm,market,world_items,places,achievements,actions}.json and assets/records/*.json.
// Prices of records and players come only from web/home/features/music/prices.js (TODO-D3 values, not tuned here).
// Model numbers marked ASSUMPTION are not in the data: they are the profile behaviour, to be confirmed by the human (D5e).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', f), 'utf8'));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const DAYS = Number(opt('days', 365));
const SEED = Number(opt('seed', 1));
const CSV_DIR = opt('csv', null);
const REPEAT_RECORDS = opt('repeat-records', false) === true;
// Sensitivity: overrides the number of days over which the achievement rewards arrive (e.g. 100000 = almost none).
const ACH_DAYS = opt('ach-days', null);

const Prices = require(path.join(ROOT, 'web', 'home', 'features', 'music', 'prices.js'));
const econ = J('economy.json');
const farm = J('farm.json');
const market = J('market.json');
const worldItems = J('world_items.json').items;
const places = J('places.json').places;
const achievements = J('achievements.json').achievements;
const birthdayReward = (J('actions.json').events || {}).birthday?.reward_clovers || 100;
const playerDesign = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'records', 'players_design.json'), 'utf8'));

// ---- profiles (ASSUMPTION: behaviour; data-derived caps come from economy.json and market.json) ----
const PROFILES = {
  casual: {
    label: 'casual 10 min/day', gamesPerDay: 2, gameScore: 150, pictures: 0, cellsPerPicture: 0, careTasks: 2,
    poopsPerDay: 3, cleanShare: 0.8, skipEvery: 7, food: 10, seedsPerDay: 0, harvestSales: 5, achievementDays: 120,
  },
  regular: {
    label: 'regular 1 h/day', gamesPerDay: 6, gameScore: 300, pictures: 1, cellsPerPicture: 400, careTasks: 4,
    poopsPerDay: 8, cleanShare: 1, skipEvery: 0, food: 25, seedsPerDay: 3, harvestSales: 15, achievementDays: 60,
  },
  grinder: {
    label: 'grinder 4 h/day, every cap', gamesPerDay: 10, gameScore: 450, pictures: 5, cellsPerPicture: 1000, careTasks: 6,
    poopsPerDay: 8, cleanShare: 1, skipEvery: 0, food: 35, seedsPerDay: 6, harvestSales: 30, achievementDays: 30,
  },
};

// ---- one-time goals, in buying order (music first, then the home and the farm) ----
// Each goal: { id, kind, price }. Records are not one-time (copies), so they are listed by hand.
function buildGoals() {
  const goals = [];
  const cheapRecord = { id: 'record_common', kind: 'record', price: Prices.recordPrice('common') };
  const rareRecord = { id: 'record_rare', kind: 'record', price: Prices.recordPrice('rare') };
  const players = Object.keys(playerDesign.players).filter((id) => !playerDesign.players[id].start_owned)
    .map((id) => ({ id, kind: 'player', price: Prices.playerPrice(id) }))
    .sort((a, b) => a.price - b.price);
  // alternate: a record, then the next player, then a record... (one copy each, the policy skips repeats)
  goals.push({ ...cheapRecord, id: 'record_common#1' });
  goals.push(players[0]);
  goals.push({ ...cheapRecord, id: 'record_common#2' });
  goals.push(players[1]);
  goals.push({ ...rareRecord, id: 'record_rare#1' });
  goals.push(players[2]);
  goals.push(players[3]);
  goals.push(players[4]);
  for (const p of places) if (p.cost) goals.push({ id: 'place_' + p.id, kind: 'place', price: p.cost });
  for (const pack of farm.plot_packs) goals.push({ id: 'plot_pack_' + pack.cost, kind: 'farm', price: pack.cost });
  for (const o of farm.orchard_slots) goals.push({ id: 'orchard_' + o.cost, kind: 'farm', price: o.cost });
  for (const it of worldItems) if (it.price > 0) goals.push({ id: 'world_' + it.id, kind: 'world', price: it.price });
  return goals;
}
const GOALS_TEMPLATE = buildGoals();

// Seed price: average of the annual crops (the cheap ones the player replants; perennials cost 60-140 and are rare buys).
const annuals = farm.crops.filter((c) => c.kind === 'annual');
const avgSeed = annuals.reduce((s, c) => s + c.seed_price, 0) / annuals.length;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Simulates one profile. Returns the daily rows and summary numbers.
function simulate(name, days, seed) {
  const P = PROFILES[name];
  const rand = rng(seed + name.length * 7919);
  const goals = GOALS_TEMPLATE.map((g) => ({ ...g }));
  const soldMarketCap = market.daily_sales_cap_clovers;
  const rewardedGames = econ.minigame.rewarded_games_per_day;
  const gameCap = econ.minigame.max_clovers_per_day;
  const achievementTotal = achievements.reduce((s, a) => s + (a.reward || 0), 0);
  const achDays = ACH_DAYS ? Number(ACH_DAYS) : P.achievementDays;
  const achievementPerDay = achievementTotal / achDays;
  let balance = econ.starting_clovers;
  let streak = 0, lastGiftDay = null, pendingBirthdays = 0, achievementsPaid = 0;
  let shortfall = 0, firstSpend = null, firstRecord = null, firstPlayer = null, sinks = { food: 0, seeds: 0, goals: 0, repeats: 0 };
  let opened = 0, freeDaysZero = 0;
  let lastPigAgeYears = 0;
  const bought = [];
  const rows = [];
  let goalIdx = 0;

  for (let day = 1; day <= days; day++) {
    const row = { day, opened: 0, gift: 0, minigame: 0, coloring: 0, care: 0, poop: 0, birthday: 0, achievement: 0, market: 0 };
    // pig age: 21 pig days per real day, so one birthday every 365.25 / 21 real days
    const ageYears = Math.floor((day * 21) / 365.25);
    if (ageYears > lastPigAgeYears) { pendingBirthdays += ageYears - lastPigAgeYears; lastPigAgeYears = ageYears; }

    const skip = P.skipEvery > 0 && day % P.skipEvery === 0;
    if (!skip) {
      opened = 1; row.opened = 1;
      // daily gift: amount = base + per_streak_day * (streak - 1), capped; a missed day resets the streak
      if (lastGiftDay === null || day - lastGiftDay > econ.daily_gift.streak_resets_after_missed_days) streak = 0;
      streak += 1;
      row.gift = Math.min(econ.daily_gift.max, econ.daily_gift.base + econ.daily_gift.per_streak_day * (streak - 1));
      lastGiftDay = day;

      // minigames: score x jitter, points / 10 per clover, max 40 per game, daily cap 150
      let gameClovers = 0;
      for (let g = 0; g < Math.min(P.gamesPerDay, rewardedGames); g++) {
        const score = Math.round(P.gameScore * (0.85 + 0.3 * rand()));
        const c = Math.min(econ.minigame.max_per_game, Math.floor(score / econ.minigame.points_per_clover));
        gameClovers += c;
      }
      row.minigame = Math.min(gameCap, gameClovers);

      // coloring: cells / 40, clamped to 5..25 per picture, 5 pictures a day
      for (let k = 0; k < Math.min(P.pictures, econ.coloring.rewarded_pictures_per_day); k++) {
        const cells = Math.round(P.cellsPerPicture * (0.9 + 0.2 * rand()));
        row.coloring += Math.min(econ.coloring.max_per_picture, Math.max(econ.coloring.min_per_picture, Math.floor(cells / econ.coloring.cells_per_clover)));
      }

      // care tasks: 5 each, at most 6 a day
      row.care = Math.min(econ.care_task.max_per_day, P.careTasks) * econ.care_task.clovers;

      // poops: 1 clover per poop cleaned
      row.poop = Math.floor(P.poopsPerDay * P.cleanShare);

      // birthdays wait for the first open after them
      row.birthday = pendingBirthdays * birthdayReward; pendingBirthdays = 0;

      // achievements: the total spread evenly over the profile's achievement days
      if (day <= achDays) { row.achievement = Math.round(achievementPerDay); achievementsPaid += row.achievement; }

      // market: the farm harvest sold within the daily cap (demand meter not modelled)
      row.market = Math.min(soldMarketCap, Math.round(P.harvestSales * (0.85 + 0.3 * rand())));
    }

    const free = row.gift + row.minigame + row.coloring + row.care + row.poop + row.birthday + row.achievement + row.market;
    if (row.opened && free === 0) freeDaysZero++;
    row.free = free;
    balance += free;

    // fixed sinks, every day: food for the pig, seeds for the farm (paid from the balance, never below 0)
    const seeds = Math.round(P.seedsPerDay * avgSeed);
    const fixed = P.food + seeds;
    const paidFixed = Math.min(balance, fixed);
    balance -= paidFixed;
    shortfall += fixed - paidFixed;
    sinks.food += Math.min(P.food, paidFixed);
    sinks.seeds += paidFixed - Math.min(P.food, paidFixed);
    row.food = P.food; row.seeds = seeds;

    // buying: only on an open day, only the surplus above a 2-day reserve of fixed costs
    const reserve = 2 * fixed;
    let spent = 0;
    let bought_today = [];
    if (!skip) {
      while (goalIdx < goals.length && balance - reserve >= goals[goalIdx].price) {
        const g = goals[goalIdx++];
        balance -= g.price; spent += g.price; sinks.goals += g.price;
        bought.push({ day, id: g.id, price: g.price });
        bought_today.push(g.id);
        if (firstSpend === null) firstSpend = day;
        if (g.kind === 'record' && firstRecord === null) firstRecord = day;
        if (g.kind === 'player' && firstPlayer === null) firstPlayer = day;
      }
      if (REPEAT_RECORDS && goalIdx >= goals.length) {
        const price = Prices.recordPrice('common');
        while (balance - reserve >= price) {
          balance -= price; spent += price; sinks.repeats += price;
          bought.push({ day, id: 'record_common_copy', price });
          if (firstSpend === null) firstSpend = day;
        }
      }
    }
    row.spent = spent;
    row.bought = bought_today.join(';');
    row.balance = balance;
    row.shortfall = shortfall;
    rows.push(row);
  }

  const at = (d) => (rows[d - 1] ? rows[d - 1].balance : null);
  const sum = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0);
  const income = rows.reduce((s, r) => s + r.free, 0);
  return {
    name, label: P.label, days,
    firstSpendDay: firstSpend, firstRecordDay: firstRecord, firstPlayerDay: firstPlayer,
    goalsBought: bought.length, goalsLeft: goals.length - goalIdx,
    balance: { d30: at(30), d90: at(90), d365: at(365), end: balance },
    income: {
      total: income, gift: sum('gift'), minigame: sum('minigame'), coloring: sum('coloring'), care: sum('care'),
      poop: sum('poop'), birthday: sum('birthday'), achievement: sum('achievement'), market: sum('market'),
    },
    sinks,
    shortfall,
    openDays: opened ? rows.filter((r) => r.opened).length : 0,
    openDaysWithoutFreeSource: freeDaysZero,
    rows,
  };
}

const CSV_COLS = ['day', 'opened', 'gift', 'minigame', 'coloring', 'care', 'poop', 'birthday', 'achievement', 'market', 'free', 'food', 'seeds', 'spent', 'bought', 'balance', 'shortfall'];
function toCsv(rows) {
  return [CSV_COLS.join(',')].concat(rows.map((r) => CSV_COLS.map((c) => (r[c] === undefined ? '' : r[c])).join(','))).join('\n') + '\n';
}

function main() {
  const names = Object.keys(PROFILES);
  const results = names.map((n) => simulate(n, DAYS, SEED));
  const report = {};
  const hash = crypto.createHash('sha1');
  for (const r of results) {
    const csv = toCsv(r.rows);
    hash.update(csv);
    report[r.name] = { ...r, rows: undefined };
    if (CSV_DIR) {
      fs.mkdirSync(CSV_DIR, { recursive: true });
      fs.writeFileSync(path.join(CSV_DIR, `econ_${r.name}.csv`), csv);
    }
  }
  const out = { seed: SEED, days: DAYS, repeatRecords: REPEAT_RECORDS, achDays: ACH_DAYS, avgSeed, csvSha1: hash.digest('hex'), profiles: report };
  console.log(JSON.stringify(out, null, 2));
}

if (require.main === module) main();
module.exports = { simulate, PROFILES, buildGoals };
