"use strict";
/* ============================================================
   OCUPAÇÃO: onde já tem edifício, via ou campo
   ============================================================ */
function criaOcupacao() {
  const obbs = criaHash(32), vias = criaHash(32), campos = criaHash(48);
  return {
    // o retângulo cabe sem encostar em edifícios (margem) nem em vias (folga além da beira)?
    livre(o, margem, folgaVia, ignora) {
      const R = Math.hypot(o.hw, o.hd) + margem + 1;
      let ok = true;
      obbs.busca(o.x - R, o.z - R, o.x + R, o.z + R, b => { if (b !== ignora && obbSobrepoe(o, b, margem)) { ok = false; return false; } });
      if (!ok) return false;
      const R2 = R + 8 + folgaVia;
      vias.busca(o.x - R2, o.z - R2, o.x + R2, o.z + R2, s => {
        const q = distPontoSeg(o.x, o.z, s.ax, s.az, s.bx, s.bz);
        if (q.d > R + s.hw + folgaVia) return;
        let nx = o.x - q.cx, nz = o.z - q.cz; const L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L;
        const e = o.hw * Math.abs(o.c * nx + o.s * nz) + o.hd * Math.abs(-o.s * nx + o.c * nz);
        if (q.d < s.hw + e + folgaVia) { ok = false; return false; }
        // a via pode passar pelo meio do retângulo: confere os pontos da via
        if (pontoNoObb(o, q.cx, q.cz, s.hw + folgaVia)) { ok = false; return false; }
      });
      return ok;
    },
    // ponto dentro de algum edifício ou muro?
    ocupado(x, z, folga) { let s = false; obbs.busca(x - 12, z - 12, x + 12, z + 12, o => { if (pontoNoObb(o, x, z, folga)) { s = true; return false; } }); return s; },
    poe(o) { const R = Math.hypot(o.hw, o.hd) + 8; obbs.add(o, o.x - R, o.z - R, o.x + R, o.z + R); },   // folga de 8 m: o edifício ainda pode crescer
    poeVia(via) {
      const hw = via.larg / 2;
      for (let i = 1; i < via.pts.length; i++) {
        const [ax, az] = via.pts[i - 1], [bx, bz] = via.pts[i];
        const s = { ax, az, bx, bz, hw, via };
        vias.add(s, Math.min(ax, bx) - hw, Math.min(az, bz) - hw, Math.max(ax, bx) + hw, Math.max(az, bz) + hw);
      }
    },
    // via mais perto do ponto (até a distância dada), ignorando uma via
    viaPerto(x, z, dist, ignorar) {
      let melhor = null, md = Infinity;
      vias.busca(x - dist - 8, z - dist - 8, x + dist + 8, z + dist + 8, s => {
        if (s.via === ignorar) return;
        const q = distPontoSeg(x, z, s.ax, s.az, s.bx, s.bz), d = q.d - s.hw;
        if (d < dist && d < md) { md = d; melhor = s; }
      });
      return melhor;
    },
    // a linha entre dois pontos passa por dentro de algum edifício? (ignora o que está a menos de "pontas" metros das pontas)
    linhaCortada(ax, az, bx, bz, pontas) {
      const L = Math.hypot(bx - ax, bz - az) || 1, f = Math.min(.45, pontas / L);
      let cortada = false;
      obbs.busca(Math.min(ax, bx) - 2, Math.min(az, bz) - 2, Math.max(ax, bx) + 2, Math.max(az, bz) + 2, o => {
        const rx = ax - o.x, rz = az - o.z, dx = bx - ax, dz = bz - az;
        const u0 = rx * o.c + rz * o.s, v0 = -rx * o.s + rz * o.c, du = dx * o.c + dz * o.s, dv = -dx * o.s + dz * o.c;
        let t0 = 0, t1 = 1;
        for (const [p, d, h] of [[u0, du, o.hw], [v0, dv, o.hd]]) {
          if (Math.abs(d) < 1e-9) { if (p < -h || p > h) return; continue; }
          let a1 = (-h - p) / d, a2 = (h - p) / d; if (a1 > a2) [a1, a2] = [a2, a1];
          t0 = Math.max(t0, a1); t1 = Math.min(t1, a2); if (t0 > t1) return;
        }
        if (t1 > f && t0 < 1 - f) { cortada = true; return false; }
      });
      return cortada;
    },
    edificiosPerto(x, z, dist, fn) {
      obbs.busca(x - dist - 2, z - dist - 2, x + dist + 2, z + dist + 2, b => { if (b.e && pontoNoObb(b, x, z, dist)) fn(b.e); });
    },
    edificioPerto(x, z, dist) {
      let achou = false;
      obbs.busca(x - dist - 2, z - dist - 2, x + dist + 2, z + dist + 2, b => { if (pontoNoObb(b, x, z, dist)) { achou = true; return false; } });
      return achou;
    },
    campoLivre(o, margem) {
      const R = Math.hypot(o.hw, o.hd) + margem + 1; let ok = true;
      campos.busca(o.x - R, o.z - R, o.x + R, o.z + R, b => { if (obbSobrepoe(o, b, margem)) { ok = false; return false; } });
      return ok;
    },
    poeCampo(o) { const R = Math.hypot(o.hw, o.hd); campos.add(o, o.x - R, o.z - R, o.x + R, o.z + R); },
    noCampo(x, z) {
      let achou = false;
      campos.busca(x - 50, z - 50, x + 50, z + 50, b => { if (pontoNoObb(b, x, z, 1)) { achou = true; return false; } });
      return achou;
    }
  };
}
