// ═══════════════════════════════════════════════════
//  KINDpos Terminal — Scene Manager 2 (SM2)
//  Condensed scene format — delegates to v3 layer stack
//  Nice. Dependable. Yours.
// ═══════════════════════════════════════════════════
//
//  SM2 provides defineScene() — a higher-level API for writing
//  compact scenes with auto-managed state and event cleanup.
//  It registers scenes into the existing v3 SceneManager so
//  all layer operations (mountWorking, openTransactional,
//  interrupt, openGate) work unchanged.
//
//  Old scenes that call SceneManager.register() directly
//  continue to work — SM2 is additive, not a replacement.
//
//  Usage:
//    import { defineScene } from './scene-manager-2.js';
//
//    defineScene({
//      name: 'my-scene',
//      state: { items: [], selected: null },
//      render: function(container, params, state) { ... },
//      unmount: function(state) { ... },          // optional
//      events: { 'order:updated': function() {} }, // optional, auto-cleaned
//      interrupts: { 'my-confirm': { render: fn } }, // optional, inline sub-scenes
//    });
//
// ═══════════════════════════════════════════════════

import { SceneManager } from './scene-manager.js';

// ── Registry of SM2 scenes (for introspection) ──
var _sm2Scenes = {};

// ═══════════════════════════════════════════════════
//  defineScene — primary API
// ═══════════════════════════════════════════════════

export function defineScene(def) {
  if (!def || !def.name) {
    console.error('SM2.defineScene: scene must have a name');
    return;
  }
  if (!def.render) {
    console.error('SM2.defineScene: scene "' + def.name + '" must have a render function');
    return;
  }

  // Snapshot default state (deep copy primitives + objects)
  var defaultState = def.state ? _deepCopy(def.state) : {};

  // Per-lifecycle tracking
  var currentState = null;
  var boundEvents = [];

  // Build v3-compatible scene object
  var scene = {
    name: def.name,

    mount: function(container, params) {
      if (params === undefined) params = {};

      // ── Fresh state from defaults ──
      currentState = _deepCopy(defaultState);

      // ── Bind declared event subscriptions ──
      if (def.events) {
        var eventKeys = Object.keys(def.events);
        for (var i = 0; i < eventKeys.length; i++) {
          var evName = eventKeys[i];
          var handler = def.events[evName];
          SceneManager.on(evName, handler);
          boundEvents.push({ event: evName, handler: handler });
        }
      }

      // ── Delegate to scene render ──
      var cleanup = def.render(container, params, currentState);
      return cleanup;
    },

    unmount: function() {
      // ── Auto-unbind all event subscriptions ──
      for (var i = 0; i < boundEvents.length; i++) {
        SceneManager.off(boundEvents[i].event, boundEvents[i].handler);
      }
      boundEvents = [];

      // ── Call scene unmount if provided ──
      if (def.unmount) {
        def.unmount(currentState);
      }

      // ── Release state ──
      currentState = null;
    },
  };

  // Register main scene into v3
  SceneManager.register(scene);
  _sm2Scenes[def.name] = scene;

  // ── Register inline interrupt sub-scenes ──
  if (def.interrupts) {
    var intKeys = Object.keys(def.interrupts);
    for (var j = 0; j < intKeys.length; j++) {
      _registerSubScene(intKeys[j], def.interrupts[intKeys[j]]);
    }
  }

  // ── Register inline transactional sub-scenes ──
  if (def.transactionals) {
    var trKeys = Object.keys(def.transactionals);
    for (var k = 0; k < trKeys.length; k++) {
      _registerSubScene(trKeys[k], def.transactionals[trKeys[k]]);
    }
  }

  return scene;
}

// ═══════════════════════════════════════════════════
//  Sub-scene registration (interrupts / transactionals)
// ═══════════════════════════════════════════════════

function _registerSubScene(name, subDef) {
  if (!subDef || !subDef.render) {
    console.error('SM2: sub-scene "' + name + '" must have a render function');
    return;
  }

  var subScene = {
    name: name,

    mount: function(container, params) {
      if (params === undefined) params = {};
      return subDef.render(container, params);
    },

    unmount: function() {
      if (subDef.unmount) subDef.unmount();
    },
  };

  SceneManager.register(subScene);
  _sm2Scenes[name] = subScene;
}

// ═══════════════════════════════════════════════════
//  Utilities
// ═══════════════════════════════════════════════════

function _deepCopy(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    var arr = [];
    for (var i = 0; i < obj.length; i++) arr.push(_deepCopy(obj[i]));
    return arr;
  }
  var copy = {};
  var keys = Object.keys(obj);
  for (var j = 0; j < keys.length; j++) {
    copy[keys[j]] = _deepCopy(obj[keys[j]]);
  }
  return copy;
}

// ═══════════════════════════════════════════════════
//  Introspection (for debugging / migration tracking)
// ═══════════════════════════════════════════════════

export function getSM2Scenes() {
  return Object.keys(_sm2Scenes);
}

export function isSM2Scene(name) {
  return !!_sm2Scenes[name];
}
