(function() {
  let currentState = null;
  const SLOTS = ['wallpaper', 'floor', 'rug', 'plant', 'picture', 'lamp'];

  const FALLBACK_LOOK = {
    'wallpaper_mint': { color1: '#bfe3c9', color2: '#a7d4b5', pattern: 'stripes' },
    'wallpaper_peach': { bg: '#f9dcc4', dots: '#f6c9a8', pattern: 'dots' },
    'wallpaper_sky': { clouds: '#cfe6f7', pattern: 'clouds' },
    'wallpaper_lilac': { color1: '#d9c8ef', color2: '#c9b3e6', pattern: 'diamonds' },
    'wallpaper_night': { bg: '#2e3557', pattern: 'stars' },
    'floor_wood_light': { type: 'wood_light' },
    'floor_tiles_checker': { type: 'tiles_checker' },
    'floor_grass': { type: 'grass' },
    'floor_carpet_red': { type: 'carpet_red' },
    'rug_round_pink': { type: 'round_pink' },
    'rug_stripes': { type: 'stripes' },
    'rug_heart': { type: 'heart' },
    'plant_fern': { type: 'fern' },
    'plant_cactus': { type: 'cactus' },
    'plant_flowers': { type: 'flowers' },
    'picture_pig': { type: 'pig' },
    'picture_sunset': { type: 'sunset' },
    'picture_carrot': { type: 'carrot' },
    'lamp_mushroom': { type: 'mushroom' },
    'lamp_star': { type: 'star' }
  };

  function getLook(itemId) {
    if (currentState && currentState.shop && currentState.shop.items) {
      const it = currentState.shop.items.find(i => i.id === itemId);
      if (it && it.look) return it.look;
    }
    return FALLBACK_LOOK[itemId] || null;
  }

  function setupLayers() {
    if (!window.CuyRoom) return;

    window.CuyRoom.addLayer('wallpaper', -20, (ctx, scene) => {
      const eq = currentState?.decor?.equipped?.wallpaper;
      if (!eq) return;
      scene.skipDefaultWall = true;
      const look = getLook(eq);
      if (!look) return;

      const width = 240;
      const height = 96;

      if (look.pattern === 'stripes') {
        ctx.fillStyle = look.color1 || '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = look.color2 || '#ccc';
        for (let x = 0; x < width; x += 16) {
          ctx.fillRect(x, 0, 8, height);
        }
      } else if (look.pattern === 'dots') {
        ctx.fillStyle = look.bg || '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = look.dots || '#ccc';
        for (let y = 8; y < height; y += 16) {
          for (let x = 8; x < width; x += 16) {
            ctx.fillRect(x, y, 4, 4);
          }
        }
      } else if (look.pattern === 'clouds') {
        ctx.fillStyle = '#a0d1f7';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = look.clouds || '#fff';
        const clouds = [[20, 20], [80, 40], [150, 15], [200, 50]];
        clouds.forEach(([cx, cy]) => {
          ctx.fillRect(cx, cy, 20, 8);
          ctx.fillRect(cx + 4, cy - 4, 12, 16);
          ctx.fillRect(cx - 4, cy + 2, 28, 4);
        });
      } else if (look.pattern === 'diamonds') {
        ctx.fillStyle = look.color1 || '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = look.color2 || '#ccc';
        for (let y = 0; y < height; y += 16) {
          for (let x = 0; x < width; x += 16) {
            const ox = (y / 16) % 2 === 0 ? 0 : 8;
            ctx.fillRect(x + ox + 3, y + 3, 10, 10);
          }
        }
      } else if (look.pattern === 'stars') {
        ctx.fillStyle = look.bg || '#000';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#fff';
        const stars = [[10, 10], [40, 30], [90, 15], [130, 40], [180, 20], [220, 35], [60, 60], [160, 70]];
        stars.forEach(([sx, sy]) => {
          ctx.fillRect(sx, sy, 2, 2);
          if ((sx + sy) % 3 === 0) {
            ctx.fillRect(sx - 1, sy + 0.5, 4, 1);
            ctx.fillRect(sx + 0.5, sy - 1, 1, 4);
          }
        });
      }

      ctx.fillStyle = '#e8dcc7';
      ctx.fillRect(0, height - 4, width, 4);
      ctx.fillStyle = '#c7bca5';
      ctx.fillRect(0, height - 1, width, 1);
    });

    window.CuyRoom.addLayer('floor', -10, (ctx, scene) => {
      const eq = currentState?.decor?.equipped?.floor;
      if (!eq) return;
      scene.skipDefaultFloor = true;
      const look = getLook(eq);
      if (!look) return;

      const width = 240;
      const startY = 96;
      const height = 130 - startY;

      if (look.type === 'wood_light') {
        ctx.fillStyle = '#d4ae7f';
        ctx.fillRect(0, startY, width, height);
        ctx.fillStyle = '#c29b6b';
        for (let y = startY; y < 130; y += 8) {
          ctx.fillRect(0, y, width, 1);
        }
        for (let x = 20; x < width; x += 40) {
          ctx.fillRect(x, startY, 1, height);
          ctx.fillRect(x + 20, startY + 8, 1, height - 8);
        }
      } else if (look.type === 'tiles_checker') {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, startY, width, height);
        ctx.fillStyle = '#444';
        for (let y = startY; y < 130; y += 10) {
          for (let x = 0; x < width; x += 10) {
            if (((x / 10) + ((y - startY) / 10)) % 2 === 0) {
              ctx.fillRect(x, y, 10, 10);
            }
          }
        }
      } else if (look.type === 'grass') {
        ctx.fillStyle = '#6ab84b';
        ctx.fillRect(0, startY, width, height);
        ctx.fillStyle = '#599c3f';
        for (let i = 0; i < 40; i++) {
          const gx = Math.floor(Math.random() * width);
          const gy = startY + Math.floor(Math.random() * height);
          ctx.fillRect(gx, gy, 2, 4);
          ctx.fillRect(gx + 2, gy + 2, 2, 2);
        }
      } else if (look.type === 'carpet_red') {
        ctx.fillStyle = '#c73a45';
        ctx.fillRect(0, startY, width, height);
        ctx.fillStyle = '#a62e38';
        for (let i = 0; i < 100; i++) {
          ctx.fillRect(Math.random() * width, startY + Math.random() * height, 2, 2);
        }
      }
    });

    window.CuyRoom.addLayer('rug', -5, (ctx, scene) => {
      const eq = currentState?.decor?.equipped?.rug;
      if (!eq) return;
      const look = getLook(eq);
      if (!look) return;

      const cx = 120;
      const cy = 114;

      ctx.save();
      if (look.type === 'round_pink') {
        ctx.fillStyle = '#f2a2c0';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 60, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e08ca9';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (look.type === 'stripes') {
        ctx.fillStyle = '#7ca6a6';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 70, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e8dcc7';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 50, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d4ae7f';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 30, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (look.type === 'heart') {
        ctx.fillStyle = '#d94c59';
        ctx.translate(cx, cy - 2);
        ctx.scale(1, 0.35);
        ctx.beginPath();
        ctx.moveTo(0, 15);
        ctx.bezierCurveTo(0, 15, 30, -15, 0, -30);
        ctx.bezierCurveTo(-30, -15, 0, 15, 0, 15);
        ctx.fill();
      }
      ctx.restore();
    });

    window.CuyRoom.addLayer('picture', -15, (ctx, scene) => {
      const eq = currentState?.decor?.equipped?.picture;
      if (!eq) return;
      const look = getLook(eq);
      if (!look) return;

      const px = 109;
      const py = 16;
      const pw = 22;
      const ph = 16;

      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = '#8f613c';
      ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);

      if (look.type === 'pig') {
        ctx.fillStyle = '#e69d53';
        ctx.fillRect(px + 6, py + 6, 10, 6);
        ctx.fillStyle = '#333';
        ctx.fillRect(px + 12, py + 7, 1, 1);
        ctx.fillStyle = '#fff';
        ctx.fillRect(px + 6, py + 8, 4, 4);
      } else if (look.type === 'sunset') {
        ctx.fillStyle = '#ff9e5e';
        ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
        ctx.fillStyle = '#ffcf54';
        ctx.beginPath();
        ctx.arc(px + 11, py + 10, 4, 0, Math.PI, true);
        ctx.fill();
        ctx.fillStyle = '#36538a';
        ctx.fillRect(px + 2, py + 10, pw - 4, 4);
      } else if (look.type === 'carrot') {
        ctx.fillStyle = '#64c76b';
        ctx.fillRect(px + 7, py + 4, 4, 3);
        ctx.fillStyle = '#ff8230';
        ctx.fillRect(px + 8, py + 6, 6, 6);
        ctx.fillRect(px + 10, py + 12, 2, 2);
      }
    });

    window.CuyRoom.addLayer('plant', 5, (ctx, scene) => {
      const eq = currentState?.decor?.equipped?.plant;
      if (!eq) return;
      const look = getLook(eq);
      if (!look) return;

      const px = 205;
      const py = 85;

      ctx.fillStyle = '#c76b4a';
      ctx.fillRect(px + 4, py + 20, 16, 12);
      ctx.fillStyle = '#a64f33';
      ctx.fillRect(px + 2, py + 16, 20, 4);
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(px + 4, py + 16, 16, 2);

      const sway = Math.floor(Date.now() / 500) % 2;

      if (look.type === 'fern') {
        ctx.fillStyle = '#4c9e43';
        ctx.fillRect(px + 10 + sway, py + 4, 4, 12);
        ctx.fillRect(px + 6, py + 8, 4, 4);
        ctx.fillRect(px + 14 + sway, py + 10, 4, 4);
        ctx.fillStyle = '#3d8234';
        ctx.fillRect(px + 4 - sway, py + 12, 6, 4);
        ctx.fillRect(px + 12, py + 6, 6, 4);
      } else if (look.type === 'cactus') {
        ctx.fillStyle = '#558f4a';
        ctx.fillRect(px + 8, py + 2, 8, 14);
        ctx.fillRect(px + 4, py + 6, 4, 6);
        ctx.fillRect(px + 16, py + 8, 4, 6);
        ctx.fillStyle = '#a2d998';
        ctx.fillRect(px + 8, py + 4, 1, 1);
        ctx.fillRect(px + 12, py + 8, 1, 1);
        ctx.fillRect(px + 14, py + 12, 1, 1);
      } else if (look.type === 'flowers') {
        ctx.fillStyle = '#64c76b';
        ctx.fillRect(px + 10 + sway, py + 10, 2, 6);
        ctx.fillRect(px + 14 - sway, py + 8, 2, 8);
        ctx.fillRect(px + 6, py + 12, 2, 4);

        ctx.fillStyle = '#f268b6';
        ctx.fillRect(px + 9 + sway, py + 6, 4, 4);
        ctx.fillRect(px + 13 - sway, py + 4, 4, 4);
        ctx.fillRect(px + 5, py + 8, 4, 4);
        ctx.fillStyle = '#ffcf54';
        ctx.fillRect(px + 10 + sway, py + 7, 2, 2);
        ctx.fillRect(px + 14 - sway, py + 5, 2, 2);
        ctx.fillRect(px + 6, py + 9, 2, 2);
      }
    });

    window.CuyRoom.addLayer('lamp', 6, (ctx, scene) => {
      const eq = currentState?.decor?.equipped?.lamp;
      if (!eq) return;
      const look = getLook(eq);
      if (!look) return;

      const lx = 20;
      const ly = 10;
      const hr = new Date().getHours();
      const isEvening = hr >= 18 || hr < 7;

      ctx.save();
      if (look.type === 'mushroom') {
        ctx.fillStyle = '#dcd6cd';
        ctx.fillRect(lx + 8, ly + 8, 6, 8);
        ctx.fillStyle = '#e8564c';
        ctx.beginPath();
        ctx.arc(lx + 11, ly + 8, 8, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(lx + 6, ly + 4, 2, 2);
        ctx.fillRect(lx + 12, ly + 2, 2, 2);
        ctx.fillRect(lx + 14, ly + 6, 2, 2);
      } else if (look.type === 'star') {
        ctx.fillStyle = '#ffcf54';
        ctx.beginPath();
        ctx.moveTo(lx + 10, ly);
        ctx.lineTo(lx + 13, ly + 6);
        ctx.lineTo(lx + 20, ly + 6);
        ctx.lineTo(lx + 14, ly + 11);
        ctx.lineTo(lx + 16, ly + 18);
        ctx.lineTo(lx + 10, ly + 14);
        ctx.lineTo(lx + 4, ly + 18);
        ctx.lineTo(lx + 6, ly + 11);
        ctx.lineTo(lx + 0, ly + 6);
        ctx.lineTo(lx + 7, ly + 6);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.fillRect(lx + 9, 0, 2, ly);
      }

      const cx = (look.type === 'star') ? lx + 10 : lx + 11;
      const cy = (look.type === 'star') ? ly + 10 : ly + 12;
      const radius = isEvening ? 50 : 20;
      const maxAlpha = isEvening ? 0.3 : 0.1;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);

      const glowColor = look.type === 'mushroom' ? `rgba(255, 150, 100, ` : `rgba(255, 220, 100, `;
      grad.addColorStop(0, glowColor + `${maxAlpha})`);
      grad.addColorStop(1, glowColor + `0)`);

      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  window.CuyDecorRenderer = { setupLayers, setC: (s) => currentState = s };

  window.CuyHome.registerFeature({
    id: 'decor',
    title: 'Decorate',
    icon: 'icon-wallpaper',
    order: 30,
    open(container, api) {
      this.api = api;
      this.container = container;
      this.render();
    },
    onState(state) {
      if (window.CuyDecorRenderer) window.CuyDecorRenderer.setC(state);
      if (this.container && this.container.isConnected) {
        this.render();
      }
    },
    render() {
      if (!this.container) return;

      const st = this.api.getState();
      if (!st) return;

      const decorItems = (st.shop?.items || []).filter(i => i.category === 'decor');

      let html = `<div class="decor-panel">`;
      html += `<canvas class="decor-mini-preview" width="240" height="130"></canvas>`;

      let hasOwnedDecor = false;

      const ownedBySlot = { wallpaper: [], floor: [], rug: [], plant: [], picture: [], lamp: [] };

      if (st.inventory) {
        Object.keys(st.inventory).forEach(itemId => {
          if (st.inventory[itemId] > 0) {
            let itemDef = decorItems.find(i => i.id === itemId);
            let slot = itemDef ? itemDef.slot : null;
            if (!slot) {
              SLOTS.forEach(s => {
                if (itemId.startsWith(s + '_') || itemId.startsWith(s)) {
                  slot = s;
                }
              });
            }
            if (slot && ownedBySlot[slot]) {
              ownedBySlot[slot].push({ id: itemId, name: itemDef?.name || itemId });
              hasOwnedDecor = true;
            }
          }
        });
      }

      if (!hasOwnedDecor) {
        html += `<p style="color:#6e6a5c; text-align:center; margin-top:20px;">Buy decorations in the Shop → Home tab</p>`;
      } else {
        html += `<div class="decor-slots">`;
        SLOTS.forEach(slot => {
          const owned = ownedBySlot[slot];
          if (owned.length === 0 && !(st.decor?.equipped?.[slot])) return;

          const currentEq = st.decor?.equipped?.[slot];

          html += `<div class="decor-slot-row">
            <div class="decor-slot-label"><span class="pixel-icon icon-${slot === 'picture' ? 'picture_frame' : slot}"></span> ${slot}</div>
            <div class="decor-items">
              <button class="decor-item-btn ${!currentEq ? 'active' : ''}" data-slot="${slot}" data-id="">None</button>`;

          owned.forEach(it => {
            const isActive = currentEq === it.id;
            html += `<button class="decor-item-btn ${isActive ? 'active' : ''}" data-slot="${slot}" data-id="${it.id}">${it.name}</button>`;
          });

          html += `</div></div>`;
        });
        html += `</div>`;
      }

      html += `</div>`;
      this.container.innerHTML = html;

      const cvs = this.container.querySelector('.decor-mini-preview');
      if (cvs && window.CuyRoom) {
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#eedb7c';
        ctx.fillRect(0, 0, 240, 130);

        if (window.PigCanvas) {
          const miniRoom = new window.PigCanvas(cvs, st);
          miniRoom.updateState(st);
          miniRoom.render();
        } else {
          ctx.fillStyle = '#9c6636'; ctx.fillRect(0, 0, 240, 96);
          ctx.fillStyle = '#eedb7c'; ctx.fillRect(0, 96, 240, 34);
        }
      }

      this.container.querySelectorAll('.decor-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const slot = btn.dataset.slot;
          const id = btn.dataset.id || null;
          this.api.send({ type: 'decor_equip', slot, itemId: id });
        });
      });
    }
  });

  if (window.CuyDecorRenderer) {
    window.CuyDecorRenderer.setupLayers();
  }

  if (!window.chrome || !window.chrome.webview) {
    if (window.bridge) {
      const bridge = window.bridge;
      if (!bridge.currentState) bridge.currentState = {};
      const s = bridge.currentState;
      if (!s.decor) {
        s.decor = { equipped: { wallpaper: "wallpaper_mint", plant: "plant_fern" } };
        s.inventory = s.inventory || {};
        s.inventory["wallpaper_mint"] = 1;
        s.inventory["plant_fern"] = 1;
        s.inventory["floor_wood_light"] = 1;
        if (!s.shop) s.shop = { items: [] };
        s.shop.items.push(
          {id: 'wallpaper_mint', name: 'Mint wallpaper', category: 'decor', slot: 'wallpaper'},
          {id: 'plant_fern', name: 'Fern', category: 'decor', slot: 'plant'},
          {id: 'floor_wood_light', name: 'Light wood floor', category: 'decor', slot: 'floor'}
        );
        setTimeout(() => bridge.broadcastState(), 100);
      }
    }
  }

})();
