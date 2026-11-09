(function () {
  'use strict';

  const CELL = 16;
  const DEFAULT_COLS = 12;
  const DEFAULT_ROWS = 7;
  const DEFAULT_WALL_ROWS = 2;

  function isValidPosInt(val) {
    return typeof val === 'number' && Number.isInteger(val) && val > 0;
  }

  function geometry(layout) {
    let cols = (layout && isValidPosInt(layout.cols)) ? layout.cols : DEFAULT_COLS;
    let rows = (layout && isValidPosInt(layout.rows)) ? layout.rows : DEFAULT_ROWS;
    let wallRows = (layout && isValidPosInt(layout.wallRows)) ? layout.wallRows : DEFAULT_WALL_ROWS;

    const maxWall = Math.max(1, rows - 2);
    if (wallRows < 1) {
      wallRows = 1;
    } else if (wallRows > maxWall) {
      wallRows = maxWall;
    }

    const w = cols * CELL;
    const h = rows * CELL;
    const wallH = wallRows * CELL;

    return {
      size: [w, h],
      wallH: wallH,
      floor: [0, wallH, w, h],
      walk: [8, wallH + 8, w - 8, h - 2],
      cell: CELL,
      cols: cols,
      rows: rows,
      wallRows: wallRows
    };
  }

  function cellToPx(layout, cx, cy, cw, ch) {
    let cellX;
    let cellY;
    let width;
    let height;

    if (typeof layout === 'number') {
      // cellToPx(cx, cy, cw, ch)
      cellX = layout;
      cellY = cx;
      width = cy;
      height = cw;
    } else if (layout && typeof layout === 'object' && (typeof layout.cx === 'number' || typeof layout.x === 'number') && cx === undefined) {
      // cellToPx({cx, cy, cw, ch}) or cellToPx({x, y, w, h})
      cellX = layout.cx !== undefined ? layout.cx : layout.x;
      cellY = layout.cy !== undefined ? layout.cy : layout.y;
      width = layout.cw !== undefined ? layout.cw : (layout.w !== undefined ? layout.w : 1);
      height = layout.ch !== undefined ? layout.ch : (layout.h !== undefined ? layout.h : 1);
    } else if (cx && typeof cx === 'object' && (typeof cx.cx === 'number' || typeof cx.x === 'number')) {
      // cellToPx(layout, {cx, cy, cw, ch})
      cellX = cx.cx !== undefined ? cx.cx : cx.x;
      cellY = cx.cy !== undefined ? cx.cy : cx.y;
      width = cx.cw !== undefined ? cx.cw : (cx.w !== undefined ? cx.w : (cy !== undefined ? cy : 1));
      height = cx.ch !== undefined ? cx.ch : (cx.h !== undefined ? cx.h : (cw !== undefined ? cw : 1));
    } else {
      // cellToPx(layout, cx, cy, cw, ch)
      cellX = cx;
      cellY = cy;
      width = cw;
      height = ch;
    }

    if (typeof cellX !== 'number' || isNaN(cellX)) cellX = 0;
    if (typeof cellY !== 'number' || isNaN(cellY)) cellY = 0;
    if (typeof width !== 'number' || isNaN(width) || width <= 0) width = 1;
    if (typeof height !== 'number' || isNaN(height) || height <= 0) height = 1;

    return {
      x: Math.round((cellX + width / 2) * CELL),
      y: Math.round((cellY + height) * CELL)
    };
  }

  function pxToCell(layout, x, y) {
    let effectiveLayout = layout;
    let px;
    let py;

    if (typeof layout === 'number') {
      // pxToCell(x, y)
      effectiveLayout = null;
      px = layout;
      py = x;
    } else if (layout && typeof layout.x === 'number' && typeof layout.y === 'number') {
      // pxToCell({x, y})
      effectiveLayout = null;
      px = layout.x;
      py = layout.y;
    } else if (x && typeof x === 'object' && typeof x.x === 'number' && typeof x.y === 'number') {
      // pxToCell(layout, {x, y})
      px = x.x;
      py = x.y;
    } else {
      // pxToCell(layout, x, y)
      px = x;
      py = y;
    }

    const cols = (effectiveLayout && isValidPosInt(effectiveLayout.cols)) ? effectiveLayout.cols : DEFAULT_COLS;
    const rows = (effectiveLayout && isValidPosInt(effectiveLayout.rows)) ? effectiveLayout.rows : DEFAULT_ROWS;

    let cx = typeof px === 'number' ? Math.floor(px / CELL) : 0;
    let cy = typeof py === 'number' ? Math.round(py / CELL - 1) : 0;

    if (isNaN(cx)) cx = 0;
    if (isNaN(cy)) cy = 0;

    cx = Math.max(0, Math.min(cols - 1, cx));
    cy = Math.max(0, Math.min(rows - 1, cy));

    return { cx: cx, cy: cy };
  }

  const CuyRoomGeometry = {
    CELL: CELL,
    geometry: geometry,
    cellToPx: cellToPx,
    pxToCell: pxToCell
  };

  if (typeof window !== 'undefined') {
    window.CuyRoomGeometry = CuyRoomGeometry;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CuyRoomGeometry;
  }
})();
