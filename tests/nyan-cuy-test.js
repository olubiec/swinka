const assert = require('assert');
const { createNyanState, updateNyan, checkAABB, DEFAULT_POINTS } = require('../web/home/minigames/nyan-cuy-logic.js');

console.log('Running Nyan Cuy unit tests...\n');

// 1. Test initialization default values
{
    const state = createNyanState();

    assert.strictEqual(state.width, 360, 'Default width should be 360');
    assert.strictEqual(state.height, 290, 'Default height should be 290');

    assert.deepStrictEqual(state.pig, {
        x: 80,
        y: 140,
        vy: 0,
        w: 32,
        h: 20,
        dead: false
    }, 'Default pig parameters should match specification');

    assert.strictEqual(state.gravity, 450, 'Default gravity should be 450');
    assert.strictEqual(state.flapForce, 190, 'Default flapForce should be 190');
    assert.strictEqual(state.score, 0, 'Default score should be 0');
    assert.strictEqual(state.distance, 0, 'Default distance should be 0');
    assert.strictEqual(state.gameOver, false, 'Default gameOver should be false');

    assert.ok(Array.isArray(state.rainbow), 'rainbow should be an array');
    assert.strictEqual(state.rainbow.length, 0, 'rainbow should initialize empty');

    assert.ok(Array.isArray(state.treats), 'treats should be an array');
    assert.strictEqual(state.treats.length, 0, 'treats should initialize empty');

    assert.ok(Array.isArray(state.obstacles), 'obstacles should be an array');
    assert.strictEqual(state.obstacles.length, 0, 'obstacles should initialize empty');

    assert.strictEqual(state.speed, 120, 'Default speed should be 120');

    // Test overrides with custom config
    const custom = createNyanState({
        width: 400,
        height: 300,
        pig: { x: 50, y: 100, vy: -10, dead: false },
        speed: 150
    });
    assert.strictEqual(custom.width, 400);
    assert.strictEqual(custom.height, 300);
    assert.strictEqual(custom.pig.x, 50);
    assert.strictEqual(custom.pig.y, 100);
    assert.strictEqual(custom.pig.vy, -10);
    assert.strictEqual(custom.speed, 150);

    console.log('✓ Test initialization default values passed.');
}

// 2. Test gravity accelerates pig downwards over time
{
    const state = createNyanState();
    const initialY = state.pig.y;
    const dt = 0.1;

    updateNyan(state, {}, dt);

    // vy = 0 + 450 * 0.1 = 45
    assert.strictEqual(state.pig.vy, 45, 'vy should increase by gravity * dt');
    // y = 140 + 45 * 0.1 = 144.5
    assert.strictEqual(state.pig.y, initialY + 45 * dt, 'pig.y should update with vy * dt');
    assert.ok(state.pig.y > initialY, 'Pig should move downwards due to gravity');

    // Next step
    updateNyan(state, {}, dt);
    assert.strictEqual(state.pig.vy, 90, 'vy should continue accelerating');
    assert.ok(state.pig.y > initialY + 4.5, 'Pig should accelerate downwards further');

    console.log('✓ Test gravity accelerates pig downwards over time passed.');
}

// 3. Test flap imparts upward impulse
{
    const state = createNyanState();
    state.pig.vy = 80; // falling downward

    const dt = 0.016;
    updateNyan(state, { flap: true }, dt);

    // vy should be reset to -flapForce then gravity applied for dt: -190 + 450 * 0.016 = -182.8
    assert.ok(state.pig.vy < 0, 'Flap should impart negative (upward) vertical velocity');
    assert.ok(Math.abs(state.pig.vy - (-190 + 450 * dt)) < 0.001, 'vy should reflect -flapForce + gravity * dt');

    // Test that dead pig cannot flap
    state.pig.dead = true;
    state.pig.vy = 50;
    updateNyan(state, { flap: true }, dt);
    assert.ok(state.pig.vy > 50, 'Dead pig should not respond to flap input');

    console.log('✓ Test flap imparts upward impulse passed.');
}

