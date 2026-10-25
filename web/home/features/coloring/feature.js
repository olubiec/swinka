(function() {
  'use strict';

  let containerNode = null;
  let featureApi = null;

  class Store {
    constructor(api) {
      this.api = api;
      this.saveTimeout = null;
      this.isMock = !api.getState().coloring;
    }

    getState() {
      if (!this.isMock && this.api.getState().coloring) {
        return this.api.getState().coloring;
      }
      try {
        const str = localStorage.getItem('cuy_coloring_v1');
        if (str) return JSON.parse(str);
      } catch (e) {}
      return { progress: {}, completed: [], unlockedPacks: [] };
    }

    _saveMock(state) {
      try {
        localStorage.setItem('cuy_coloring_v1', JSON.stringify(state));
      } catch (e) {}
    }

    loadPictureProgress(pictureId) {
      return new Promise((resolve) => {
        if (!this.isMock) {
          // Listen for progress from C#
          const off = this.api.onMessage('coloring_progress', (msg) => {
            if (msg.pictureId === pictureId) {
              off();
              resolve(msg.painted || '');
            }
          });
          this.api.send({ type: 'coloring_load', pictureId });
        } else {
          const state = this.getState();
          resolve(state.progress[pictureId] || '');
        }
      });
    }

    savePictureProgress(pictureId, painted) {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }
      this.saveTimeout = setTimeout(() => {
        if (!this.isMock) {
          this.api.send({ type: 'coloring_save', pictureId, painted });
        } else {
          const state = this.getState();
          state.progress[pictureId] = painted;
          this._saveMock(state);
        }
      }, 1500);
    }

    markCompleted(pictureId, cellsCount) {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
      if (!this.isMock) {
        this.api.send({ type: 'coloring_done', pictureId, cells: cellsCount });
      } else {
        const state = this.getState();
        if (!state.completed.includes(pictureId)) {
          state.completed.push(pictureId);
        }
        delete state.progress[pictureId];
        this._saveMock(state);
      }
    }

    unlockPack(packId) {
      if (!this.isMock) {
        this.api.send({ type: 'coloring_unlock', packId });
      } else {
        const state = this.getState();
        if (!state.unlockedPacks.includes(packId)) {
          state.unlockedPacks.push(packId);
        }
        this._saveMock(state);
      }
    }
  }

  // Gallery logic
  class Gallery {
    constructor(container, api, store) {
      this.container = container;
      this.api = api;
      this.store = store;
      this.indexData = null;
      this.fallbackData = null;
      this.currentPack = null;
      this.onOpenEditor = null;
    }

    async loadIndex() {
      try {
        const url = this.api.assetUrl('coloring/index.json');
        const res = await fetch(url);
        if (res.ok) {
          this.indexData = await res.json();
          return;
        }
      } catch (e) {}

      // Fallback
      try {
        const res = await fetch('./features/coloring/sample.json');
        this.fallbackData = await res.json();
        this.indexData = { version: this.fallbackData.version, packs: this.fallbackData.packs };
      } catch (e) {}
    }

    async loadPack(packId) {
      try {
        const url = this.api.assetUrl(`coloring/${packId}.json`);
        const res = await fetch(url);
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {}

      if (this.fallbackData && this.fallbackData['pack_' + packId]) {
        return this.fallbackData['pack_' + packId];
      }
      return null;
    }

    drawThumb(canvas, picture, state, isGallery = false) {
      const ctx = canvas.getContext('2d');
      const w = picture.w;
      const h = picture.h;
      canvas.width = w;
      canvas.height = h;

      const imgData = ctx.createImageData(w, h);
      const cells = picture.cells;
      const progress = state.progress[picture.id] || '';
      const isCompleted = state.completed.includes(picture.id);

      for (let i = 0; i < cells.length; i++) {
        let r, g, b;
        if (cells[i] === '.') {
          r = g = b = 255;
        } else {
          let idx;
          if (cells[i] >= '1' && cells[i] <= '9') idx = parseInt(cells[i]) - 1;
          else idx = cells[i].charCodeAt(0) - 'a'.charCodeAt(0) + 9;

          const color = picture.palette[idx];
          const isPainted = isCompleted || progress[i] === '1';

          let hex = color.replace('#', '');
          let origR = parseInt(hex.substring(0, 2), 16);
          let origG = parseInt(hex.substring(2, 4), 16);
          let origB = parseInt(hex.substring(4, 6), 16);

          if (isGallery) {
             if (isCompleted) {
                r = origR; g = origG; b = origB;
             } else {
                let lum = 0.299*origR + 0.587*origG + 0.114*origB;
                r = g = b = lum;
             }
          } else {
             if (isCompleted) {
                r = origR; g = origG; b = origB;
             } else if (isPainted) {
                r = origR; g = origG; b = origB;
             } else {
                r = g = b = 200;
             }
          }
        }

        const px = i * 4;
        imgData.data[px] = r;
        imgData.data[px+1] = g;
        imgData.data[px+2] = b;
        imgData.data[px+3] = cells[i] === '.' ? 0 : 255;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    async renderPacks() {
      if (!this.indexData) await this.loadIndex();
      if (!this.indexData) {
        this.container.innerHTML = '<div>Failed to load data</div>';
        return;
      }

      const state = this.store.getState();
      let completedCount = state.completed.length;
      let nextLevel = completedCount + 1;

      let html = `<div class="coloring-home">
        <div class="coloring-header">
           <button class="coloring-btn play-level">Play level ${nextLevel}</button>
        </div>
        <div class="coloring-packs-grid">`;

      const bridgeState = this.api.getState();
      const userClovers = bridgeState ? bridgeState.clovers : 0;

      for (const pack of this.indexData.packs) {
         let isUnlocked = pack.price === 0 || state.unlockedPacks.includes(pack.id);
         html += `
         <div class="coloring-pack-card" data-id="${pack.id}" data-unlocked="${isUnlocked}" data-price="${pack.price}">
            <canvas class="pack-thumb" id="thumb_pack_${pack.id}"></canvas>
            <div class="pack-info">
               <div class="pack-title">${pack.title}</div>
               ${isUnlocked
                  ? `<div class="pack-count">? / ${pack.count}</div>`
                  : `<div class="pack-lock">🔒 ${pack.price} 🍀 ${this.store.isMock && pack.price > 0 ? '(test mode)' : ''}</div>`
               }
            </div>
         </div>`;
      }
      html += `</div></div>`;
      this.container.innerHTML = html;

      // Render thumbs
      for (const pack of this.indexData.packs) {
         const pData = await this.loadPack(pack.id);
         if (pData) {
            const pic = pData.pictures.find(p => p.id === pack.thumb);
            if (pic) {
               const canvas = this.container.querySelector(`#thumb_pack_${pack.id}`);
               if (canvas) this.drawThumb(canvas, pic, state, true);
            }

            // update count
            let completedInPack = 0;
            pData.pictures.forEach(p => {
               if (state.completed.includes(p.id)) completedInPack++;
            });
            const cEl = this.container.querySelector(`.coloring-pack-card[data-id="${pack.id}"] .pack-count`);
            if (cEl) cEl.innerText = `${completedInPack} / ${pack.count}`;
         }
      }

      // events
      this.container.querySelectorAll('.coloring-pack-card').forEach(el => {
         el.addEventListener('click', async () => {
            const unlocked = el.dataset.unlocked === 'true';
            const id = el.dataset.id;
            const price = parseInt(el.dataset.price);

            if (!unlocked) {
               if (this.store.isMock) {
                  this.store.unlockPack(id);
                  this.renderPacks();
               } else if (userClovers >= price) {
                  this.store.unlockPack(id);
                  // C# will update state, bridge onState will handle
               } else {
                  // Not enough clovers
               }
               return;
            }

            const pData = await this.loadPack(id);
            this.renderPack(pData);
         });
      });

      this.container.querySelector('.play-level').addEventListener('click', async () => {
         // Auto play logic N
         const packOrder = ['guinea_pigs', 'food_and_toys'];
         let allPacks = [...packOrder];
         state.unlockedPacks.forEach(p => { if (!allPacks.includes(p)) allPacks.push(p); });

         let played = 0;
         let targetPic = null;
         let targetPack = null;
         for (const packId of allPacks) {
            const pData = await this.loadPack(packId);
            if (!pData) continue;
            for (const pic of pData.pictures) {
               played++;
               if (played === nextLevel) {
                  targetPic = pic;
                  targetPack = pData;
                  break;
               }
            }
            if (targetPic) break;
         }

         if (targetPic) {
            if (this.onOpenEditor) this.onOpenEditor(targetPack, targetPic, nextLevel);
         } else {
             // fallback to first
             const pData = await this.loadPack(allPacks[0]);
             if (pData && pData.pictures[0] && this.onOpenEditor) {
                this.onOpenEditor(pData, pData.pictures[0], nextLevel);
             }
         }
      });
    }

    renderPack(packData) {
       this.currentPack = packData;
       const state = this.store.getState();
       let html = `
       <div class="coloring-pack-view">
          <div class="coloring-header">
             <button class="coloring-btn back-btn">⬅</button>
             <span class="pack-title-header">${packData.title}</span>
          </div>
          <div class="coloring-pics-grid">
       `;

       packData.pictures.forEach(pic => {
          html += `
          <div class="coloring-pic-card" data-id="${pic.id}">
             <canvas class="pic-thumb" id="thumb_pic_${pic.id}"></canvas>
          </div>
          `;
       });
       html += `</div></div>`;
       this.container.innerHTML = html;

       packData.pictures.forEach(pic => {
          const canvas = this.container.querySelector(`#thumb_pic_${pic.id}`);
          this.drawThumb(canvas, pic, state, false);
       });

       this.container.querySelector('.back-btn').addEventListener('click', () => {
          this.renderPacks();
       });

       this.container.querySelectorAll('.coloring-pic-card').forEach(el => {
          el.addEventListener('click', () => {
             const picId = el.dataset.id;
             const pic = packData.pictures.find(p => p.id === picId);
             if (this.onOpenEditor) this.onOpenEditor(packData, pic);
          });
       });
    }
  }

  // Editor logic
  class Editor {
    constructor(container, api, store, pack, pic, level, onBack) {
      this.container = container;
      this.api = api;
      this.store = store;
      this.pack = pack;
      this.pic = pic;
      this.level = level;
      this.onBack = onBack;

      this.painted = '';
      this.isCompleted = false;
      this.selectedColorIdx = 0;

      this.canvas = null;
      this.ctx = null;
      this.cw = 0;
      this.ch = 0;

      this.zoom = 1;
      this.panX = 0;
      this.panY = 0;
      this.cellSize = 20;

      this.isFlat = localStorage.getItem('cuy_coloring_style') === 'flat';

      this.rafId = null;
      this.needsRedraw = true;
      this.flashCells = new Map();

      this.init();
    }

    async init() {
       let state = this.store.getState();
       this.isCompleted = state.completed.includes(this.pic.id);
       this.painted = await this.store.loadPictureProgress(this.pic.id);

       if (this.painted.length !== this.pic.cells.length) {
          this.painted = '0'.repeat(this.pic.cells.length);
       }
       if (this.isCompleted) {
          this.painted = '1'.repeat(this.pic.cells.length);
       }

       this.renderShell();
       this.autoSelectColor();
       this.renderPalette();
       this.startRenderLoop();

       if (window.CuyMusic && window.CuyMusic.play) {
          window.CuyMusic.play('calm');
       }
    }

    renderShell() {
       let html = `
       <div class="coloring-editor">
          <div class="coloring-header">
             <button class="coloring-btn back-gallery">⬅</button>
             <span class="editor-title">${this.level ? `Level ${this.level}` : this.pic.title}</span>
             <span class="editor-progress">0%</span>
             <button class="coloring-btn toggle-style">${this.isFlat ? 'Flat' : 'Beads'}</button>
          </div>
          <div class="editor-canvas-wrap">
             <canvas id="editorCanvas"></canvas>
             <div class="editor-confetti-layer"></div>
          </div>
          <div class="editor-palette"></div>
          <div class="editor-completion-modal" style="display:none;">
             <div class="modal-card">
                <h2>Done!</h2>
                <div class="reward-text"></div>
                <button class="coloring-btn btn-gallery">Gallery</button>
             </div>
          </div>
       </div>`;
       this.container.innerHTML = html;

       this.container.querySelector('.back-gallery').addEventListener('click', () => {
          this.destroy();
          if (this.onBack) this.onBack();
       });

       this.container.querySelector('.toggle-style').addEventListener('click', (e) => {
          this.isFlat = !this.isFlat;
          localStorage.setItem('cuy_coloring_style', this.isFlat ? 'flat' : 'beads');
          e.target.innerText = this.isFlat ? 'Flat' : 'Beads';
          this.needsRedraw = true;
       });

       this.canvas = this.container.querySelector('#editorCanvas');
       this.ctx = this.canvas.getContext('2d', { alpha: false });

       this.resize();
       window.addEventListener('resize', this.onResize);

       this.setupInput();
       this.fit();
    }

    setupInput() {
       let isDragging = false;
       let isPanning = false;
       let lastX = 0;
       let lastY = 0;
       let lastPinchDist = 0;

       this.canvas.addEventListener('wheel', (e) => {
          e.preventDefault();
          const zoomFactor = 1.1;
          const oldZoom = this.zoom;
          if (e.deltaY < 0) this.zoom *= zoomFactor;
          else this.zoom /= zoomFactor;

          if (this.zoom < 0.1) this.zoom = 0.1;
          if (this.zoom > 10) this.zoom = 10;

          const rect = this.canvas.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;

          this.panX = mx - (mx - this.panX) * (this.zoom / oldZoom);
          this.panY = my - (my - this.panY) * (this.zoom / oldZoom);
          this.needsRedraw = true;
       });

       const getDist = (touches) => {
          const dx = touches[0].clientX - touches[1].clientX;
          const dy = touches[0].clientY - touches[1].clientY;
          return Math.sqrt(dx*dx + dy*dy);
       };

       const handlePaint = (x, y) => {
          if (this.isCompleted) return;
          const rect = this.canvas.getBoundingClientRect();
          const s = this.cellSize * this.zoom;

          const cx = Math.floor((x - rect.left - this.panX) / s);
          const cy = Math.floor((y - rect.top - this.panY) / s);

          if (cx >= 0 && cx < this.pic.w && cy >= 0 && cy < this.pic.h) {
             const i = cy * this.pic.w + cx;
             const c = this.pic.cells[i];
             if (c === '.' || this.painted[i] === '1') return;

             let colorIdx;
             if (c >= '1' && c <= '9') colorIdx = parseInt(c) - 1;
             else colorIdx = c.charCodeAt(0) - 'a'.charCodeAt(0) + 9;

             if (colorIdx === this.selectedColorIdx) {
                this.painted = this.painted.substring(0, i) + '1' + this.painted.substring(i + 1);
                this.store.savePictureProgress(this.pic.id, this.painted);
                this.checkColorDone();
                this.needsRedraw = true;
             } else {
                this.flashCells.set(i, Date.now());
                this.needsRedraw = true;
             }
          }
       };

       const onDown = (e) => {
          e.preventDefault();
          if (e.touches && e.touches.length === 2) {
             isPanning = true;
             isDragging = false;
             lastPinchDist = getDist(e.touches);
             lastX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
             lastY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
             return;
          }

          const cx = e.touches ? e.touches[0].clientX : e.clientX;
          const cy = e.touches ? e.touches[0].clientY : e.clientY;

          if (e.button === 2 || e.button === 1) { // Right or middle click pan
             isPanning = true;
             lastX = cx;
             lastY = cy;
             return;
          }

          isDragging = true;
          handlePaint(cx, cy);
       };

       const onMove = (e) => {
          e.preventDefault();
          if (e.touches && e.touches.length === 2 && isPanning) {
             const dist = getDist(e.touches);
             const zoomFactor = dist / lastPinchDist;
             const oldZoom = this.zoom;
             this.zoom *= zoomFactor;
             lastPinchDist = dist;

             if (this.zoom < 0.1) this.zoom = 0.1;
             if (this.zoom > 10) this.zoom = 10;

             const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
             const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;

             const rect = this.canvas.getBoundingClientRect();
             const cmx = mx - rect.left;
             const cmy = my - rect.top;

             this.panX = cmx - (cmx - this.panX) * (this.zoom / oldZoom);
             this.panY = cmy - (cmy - this.panY) * (this.zoom / oldZoom);

             this.panX += mx - lastX;
             this.panY += my - lastY;

             lastX = mx;
             lastY = my;
             this.needsRedraw = true;
             return;
          }

          const cx = e.touches ? e.touches[0].clientX : e.clientX;
          const cy = e.touches ? e.touches[0].clientY : e.clientY;

          if (isPanning) {
             this.panX += cx - lastX;
             this.panY += cy - lastY;
             lastX = cx;
             lastY = cy;
             this.needsRedraw = true;
          } else if (isDragging) {
             handlePaint(cx, cy);
          }
       };

       const onUp = (e) => {
          e.preventDefault();
          isDragging = false;
          isPanning = false;
       };

       this.canvas.addEventListener('mousedown', onDown);
       this.canvas.addEventListener('mousemove', onMove);
       window.addEventListener('mouseup', onUp);

       this.canvas.addEventListener('touchstart', onDown, {passive: false});
       this.canvas.addEventListener('touchmove', onMove, {passive: false});
       window.addEventListener('touchend', onUp);
       this.canvas.addEventListener('contextmenu', e => e.preventDefault());

       this.cleanupInput = () => {
          window.removeEventListener('mouseup', onUp);
          window.removeEventListener('touchend', onUp);
       };
    }

    checkColorDone() {
       this.renderPalette();
       if (this.isColorDone(this.selectedColorIdx)) {
          this.autoSelectColor();
       }

       const stats = this.getColorStats();
       if (stats.painted >= stats.total && !this.isCompleted) {
          this.completePicture(stats.total);
       }
    }

    completePicture(totalCells) {
       this.isCompleted = true;
       this.store.markCompleted(this.pic.id, totalCells);

       if (this.api.sound && typeof this.api.sound.fanfare === 'function') {
          this.api.sound.fanfare();
       } else if (window.Sound && typeof window.Sound.fanfare === 'function') {
          window.Sound.fanfare();
       }

       // Confetti
       const confLayer = this.container.querySelector('.editor-confetti-layer');
       if (confLayer) {
          for (let i = 0; i < 50; i++) {
             const c = document.createElement('div');
             c.className = 'confetti';
             c.style.background = this.pic.palette[Math.floor(Math.random() * this.pic.palette.length)];
             c.style.left = Math.random() * 100 + '%';
             c.style.animationDelay = (Math.random() * 0.5) + 's';
             confLayer.appendChild(c);
          }
       }

       // Show modal
       setTimeout(() => {
          const modal = this.container.querySelector('.editor-completion-modal');
          if (modal) {
             modal.style.display = 'flex';
             const rTxt = modal.querySelector('.reward-text');
             // C# state has rewardedToday / maxRewardedPerDay maybe, mock gives static
             const rMsg = this.store.isMock ? "Well done! (mock mode)" : "Reward added!";
             rTxt.innerText = rMsg;

             modal.querySelector('.btn-gallery').addEventListener('click', () => {
                this.destroy();
                if (this.onBack) this.onBack();
             });
          }
       }, 1000);

       this.needsRedraw = true;
    }

    onResize = () => {
       this.resize();
       this.needsRedraw = true;
    }

    resize() {
       const wrap = this.container.querySelector('.editor-canvas-wrap');
       this.cw = wrap.clientWidth;
       this.ch = wrap.clientHeight;
       this.canvas.width = this.cw;
       this.canvas.height = this.ch;
    }

    fit() {
       const pad = 20;
       const maxW = this.cw - pad*2;
       const maxH = this.ch - pad*2;
       const sizeW = maxW / this.pic.w;
       const sizeH = maxH / this.pic.h;
       let s = Math.min(sizeW, sizeH);
       if (s < 6) s = 6;
       if (s > 40) s = 40;
       this.cellSize = s;
       this.zoom = 1;

       const contentW = this.pic.w * s;
       const contentH = this.pic.h * s;
       this.panX = (this.cw - contentW) / 2;
       this.panY = (this.ch - contentH) / 2;
       this.needsRedraw = true;
    }

    autoSelectColor() {
       for (let i = 0; i < this.pic.palette.length; i++) {
          if (!this.isColorDone(i)) {
             this.selectedColorIdx = i;
             this.renderPalette();
             return;
          }
       }
    }

    isColorDone(idx) {
       if (this.isCompleted) return true;
       const cChar = idx < 9 ? String(idx + 1) : String.fromCharCode('a'.charCodeAt(0) + idx - 9);
       for (let i = 0; i < this.pic.cells.length; i++) {
          if (this.pic.cells[i] === cChar && this.painted[i] !== '1') return false;
       }
       return true;
    }

    getColorStats() {
       let painted = 0;
       let total = 0;
       let colorTotals = new Array(this.pic.palette.length).fill(0);
       let colorPainted = new Array(this.pic.palette.length).fill(0);

       for (let i = 0; i < this.pic.cells.length; i++) {
          const c = this.pic.cells[i];
          if (c === '.') continue;

          let idx;
          if (c >= '1' && c <= '9') idx = parseInt(c) - 1;
          else idx = c.charCodeAt(0) - 'a'.charCodeAt(0) + 9;

          total++;
          colorTotals[idx]++;
          if (this.isCompleted || this.painted[i] === '1') {
             painted++;
             colorPainted[idx]++;
          }
       }
       return { painted, total, colorTotals, colorPainted };
    }

    renderPalette() {
       const stats = this.getColorStats();
       const palNode = this.container.querySelector('.editor-palette');
       let html = '';

       for (let i = 0; i < this.pic.palette.length; i++) {
          const isSelected = i === this.selectedColorIdx;
          const isDone = stats.colorPainted[i] >= stats.colorTotals[i] && stats.colorTotals[i] > 0;
          const pct = stats.colorTotals[i] > 0 ? (stats.colorPainted[i] / stats.colorTotals[i]) * 100 : 100;
          const color = this.pic.palette[i];

          html += `
          <div class="palette-chip ${isSelected ? 'selected' : ''} ${isDone ? 'done' : ''}" data-idx="${i}">
             <div class="chip-circle" style="background: ${color};">
                ${isDone ? '✔️' : (i + 1)}
             </div>
             <div class="chip-ring" style="background: conic-gradient(#fff ${pct}%, transparent ${pct}%);"></div>
          </div>
          `;
       }
       palNode.innerHTML = html;

       const progNode = this.container.querySelector('.editor-progress');
       if (progNode) {
          const pctAll = Math.floor((stats.painted / stats.total) * 100);
          progNode.innerText = `${pctAll}%`;
       }

       palNode.querySelectorAll('.palette-chip').forEach(el => {
          el.addEventListener('click', () => {
             this.selectedColorIdx = parseInt(el.dataset.idx);
             this.renderPalette();
             this.needsRedraw = true;
          });
       });
    }

    startRenderLoop() {
       const loop = () => {
          if (this.needsRedraw || this.flashCells.size > 0) {
             this.draw();
             this.needsRedraw = false;
          }
          this.rafId = requestAnimationFrame(loop);
       };
       this.rafId = requestAnimationFrame(loop);
    }

    draw() {
       if (!this.ctx) return;
       const ctx = this.ctx;
       ctx.fillStyle = '#f0e3db'; // soft pink-beige board
       ctx.fillRect(0, 0, this.cw, this.ch);

       const s = this.cellSize * this.zoom;
       const radius = s * 0.44; // 88% of cell size
       const centerOff = s / 2;

       const t = Date.now();
       const toDelete = [];

       // Calc visible bounds
       const startX = Math.max(0, Math.floor(-this.panX / s));
       const startY = Math.max(0, Math.floor(-this.panY / s));
       const endX = Math.min(this.pic.w, Math.ceil((this.cw - this.panX) / s));
       const endY = Math.min(this.pic.h, Math.ceil((this.ch - this.panY) / s));

       ctx.textAlign = 'center';
       ctx.textBaseline = 'middle';
       ctx.font = `bold ${s * 0.5}px Arial`;

       for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
             const i = y * this.pic.w + x;
             const c = this.pic.cells[i];
             const cx = this.panX + x * s + centerOff;
             const cy = this.panY + y * s + centerOff;

             if (c === '.') {
                if (this.isFlat) {
                   ctx.fillStyle = '#e5d8d0';
                   ctx.fillRect(cx - centerOff, cy - centerOff, s, s);
                } else {
                   ctx.fillStyle = '#d5c8c0';
                   ctx.beginPath();
                   ctx.arc(cx, cy, radius * 0.2, 0, Math.PI * 2);
                   ctx.fill();
                }
                continue;
             }

             let colorIdx;
             if (c >= '1' && c <= '9') colorIdx = parseInt(c) - 1;
             else colorIdx = c.charCodeAt(0) - 'a'.charCodeAt(0) + 9;

             const color = this.pic.palette[colorIdx];
             const isPainted = this.painted[i] === '1' || this.isCompleted;
             const isSelected = colorIdx === this.selectedColorIdx;
             const isFlashed = this.flashCells.has(i);

             if (isFlashed) {
                const fTime = this.flashCells.get(i);
                if (t - fTime > 300) {
                   toDelete.push(i);
                }
             }

             if (this.isFlat) {
                if (isPainted) {
                   ctx.fillStyle = color;
                   ctx.fillRect(cx - centerOff, cy - centerOff, s, s);
                } else {
                   ctx.fillStyle = isFlashed ? '#ff8888' : (isSelected ? color + '44' : '#e0d5ce');
                   ctx.fillRect(cx - centerOff, cy - centerOff, s - 1, s - 1);
                   if (s >= 12 && !isFlashed) {
                      ctx.fillStyle = '#999';
                      ctx.fillText(colorIdx + 1, cx, cy);
                   }
                }
             } else {
                // Beads style
                if (isPainted) {
                   // Rim
                   ctx.fillStyle = '#00000033';
                   ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
                   // Main
                   ctx.fillStyle = color;
                   ctx.beginPath(); ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2); ctx.fill();
                   // Highlight
                   ctx.fillStyle = '#ffffff66';
                   ctx.beginPath(); ctx.arc(cx - radius*0.3, cy - radius*0.3, radius*0.3, 0, Math.PI * 2); ctx.fill();
                } else {
                   ctx.fillStyle = isFlashed ? '#ff8888' : (isSelected ? color + '44' : '#d5c8c0');
                   ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
                   ctx.fillStyle = '#f0e3db';
                   ctx.beginPath(); ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2); ctx.fill();

                   if (s >= 12 && !isFlashed) {
                      ctx.fillStyle = '#999';
                      ctx.fillText(colorIdx + 1, cx, cy);
                   }
                }
             }
          }
       }

       toDelete.forEach(i => this.flashCells.delete(i));
    }

    destroy() {
       window.removeEventListener('resize', this.onResize);
       if (this.cleanupInput) this.cleanupInput();
       if (this.rafId) cancelAnimationFrame(this.rafId);
       this.ctx = null;

       if (window.CuyMusic && window.CuyMusic.stop) {
          window.CuyMusic.stop('calm');
       }
    }
  }

  let galleryInstance = null;
  let editorInstance = null;

  window.CuyHome.registerFeature({
    id: 'coloring',
    title: 'Colouring',
    icon: 'icon-strawberry',
    order: 20,
    open(container, api) {
      containerNode = container;
      featureApi = api;
      const store = new Store(api);
      galleryInstance = new Gallery(container, api, store);
      galleryInstance.onOpenEditor = (pack, pic, level) => {
         if (editorInstance) editorInstance.destroy();
         editorInstance = new Editor(container, api, store, pack, pic, level, () => {
             editorInstance = null;
             galleryInstance.renderPacks();
         });
      };
      galleryInstance.renderPacks();
    },
    close() {
      if (editorInstance) editorInstance.destroy();
    },
    onState(state) {
       // Re-render if new pack unlocked
       if (galleryInstance && !galleryInstance.currentPack) {
           galleryInstance.renderPacks();
       }
    }
  });

})();