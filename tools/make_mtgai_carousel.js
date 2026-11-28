#!/usr/bin/env node
/*
Genera un carrusel de placas para @mtgaisolutions (MTG Soluciones IA), 1080x1350 JPEG,
con la marca del manual (azul noche, degradé verde→turquesa→azul→azul profundo, Poppins + Inter, logo principal).

Uso: node tools/make_mtgai_carousel.js datos.json instagram/mtg/AAAA/MM/AAAA-MM-DD_tema
     Agregá --reel para placas verticales 1080x1920 (reels e historias).
     → genera ..._1.jpg, ..._2.jpg, ... (una por placa) y avisa si algún texto no entra.

datos.json:
{
  "cta": "¿Querés saber cómo aplica en tu empresa?",        (opcional; va en la última placa)
  "cta_sub": "Escribinos por mensaje directo · MTG Soluciones IA",  (opcional)
  "slides": [
    {"tipo": "portada", "tag": "Seguridad · Noticia",
     "titulo": "La IA encontró casi [[100 fallas]] en equipos Fortinet",
     "sub": "17 son críticas. ...", "swipe": "Deslizá para ver qué hacer →",
     "grande": "27%"},                                       (grande: opcional, número gigante arriba del título)
    {"tag": "Qué pasó", "titulo": "Fortinet publicó [[89 avisos]] ...",
     "textos": ["Párrafo con **negrita**."],
     "stats": [{"n": "89", "l": "avisos publicados"}],      (2 o 3)
     "lista": ["Paso uno", "Paso dos"],                     (numerada, hasta 4)
     "proscontras": {"pros": ["..."], "contras": ["..."]},  (2 columnas, hasta 3 por lado)
     "chips": ["FortiOS", "FortiMail"],
     "tabla": {"cols": ["", "Hoy", "Desde 1/12"], "filas": [["Entrada", "US$ 2", "US$ 4"]]},
     "nota": "Aclaración con barra al costado.",
     "fuente": "SecurityWeek, 11/11/2026"}
  ]
}
[[texto]] = degradé de marca. **texto** = negrita. Usá 3 a 5 placas; la primera, portada.
*/
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');