// 4. Test floor collision causes gameOver
{
    const state = createNyanState();
    // Floor threshold: state.height - 25 = 290 - 25 = 265
    state.pig.y = state.height - 24; // Beyond threshold
    state.pig.vy = 10;

    updateNyan(state, {}, 0.016);

    assert.strictEqual(state.gameOver, true, 'Reaching floor threshold must set gameOver = true');
    assert.strictEqual(state.pig.dead, true, 'Reaching floor threshold must set pig.dead = true');

    console.log('✓ Test floor collision causes gameOver passed.');
}

// 5. Test treat collision increases score
{
    const state = createNyanState();
    const treat = {
        id: 't-carrot-1',
        x: state.pig.x + 2,
        y: state.pig.y + 2,
        type: 'carrot',
        points: 20,
        collected: false
    };
    state.treats.push(treat);

    const events = updateNyan(state, {}, 0.016);

    assert.strictEqual(state.score, 20, 'Score should increase by treat points (20)');
    assert.strictEqual(treat.collected, true, 'Treat should be marked collected = true');
    assert.ok(events.includes('treat'), 'Events should include "treat" event');

    // Test that already collected treat does not increase score again
    updateNyan(state, {}, 0.016);
    assert.strictEqual(state.score, 20, 'Score should not increase again for already collected treat');

    // Test default points for parsley (10) and berry (50)
    const state2 = createNyanState();
    state2.treats.push({
        id: 't-parsley-1',
        x: state2.pig.x,
        y: state2.pig.y,
        type: 'parsley',
        collected: false
    });
    updateNyan(state2, {}, 0.016);
    assert.strictEqual(state2.score, 10, 'Parsley should default to 10 points');

    const state3 = createNyanState();
    state3.treats.push({
        id: 't-berry-1',
        x: state3.pig.x,
        y: state3.pig.y,
        type: 'berry',
        collected: false
    });
    updateNyan(state3, {}, 0.016);
    assert.strictEqual(state3.score, 50, 'Berry should default to 50 points');

    console.log('✓ Test treat collision increases score passed.');
}

// 6. Test obstacle collision causes gameOver
{
    const state = createNyanState();
    const obstacle = {
        id: 'obs-1',
        x: state.pig.x + 5,
        y: state.pig.y + 2,
        w: 20,
        h: 20
    };
    state.obstacles.push(obstacle);

    const events = updateNyan(state, {}, 0.016);

    assert.strictEqual(state.gameOver, true, 'Obstacle collision must set gameOver = true');
    assert.strictEqual(state.pig.dead, true, 'Obstacle collision must set pig.dead = true');
    assert.ok(events.includes('crash'), 'Events should include "crash" event');

    console.log('✓ Test obstacle collision causes gameOver passed.');
}

// 7. Test ceiling boundary clamp
{
    const state = createNyanState();
    state.pig.y = 5; // Above ceiling bound (10)
    state.pig.vy = -100;

    updateNyan(state, {}, 0.016);

    assert.strictEqual(state.pig.y, 10, 'Pig y should clamp to ceiling 10');
    assert.strictEqual(state.pig.vy, 0, 'vy should reset to 0 at ceiling');

    console.log('✓ Test ceiling boundary clamp passed.');
}

// 8. Test checkAABB utility
{
    const a = { x: 10, y: 10, w: 20, h: 20 };
    const b = { x: 25, y: 25, w: 20, h: 20 };
    const c = { x: 50, y: 50, w: 20, h: 20 };

    assert.strictEqual(checkAABB(a, b), true, 'Overlapping boxes should return true');
    assert.strictEqual(checkAABB(a, c), false, 'Non-overlapping boxes should return false');
    assert.strictEqual(checkAABB(null, b), false, 'Null box check should return false');

    console.log('✓ Test checkAABB utility passed.');
}

// 9. Test rainbow segments and distance
{
    const state = createNyanState();
    const dt = 0.5;

    updateNyan(state, {}, dt);

    assert.strictEqual(state.distance, 120 * dt, 'Distance should advance by speed * dt');
    assert.ok(state.rainbow.length > 0, 'Rainbow segments should be added');
    assert.strictEqual(state.rainbow[0].y, state.pig.y + 6, 'Rainbow segment y should match pig offset');

    console.log('✓ Test rainbow segments and distance passed.');
}

console.log('\nAll Nyan Cuy unit tests passed successfully!');
