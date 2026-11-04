// Простой построитель графиков на <canvas>, без внешних библиотек.
// Использование:
//   const p = new Plot(canvas);
//   p.setView({ xMin: -10, xMax: 10, yMin: -8, yMax: 8, equal: true });
//   p.draw([{ fn: x => x * x, color, width, dash }], [{ x: 1, y: 1, label: 'A' }], [{ x1: 0, y1: -5, x2: 0, y2: 5 }]);
// equal: true — клетки квадратные (масштаб по осям одинаковый),
// equal: false — каждая ось масштабируется отдельно (для «высоких» графиков).
(function (global) {
  'use strict';

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function niceStep(range, target) {
    const raw = range / target;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / pow;
    const nice = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
    return nice * pow;
  }

  function fmtTick(v) {
    const r = Math.round(v * 1000) / 1000;
    return String(r).replace('-', '−');
  }

  class Plot {
    constructor(canvas, view) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.view = Object.assign({ xMin: -10, xMax: 10, yMin: -8, yMax: 8, equal: true }, view);
      this.curves = [];
      this.points = [];
      this.lines = [];
      window.addEventListener('resize', () => this._resize());
      if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        if (mq.addEventListener) mq.addEventListener('change', () => this.redraw());
      }
      this._resize();
    }

    setView(view) {
      this.view = Object.assign({ equal: true }, view);
    }

    _resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      this.w = rect.width;
      this.h = rect.height;
      this.canvas.width = Math.round(rect.width * dpr);
      this.canvas.height = Math.round(rect.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.redraw();
    }

    _fitView() {
      const v = this.view;
      let sx = this.w / (v.xMax - v.xMin);
      let sy = this.h / (v.yMax - v.yMin);
      if (v.equal) sx = sy = Math.min(sx, sy);
      const cx = (v.xMin + v.xMax) / 2;
      const cy = (v.yMin + v.yMax) / 2;
      const halfW = this.w / sx / 2;
      const halfH = this.h / sy / 2;
      return { xMin: cx - halfW, xMax: cx + halfW, yMin: cy - halfH, yMax: cy + halfH, sx, sy };
    }

    toPx(x, y) {
      const f = this._fv;
      return [(x - f.xMin) * f.sx, this.h - (y - f.yMin) * f.sy];
    }

    // bands: [{ yMin, yMax } | { xMin, xMax }, color?] — закрашенные полосы (ε-коридор, δ-окрестность)
    draw(curves, points, lines, bands) {
      this.curves = curves || [];
      this.points = points || [];
      this.lines = lines || [];
      this.bands = bands || [];
      this.redraw();
    }

    redraw() {
      if (!this.w || !this.h) return;
      const ctx = this.ctx;
      const fv = (this._fv = this._fitView());
      const grid = cssVar('--grid', '#e7e4dc');
      const axis = cssVar('--axis', '#8a8f98');
      const muted = cssVar('--muted', '#5d6470');

      ctx.clearRect(0, 0, this.w, this.h);

      let stepX = niceStep(fv.xMax - fv.xMin, Math.max(4, this.w / 55));
      let stepY = niceStep(fv.yMax - fv.yMin, Math.max(4, this.h / 55));
      if (this.view.equal) stepY = stepX = Math.max(stepX, stepY);

      const xs = [];
      for (let x = Math.ceil(fv.xMin / stepX) * stepX; x <= fv.xMax; x += stepX) xs.push(x);
      const ys = [];
      for (let y = Math.ceil(fv.yMin / stepY) * stepY; y <= fv.yMax; y += stepY) ys.push(y);

      // Полосы под сеткой
      for (const b of this.bands || []) {
        ctx.save();
        ctx.fillStyle = b.color || cssVar('--accent-soft', '#e5eefc');
        ctx.globalAlpha = b.alpha === undefined ? 1 : b.alpha;
        if (b.yMin !== undefined) {
          const [, y1] = this.toPx(0, b.yMax), [, y2] = this.toPx(0, b.yMin);
          ctx.fillRect(0, y1, this.w, y2 - y1);
        } else {
          const [x1] = this.toPx(b.xMin, 0), [x2] = this.toPx(b.xMax, 0);
          ctx.fillRect(x1, 0, x2 - x1, this.h);
        }
        ctx.restore();
      }

      // Сетка
      ctx.lineWidth = 1;
      ctx.strokeStyle = grid;
      ctx.beginPath();
      for (const x of xs) {
        const px = Math.round(this.toPx(x, 0)[0]) + 0.5;
        ctx.moveTo(px, 0); ctx.lineTo(px, this.h);
      }
      for (const y of this.view.noY ? [] : ys) {
        const py = Math.round(this.toPx(0, y)[1]) + 0.5;
        ctx.moveTo(0, py); ctx.lineTo(this.w, py);
      }
      ctx.stroke();

      // Оси
      const [ox, oy] = this.toPx(0, 0);
      ctx.strokeStyle = axis;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, oy); ctx.lineTo(this.w, oy);
      if (!this.view.noY) { ctx.moveTo(ox, 0); ctx.lineTo(ox, this.h); }
      ctx.stroke();

      // Подписи делений (прижимаются к краю, если ось за пределами экрана)
      ctx.fillStyle = muted;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const labelY = Math.min(Math.max(oy + 4, 2), this.h - 16);
      for (const x of xs) {
        if (Math.abs(x) < stepX / 2) continue;
        ctx.fillText(fmtTick(x), this.toPx(x, 0)[0], labelY);
      }
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const labelX = Math.min(Math.max(ox - 4, 30), this.w - 2);
      for (const y of this.view.noY ? [] : ys) {
        if (Math.abs(y) < stepY / 2) continue;
        ctx.fillText(fmtTick(y), labelX, this.toPx(0, y)[1]);
      }

      // Вспомогательные линии (например, ось симметрии)
      for (const l of this.lines) {
        ctx.save();
        ctx.strokeStyle = l.color || axis;
        ctx.lineWidth = l.width || 1.5;
        ctx.lineCap = l.width ? 'round' : 'butt';
        ctx.setLineDash(l.solid ? [] : l.dash || [6, 5]);
        ctx.beginPath();
        const [x1, y1] = this.toPx(l.x1, l.y1);
        const [x2, y2] = this.toPx(l.x2, l.y2);
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      }

      // Кривые
      const limit = (fv.yMax - fv.yMin) * 50;
      for (const c of this.curves) {
        ctx.save();
        ctx.strokeStyle = c.color || cssVar('--curve', '#2f6fdb');
        ctx.lineWidth = c.width || 2.5;
        if (c.dash) ctx.setLineDash(c.dash);
        ctx.beginPath();
        let pen = false;
        let lastPy = 0;
        const n = Math.ceil(this.w * 2);
        for (let i = 0; i <= n; i++) {
          const x = fv.xMin + (fv.xMax - fv.xMin) * (i / n);
          const y = c.fn(x);
          if (!isFinite(y) || Math.abs(y) > limit) { pen = false; continue; }
          const [px, py] = this.toPx(x, y);
          // Разрыв (например, у tg x): не соединяем точки через всю высоту
          if (pen && Math.abs(py - lastPy) > this.h) pen = false;
          if (!pen) { ctx.moveTo(px, py); pen = true; } else { ctx.lineTo(px, py); }
          lastPy = py;
        }
        ctx.stroke();
        ctx.restore();
      }

      // Точки
      for (const p of this.points) {
        const [px, py] = this.toPx(p.x, p.y);
        ctx.fillStyle = p.color || cssVar('--text', '#1f2328');
        ctx.beginPath();
        ctx.arc(px, py, p.r || 5, 0, Math.PI * 2);
        if (p.hollow) {
          // «выколотая» точка: функция в ней не определена
          ctx.save();
          ctx.fillStyle = cssVar('--surface', '#fff');
          ctx.fill();
          ctx.strokeStyle = p.color || cssVar('--text', '#1f2328');
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        } else ctx.fill();
        if (p.label) {
          ctx.font = '600 13px system-ui, sans-serif';
          ctx.textAlign = px > this.w - 80 ? 'right' : 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(p.label, px + (ctx.textAlign === 'right' ? -7 : 7), py - 4);
        }
      }
    }
  }

  global.Plot = Plot;
})(window);
