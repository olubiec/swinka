(function () {
  'use strict';

  if (window.CuyPlaces) return;

  const DEFAULT_PLACES = ['house', 'garden', 'park', 'farm', 'market'];
  const PLACE_TITLES = {
    house: 'House',
    garden: 'Garden',
    park: 'Park',
    farm: 'Farm',
    market: 'Market'
  };

  const S = {
    currentPlace: 'house',
    currentHouseRoom: 'salon'
  };

  function getState() {
    return (window.CuyHome && window.CuyHome.api && window.CuyHome.api.getState()) ||
      (window.bridge && window.bridge.getState && window.bridge.getState()) || null;
  }

  function getPlacesList(st) {
    if (!st) st = getState();
    if (st && st.places && Array.isArray(st.places.places) && st.places.places.length > 0) {
      const fromState = st.places.places.map(p => typeof p === 'string' ? p : p.id);
      // If state contains default places, preserve the canonical order: house -> garden -> park -> farm -> market
      const hasDefaults = DEFAULT_PLACES.some(id => fromState.includes(id));
      if (hasDefaults) {
        const ordered = [];
        DEFAULT_PLACES.forEach(id => {
          if (fromState.includes(id)) ordered.push(id);
        });
        fromState.forEach(id => {
          if (!ordered.includes(id)) ordered.push(id);
        });
        return ordered;
      }
      return fromState;
    }
    return DEFAULT_PLACES.slice();
  }

  function getHouseRooms(st) {
    if (!st) st = getState();
    const rooms = ['salon'];
    if (st && st.rooms) {
      if (st.rooms.layouts) {
        Object.keys(st.rooms.layouts).forEach(k => {
          if (k !== 'salon' && k !== 'garden' && k !== 'park' && k !== 'dorm' && !k.startsWith('pig:') && !rooms.includes(k)) {
            rooms.push(k);
          }
        });
      }
      if (Array.isArray(st.rooms.pigRooms)) {
        st.rooms.pigRooms.forEach(r => {
          if (r && r.adopted !== false && r.roomId && !rooms.includes(r.roomId)) {
            rooms.push(r.roomId);
          }
        });
      }
      if (st.rooms.dorm || (st.rooms.layouts && st.rooms.layouts.dorm)) {
        if (!rooms.includes('dorm')) rooms.push('dorm');
      }
    }
    return rooms;
  }

  const CuyPlaces = {
    getCurrentPlace() {
      return S.currentPlace;
    },
    setCurrentPlace(placeId) {
      if (placeId) S.currentPlace = placeId;
      this.updateStageNav();
    },
    getCurrentHouseRoom() {
      return S.currentHouseRoom;
    },
    setCurrentHouseRoom(roomId) {
      if (roomId) S.currentHouseRoom = roomId;
    },
    getPlacesList,
    getHouseRooms,

    openPlace(placeId, roomArg) {
      if (!placeId) placeId = S.currentPlace || 'house';
      S.currentPlace = placeId;
      this.updateStageNav();

      if (placeId === 'house') {
        const room = roomArg || S.currentHouseRoom || 'salon';
        S.currentHouseRoom = room;
        if (window.CuyHome) window.CuyHome.openFeature('rooms', { room: room, fromPlaces: true });
      } else if (placeId === 'garden') {
        if (window.CuyHome) window.CuyHome.openFeature('garden', 'garden');
      } else if (placeId === 'park') {
        if (window.CuyHome) window.CuyHome.openFeature('garden', 'park');
      } else if (placeId === 'farm') {
        if (window.CuyHome) window.CuyHome.openFeature('farm');
      } else if (placeId === 'market') {
        if (window.CuyHome) window.CuyHome.openFeature('market');
      } else {
        if (window.CuyHome) window.CuyHome.openFeature(placeId);
      }
    },

    next() {
      const st = getState();
      const cur = S.currentPlace;

      if (cur === 'house') {
        const rooms = getHouseRooms(st);
        const curRoom = S.currentHouseRoom || 'salon';
        const rIdx = rooms.indexOf(curRoom);
        if (rIdx >= 0 && rIdx < rooms.length - 1) {
          // Inside house: advance room
          const nextRoom = rooms[rIdx + 1];
          this.openPlace('house', nextRoom);
          return;
        }
        // Last room of house: next opens garden!
        this.openPlace('garden');
        return;
      }

      const places = getPlacesList(st);
      const pIdx = places.indexOf(cur);
      const nextIdx = pIdx >= 0 ? (pIdx + 1) % places.length : 0;
      const nextP = places[nextIdx];

      if (nextP === 'house') {
        const rooms = getHouseRooms(st);
        this.openPlace('house', rooms[0] || 'salon');
      } else {
        this.openPlace(nextP);
      }
    },

    prev() {
      const st = getState();
      const cur = S.currentPlace;

      if (cur === 'garden') {
        // From garden, previous arrow returns to the last room of the house
        const rooms = getHouseRooms(st);
        const lastRoom = rooms[rooms.length - 1] || 'salon';
        this.openPlace('house', lastRoom);
        return;
      }

      if (cur === 'house') {
        const rooms = getHouseRooms(st);
        const curRoom = S.currentHouseRoom || 'salon';
        const rIdx = rooms.indexOf(curRoom);
        if (rIdx > 0) {
          const prevRoom = rooms[rIdx - 1];
          this.openPlace('house', prevRoom);
          return;
        }
        // First room of house: previous goes to previous place (e.g. market)
        const places = getPlacesList(st);
        const pIdx = places.indexOf('house');
        const prevIdx = pIdx >= 0 ? (pIdx - 1 + places.length) % places.length : places.length - 1;
        const prevP = places[prevIdx];
        this.openPlace(prevP);
        return;
      }

      const places = getPlacesList(st);
      const pIdx = places.indexOf(cur);
      const prevIdx = pIdx >= 0 ? (pIdx - 1 + places.length) % places.length : places.length - 1;
      const prevP = places[prevIdx];

      if (prevP === 'house') {
        const rooms = getHouseRooms(st);
        const lastRoom = rooms[rooms.length - 1] || 'salon';
        this.openPlace('house', lastRoom);
      } else {
        this.openPlace(prevP);
      }
    },

    renderArrowsHtml(placeId) {
      return '';
    },

    bindArrows(container) {},

    updateStageNav() {}
  };

  window.CuyPlaces = CuyPlaces;

  if (window.CuyHome && window.CuyHome.registerFeature) {
    window.CuyHome.registerFeature({
      id: 'places',
      title: 'Places',
      icon: 'icon-house',
      order: 35,
      open(container, api, arg) {
        CuyPlaces.openPlace(arg || CuyPlaces.getCurrentPlace() || 'house');
      }
    });
  }
})();
