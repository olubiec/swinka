(function (root, factory) {
    'use strict';
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (typeof root !== 'undefined') {
        root.NyanCuyLogic = api;
    }
}(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
    'use strict';

    const DEFAULT_POINTS = {
        parsley: 10,
        carrot: 20,
        berry: 50
    };

    /**
     * Creates the initial state for the Nyan Cuy flying pig endless runner.
     * @param {Object} [config] Optional override values
     * @returns {Object} initial game state
     */
    function createNyanState(config = {}) {
        const pigCfg = config.pig || {};
        return {
            width: config.width ?? 360,
            height: config.height ?? 290,
            pig: {
                x: pigCfg.x ?? 80,
                y: pigCfg.y ?? 140,
                vy: pigCfg.vy ?? 0,
                w: pigCfg.w ?? 32,
                h: pigCfg.h ?? 20,
                dead: pigCfg.dead ?? false
            },
            gravity: config.gravity ?? 450,
            flapForce: config.flapForce ?? 190,
            score: config.score ?? 0,
            distance: config.distance ?? 0,
            gameOver: config.gameOver ?? false,
            rainbow: Array.isArray(config.rainbow) ? [...config.rainbow] : [],
            treats: Array.isArray(config.treats) ? config.treats.map(t => ({ ...t })) : [],
            obstacles: Array.isArray(config.obstacles) ? config.obstacles.map(o => ({ ...o })) : [],
            speed: config.speed ?? 120
        };
    }

    /**
     * Performs standard 2D Axis-Aligned Bounding Box (AABB) intersection check.
     * @param {Object} b1 Bounding box { x, y, w, h }
     * @param {Object} b2 Bounding box { x, y, w, h }
     * @returns {boolean} true if overlapping
     */
    function checkAABB(b1, b2) {
        if (!b1 || !b2) return false;
        const w1 = b1.w ?? 0;
        const h1 = b1.h ?? 0;
        const w2 = b2.w ?? 0;
        const h2 = b2.h ?? 0;

        return (
            b1.x < b2.x + w2 &&
            b1.x + w1 > b2.x &&
            b1.y < b2.y + h2 &&
            b1.y + h1 > b2.y
        );
    }

    /**
     * Checks collision between pig and treat using box and/or distance overlap.
     */
    function checkTreatCollision(pig, treat) {
        if (!pig || !treat || treat.collected) return false;
        const tw = treat.w ?? 16;
        const th = treat.h ?? 16;
        const treatBox = { x: treat.x, y: treat.y, w: tw, h: th };
        if (checkAABB(pig, treatBox)) {
            return true;
        }

        // Center-distance fallback
        const pigCenterX = pig.x + (pig.w ?? 32) / 2;
        const pigCenterY = pig.y + (pig.h ?? 20) / 2;
        const treatCenterX = treat.x + tw / 2;
        const treatCenterY = treat.y + th / 2;
        const dx = pigCenterX - treatCenterX;
        const dy = pigCenterY - treatCenterY;
        const hitDist = ((pig.w ?? 32) + tw) * 0.45;
        return (dx * dx + dy * dy) <= (hitDist * hitDist);
    }

    /**
     * Updates Nyan Cuy simulation state by time delta dt.
     * @param {Object} state Game state
     * @param {Object} input Player input (e.g. { flap: boolean })
     * @param {number} dt Delta time in seconds
     * @returns {Array<string>} list of events that occurred ('treat', 'crash')
     */
    function updateNyan(state, input, dt) {
        const events = [];
        events.event = null;
        if (!state) return events;

        const delta = Math.max(0, Number(dt) || 0);
        const playerInput = input || {};

        if (state.gameOver) {
            return events;
        }

        // Flap impulse
        if (playerInput.flap && !state.pig.dead) {
            state.pig.vy = -state.flapForce;
        }

        // Apply gravity
        state.pig.vy += state.gravity * delta;

        // Update pig position
        state.pig.y += state.pig.vy * delta;

        // Ceiling bound
        if (state.pig.y < 10) {
            state.pig.y = 10;
            state.pig.vy = 0;
        }

        // Floor bound
        if (state.pig.y > state.height - 25) {
            state.gameOver = true;
            state.pig.dead = true;
        }

        if (!state.gameOver) {
            // Update distance
            state.distance += state.speed * delta;

            // Rainbow trail: push new segment
            state.rainbow.push({
                x: state.pig.x - 12,
                y: state.pig.y + 6
            });
        }

        // Move rainbow segments left and remove offscreen segments
        for (let i = 0; i < state.rainbow.length; i++) {
            state.rainbow[i].x -= state.speed * delta;
        }
        state.rainbow = state.rainbow.filter(segment => segment.x >= -20);

        // Move treats & obstacles left, filter offscreen
        for (let i = 0; i < state.treats.length; i++) {
            state.treats[i].x -= state.speed * delta;
        }
        state.treats = state.treats.filter(t => !t.collected && (t.x + (t.w ?? 16) >= -50));

        for (let i = 0; i < state.obstacles.length; i++) {
            state.obstacles[i].x -= state.speed * delta;
        }
        state.obstacles = state.obstacles.filter(o => (o.x + (o.w ?? 20) >= -50));

        // Collision check (AABB)
        if (!state.gameOver && !state.pig.dead) {
            // Treats collision
            for (let i = 0; i < state.treats.length; i++) {
                const treat = state.treats[i];
                if (!treat.collected && checkTreatCollision(state.pig, treat)) {
                    treat.collected = true;
                    const pts = treat.points ?? DEFAULT_POINTS[treat.type] ?? 10;
                    state.score += pts;
                    events.push('treat');
                }
            }

            // Obstacles collision
            for (let i = 0; i < state.obstacles.length; i++) {
                const obs = state.obstacles[i];
                const obsBox = {
                    x: obs.x,
                    y: obs.y,
                    w: obs.w ?? 20,
                    h: obs.h ?? 20
                };
                if (checkAABB(state.pig, obsBox)) {
                    state.gameOver = true;
                    state.pig.dead = true;
                    events.push('crash');
                    break;
                }
            }
        }

        events.event = events[0] || null;
        return events;
    }

    return {
        createNyanState,
        updateNyan,
        checkAABB,
        DEFAULT_POINTS
    };
}));
