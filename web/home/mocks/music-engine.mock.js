/*
 * Mock for MusicEngine tests (PK-34b). No real audio: records every node call.
 * Used by tools/qa/music-engine-test.js (Node) and can be loaded in a browser smoke test.
 */
(function (root) {
  'use strict';

  function createParam(log, name) {
    var p = {
      value: 0,
      setValueAtTime: function (v, t) { log.push({ op: name + '.setValueAtTime', v: v, t: t }); },
      linearRampToValueAtTime: function (v, t) { log.push({ op: name + '.linearRamp', v: v, t: t }); },
      cancelScheduledValues: function (t) { log.push({ op: name + '.cancel', t: t }); }
    };
    return p;
  }

  function createMockContext(startTime) {
    var log = [];
    var ctx = {
      log: log,
      currentTime: typeof startTime === 'number' ? startTime : 0,
      destination: { name: 'destination' },
      createGain: function () {
        var node = { type: 'gain', gain: createParam(log, 'gain'), connect: function (to) { log.push({ op: 'connect', from: 'gain', to: to && to.type || 'x' }); return to; } };
        return node;
      },
      createBiquadFilter: function () {
        return { type: 'biquad', frequency: { value: 0 }, connect: function (to) { log.push({ op: 'connect', from: 'biquad', to: to && to.type || 'x' }); return to; } };
      },
      createBufferSource: function () {
        var src = {
          type: 'source', buffer: null, loop: false, loopStart: 0, loopEnd: 0,
          start: function (when, offset) { log.push({ op: 'start', when: when, offset: offset, loop: src.loop, loopStart: src.loopStart, loopEnd: src.loopEnd }); },
          stop: function (when) { log.push({ op: 'stop', when: when }); },
          connect: function (to) { log.push({ op: 'connect', from: 'source', to: to && to.type || 'x' }); return to; }
        };
        return src;
      }
    };
    return ctx;
  }

  /** Loader that returns fake buffers with the given duration (seconds). */
  function createMockLoader(durations) {
    var calls = [];
    function loadBuffer(file) {
      calls.push(file);
      var dur = (durations && durations[file]) || 120;
      return Promise.resolve({ duration: dur, file: file });
    }
    loadBuffer.calls = calls;
    return loadBuffer;
  }

  var api = { createMockContext: createMockContext, createMockLoader: createMockLoader };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MusicEngineMock = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