const A = path.join(__dirname, 'mtgai_assets');
const REEL = process.argv.includes('--reel');  // 1080x1920 para reels e historias (zonas seguras de Instagram)
const H = REEL ? 1920 : 1350;
const url = f => 'file://' + path.join(A, f);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = s => esc(s).replace(/\[\[(.+?)\]\]/g, '<span class="g">$1</span>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

const REEL_CSS = `
.slide{height:1920px;padding-top:300px}
.content{height:1060px}
.footer{bottom:400px}
.src{bottom:530px}
.swipe,.pg{display:none}
.circuit{top:300px}
`;
const CSS = `
${[400, 500, 600, 700].map(w => `@font-face{font-family:Poppins;font-weight:${w};src:url(${url('Poppins-' + w + '.ttf')})}`).join('\n')}
@font-face{font-family:Inter;font-weight:400;src:url(${url('Inter-Regular.otf')})}
@font-face{font-family:Inter;font-weight:500;src:url(${url('Inter-Medium.otf')})}
@font-face{font-family:Inter;font-weight:600;src:url(${url('Inter-SemiBold.otf')})}
:root{--turq:#00D2C8;--noche:#07152B;--cian:#2DB1CA;--plata:#8E9097;--hielo:#F3F7FA;
--grad:linear-gradient(90deg,#00B48C 0%,#00D2C8 38%,#0668C2 70%,#0A3A8C 100%);
--gradtxt:linear-gradient(90deg,#00B48C 0%,#00D2C8 45%,#2DB1CA 75%,#4a8fe8 100%);}
*{box-sizing:border-box;margin:0;padding:0}
.slide{width:1080px;height:1350px;background:var(--noche);position:relative;overflow:hidden;color:var(--hielo);font-family:Inter,sans-serif;padding:96px 88px 0 88px}
.slide::before{content:"";position:absolute;inset:0;background:
 radial-gradient(900px 700px at 105% -5%, rgba(6,104,194,.38), transparent 60%),
 radial-gradient(700px 600px at -10% 110%, rgba(0,180,140,.20), transparent 60%);}
.circuit{position:absolute;right:-40px;top:120px;opacity:.22}
.topbar{position:absolute;left:0;top:0;height:10px;width:100%;background:var(--grad)}
.content{position:relative;z-index:2;height:1060px;display:flex;flex-direction:column;overflow:hidden}
.tag{font-family:Poppins;font-weight:400;letter-spacing:.32em;font-size:24px;color:var(--turq);text-transform:uppercase;margin-bottom:40px;display:flex;align-items:center;gap:18px}
.tag::before{content:"";width:46px;height:4px;background:var(--grad);border-radius:2px}
h1{font-family:Poppins;font-weight:700;font-size:88px;line-height:1.06;letter-spacing:-.01em;max-width:860px}
h1.small{font-size:64px;margin-top:30px}
h2{font-family:Poppins;font-weight:700;font-size:64px;line-height:1.1;margin-bottom:38px}
.g{background:var(--gradtxt);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{font-size:40px;line-height:1.4;color:#c9d3df;margin-top:48px;max-width:860px}
p.body{font-size:37px;line-height:1.5;color:#dbe4ee;margin-bottom:30px}
b{color:#fff;font-weight:600}
.stats{display:flex;gap:24px;margin:10px 0 24px}
.stat{flex:1;border:2px solid rgba(45,177,202,.35);border-radius:28px;padding:32px 30px;background:rgba(10,58,140,.22)}
.stat .n{font-family:Poppins;font-weight:700;font-size:78px;line-height:1}
.stat .l{font-size:28px;color:#b9c4d2;margin-top:14px;line-height:1.3}
.list{list-style:none;margin:6px 0 10px}
.list li{display:flex;gap:28px;align-items:flex-start;font-size:36px;line-height:1.4;margin-bottom:30px;color:#e6edf5}
.num{flex:0 0 62px;height:62px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-family:Poppins;font-weight:700;font-size:30px;color:#fff}
.pc{display:flex;gap:24px;margin:6px 0 20px}
.pc>div{flex:1;border-radius:28px;padding:30px 28px;background:rgba(10,58,140,.22);border:2px solid rgba(45,177,202,.3)}
.pc h3{font-family:Poppins;font-weight:600;font-size:32px;margin-bottom:18px}
.pc .pro h3{color:#00D2C8}.pc .con h3{color:#ff8a7a}
.pc li{list-style:none;font-size:30px;line-height:1.38;margin-bottom:18px;color:#e6edf5;padding-left:34px;position:relative}
.pc .pro li::before{content:"+";position:absolute;left:0;color:#00D2C8;font-weight:700}
.pc .con li::before{content:"–";position:absolute;left:0;color:#ff8a7a;font-weight:700}
.chips{display:flex;flex-wrap:wrap;gap:16px;margin:6px 0 20px}
.chip{font-family:Poppins;font-weight:500;font-size:28px;padding:12px 26px;border-radius:999px;border:2px solid rgba(0,210,200,.5);color:var(--turq)}
.note{font-size:30px;line-height:1.45;color:#aeb9c7;border-left:6px solid var(--cian);padding:8px 0 8px 28px;margin-top:14px}
.big{font-family:Poppins;font-weight:700;font-size:290px;line-height:.95;letter-spacing:-.03em}
table{width:100%;border-collapse:collapse;margin:6px 0 30px}
td,th{font-size:34px;padding:24px 18px;border-bottom:2px solid rgba(142,144,151,.3);text-align:left}
th{font-family:Poppins;font-weight:500;font-size:24px;letter-spacing:.1em;text-transform:uppercase;color:var(--plata)}
td:nth-child(2){color:var(--turq);font-family:Poppins;font-weight:600}
td:nth-child(3){color:#fff;font-family:Poppins;font-weight:700}
.cta{margin-top:auto;margin-bottom:10px;border-radius:30px;padding:32px 38px;background:var(--grad);font-family:Poppins;font-weight:600;font-size:35px;line-height:1.3;color:#fff;flex-shrink:0}
.cta small{display:block;font-family:Inter;font-weight:500;font-size:27px;opacity:.95;margin-top:6px}
.swipe{margin-top:auto;margin-bottom:20px;font-family:Poppins;font-size:30px;color:var(--turq);letter-spacing:.06em}
.footer{position:absolute;left:88px;right:88px;bottom:56px;display:flex;align-items:flex-end;justify-content:space-between;z-index:3}
.footer img{width:200px;display:block}
.footer .right{text-align:right;font-family:Poppins;color:var(--plata);font-size:24px;line-height:1.5}
.footer .pg{color:var(--hielo);font-weight:600;font-size:26px;letter-spacing:.1em}
.src{position:absolute;left:88px;right:88px;bottom:190px;font-size:22px;color:#7f8a99;z-index:3}
`;

const CIRCUIT = `<svg class="circuit" width="520" height="720" viewBox="0 0 520 720" fill="none" stroke="#2DB1CA" stroke-width="4">
<path d="M480 0 V180 L360 260 V420 L240 500 V720"/><path d="M420 0 V120 L300 200 V330"/><path d="M520 300 H440 L380 360 V560"/>
<circle cx="360" cy="260" r="12" fill="#2DB1CA"/><circle cx="300" cy="330" r="10" fill="#2DB1CA"/><circle cx="240" cy="500" r="12" fill="#2DB1CA"/>
<circle cx="380" cy="560" r="14" fill="#07152B"/><circle cx="440" cy="300" r="9" fill="#2DB1CA"/></svg>`;

function slideHTML(s, i, total, d) {
  let c = `<div class="tag">${esc(s.tag || '')}</div>`;
  if (s.tipo === 'portada') {
    if (s.grande) c += `<div class="big g">${esc(s.grande)}</div><h1 class="small">${fmt(s.titulo)}</h1>`;
    else c += `<h1>${fmt(s.titulo)}</h1>`;
    if (s.sub) c += `<div class="sub">${fmt(s.sub)}</div>`;
    c += `<div class="swipe">${esc(s.swipe || 'Deslizá →')}</div>`;
  } else {
    if (s.titulo) c += `<h2>${fmt(s.titulo)}</h2>`;
    (s.textos || []).forEach(t => c += `<p class="body">${fmt(t)}</p>`);
    if (s.stats) c += `<div class="stats">${s.stats.map(x => `<div class="stat"><div class="n g">${esc(x.n)}</div><div class="l">${fmt(x.l)}</div></div>`).join('')}</div>`;
    if (s.proscontras) c += `<div class="pc"><div class="pro"><h3>A favor</h3><ul>${s.proscontras.pros.map(x => `<li>${fmt(x)}</li>`).join('')}</ul></div><div class="con"><h3>En contra</h3><ul>${s.proscontras.contras.map(x => `<li>${fmt(x)}</li>`).join('')}</ul></div></div>`;
    if (s.lista) c += `<ul class="list">${s.lista.map((x, k) => `<li><span class="num">${k + 1}</span><span>${fmt(x)}</span></li>`).join('')}</ul>`;
    if (s.chips) c += `<div class="chips">${s.chips.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>`;
    if (s.tabla) c += `<table><tr>${s.tabla.cols.map(x => `<th>${esc(x)}</th>`).join('')}</tr>${s.tabla.filas.map(f => `<tr>${f.map(x => `<td>${fmt(x)}</td>`).join('')}</tr>`).join('')}</table>`;
    if (s.nota) c += `<div class="note">${fmt(s.nota)}</div>`;
  }
  const last = i === total - 1;
  if (last && s.tipo !== 'portada') c += `<div class="cta">${esc(d.cta || '¿Querés saber cómo aplica en tu empresa?')}<small>${esc(d.cta_sub || 'Escribinos por mensaje directo · MTG Soluciones IA')}</small></div>`;
  return `<section class="slide"><div class="topbar"></div>${s.tipo === 'portada' ? CIRCUIT : ''}<div class="content">${c}</div>`
    + (s.fuente && !last ? `<div class="src">Fuente: ${esc(s.fuente)}</div>` : '')
    + `<div class="footer"><img src="${url('logo_principal_fondo-oscuro.png')}"><div class="right"><div class="pg">${i + 1}/${total}</div>@mtgaisolutions</div></div></section>`;
}

(async () => {
  const [json, prefix] = process.argv.slice(2).filter(a => a !== '--reel');
  if (!json || !prefix) { console.error('Uso: node tools/make_mtgai_carousel.js datos.json salida_prefijo'); process.exit(1); }
  const d = JSON.parse(fs.readFileSync(json, 'utf8'));
  const n = d.slides.length;
  if (n < 2 || n > 10) throw new Error('Un carrusel lleva de 2 a 10 placas');
  fs.mkdirSync(path.dirname(path.resolve(prefix)), { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  let warn = 0;
  for (let i = 0; i < n; i++) {
    const tmp = path.join(require('os').tmpdir(), `mtgai_slide_${process.pid}_${i}.html`);
    fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}${REEL ? REEL_CSS : ''}</style></head><body>${slideHTML(d.slides[i], i, n, d)}</body></html>`);
    await p.goto('file://' + tmp, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const over = await p.evaluate(() => { const c = document.querySelector('.content'); return c.scrollHeight - c.clientHeight; });
    if (over > 2) { warn++; console.warn(`⚠️ Placa ${i + 1}: el texto no entra (sobran ${over}px). Acortalo.`); }
    const out = `${prefix}_${i + 1}.jpg`;
    await p.locator('.slide').screenshot({ path: out, type: 'jpeg', quality: 92 });
    console.log(out);
    fs.unlinkSync(tmp);
  }
  await b.close();
  process.exit(warn ? 2 : 0);
})();
