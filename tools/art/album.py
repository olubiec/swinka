"""Builds docs/album/index.html: one self-contained page (no server needed) to browse every sprite, animation, breed, coat,
icon, screen and room decor of Cuy. Sprite sheets and screenshots are embedded as data URIs.
Usage: python album.py [shots_dir] [decor_dir]   (screenshots are optional; they come from the Playwright review scripts)"""
import base64, glob, io, json, os, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
A = os.path.join(ROOT, 'assets')
SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
DECOR = sys.argv[2] if len(sys.argv) > 2 else None
STAGES = ['baby', 'junior', 'adult', 'senior', 'legend']
BREEDS = ['smooth_normal', 'smooth_chubby', 'smooth_lean', 'teddy_normal', 'teddy_chubby', 'rosette_normal', 'rosette_lean', 'peruvian_normal']


def b64(path):
    return 'data:image/png;base64,' + base64.b64encode(open(path, 'rb').read()).decode()


def small_png(path, colors=96):
    im = Image.open(path).convert('RGB').quantize(colors, method=Image.Quantize.MEDIANCUT)
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


sheets = {}
for b in BREEDS:
    for st in STAGES:
        p = os.path.join(A, 'sprites', st, 'spritesheet.png') if b == 'smooth_normal' else os.path.join(A, 'sprites', 'breeds', b, st, 'spritesheet.png')
        sheets[b + '/' + st] = b64(p)
for comp in ('companion_agouti', 'companion_black_white', 'companion_cream'):
    sheets[comp] = b64(os.path.join(A, 'sprites', comp, 'spritesheet.png'))
meta = json.load(open(os.path.join(A, 'sprites', 'adult', 'animations.json')))['animations']
meta.update(json.load(open(os.path.join(A, 'sprites', 'adult', 'rotation.json')))['strips'])   # turn_smooth, idle_34
anims = [{'name': n, 'row': v['row'], 'col': v.get('col', 0), 'frames': v['frames'], 'fps': v['fps'], 'loop': v['loop'], 'desc': v['description']} for n, v in meta.items()]
palettes = json.load(open(os.path.join(A, 'sprites', 'palettes.json')))
icons = json.load(open(os.path.join(A, 'icons', 'icons.json')))['icons']
iconsheet = b64(os.path.join(A, 'icons', 'icons_16.png'))
app_icons = {n: b64(os.path.join(A, 'app-icon', n)) for n in ('icon_256.png', 'logo_256.png', 'icon_32.png', 'icon_16.png')}

CAPTIONS = {
    'feat_achievements': 'Osiagniecia', 'feat_calendar': 'Kalendarz opieki', 'feat_coloring': 'Kolorowanki (9 paczek)', 'feat_daily': 'Prezent dzienny',
    'feat_decor': 'Dekoracje pokoju', 'feat_diary': 'Pamietnik', 'feat_pigs': 'Moje swinki', 'feat_settings': 'Ustawienia i aktualizacje',
    'feat_shop': 'Sklep', 'feat_tricks': 'Sztuczki', 'feat_vet': 'Lecznica', 'g_hub': 'Gry: lista', 'g_veggie_rain': 'Gra: Veggie Rain',
    'g_nyan_cuy': 'Gra: Nyan Cuy', 'g_veggie_memory': 'Gra: Veggie Memory', 'g_hay_maze': 'Gra: Hay Maze (swinka ze spritea, sciany z siana)',
    'pigs_roster_feat': 'Moje swinki: 5 ras i umaszczen', 'pigs_roster_home': 'Dom: peruwianska albinoska',
    'home_a_senior_home': 'Dom: senior, peruwianska albinoska', 'home_b_adult_home': 'Dom: dorosla rosette dutch',
    'home_c_junior_home': 'Dom: junior chubby cinnamon', 'home_d_baby_home': 'Dom: maluch skinny agouti',
}
shots = []
if SHOTS:
    for f in sorted(glob.glob(os.path.join(SHOTS, '*.png'))):
        k = os.path.basename(f)[:-4]
        shots.append({'name': CAPTIONS.get(k, k), 'src': small_png(f)})
decor = []
DECOR = DECOR or os.path.join(ROOT, 'docs', 'album', 'decor')
if os.path.isdir(DECOR):
    for f in sorted(glob.glob(os.path.join(DECOR, '*.png'))):
        k = os.path.basename(f)[6:-4]
        decor.append({'name': k, 'src': small_png(f, 64)})

pigs = [{'name': n.capitalize(), 'src': small_png(os.path.join(ROOT, 'docs', 'album', 'compare', n + '.png'), 160)}
        for n in ('ned', 'kuki', 'glen', 'james', 'racuch') if os.path.exists(os.path.join(ROOT, 'docs', 'album', 'compare', n + '.png'))]
coats = ['tricolor.ginger', 'dutch.chestnut', 'himalayan.black', 'roan.agouti', 'self.cinnamon', 'self.albino_pink', 'self.cream', 'dutch.black', 'bicolor_head.chocolate',
         'two_tone.ginger', 'self.black', 'roan.slate', 'saddle.ginger', 'saddle.chocolate', 'two_tone.chestnut', 'bicolor_head.black']
data = {'coats': coats, 'pigs': pigs, 'sheets': sheets, 'anims': anims, 'palettes': palettes, 'icons': icons, 'iconsheet': iconsheet, 'app': app_icons,
        'stages': STAGES, 'breeds': BREEDS, 'shots': shots, 'decor': decor}

HTML = r'''<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Album Cuy</title>
<style>
:root{--bg:#f6ecdd;--card:#fffaf0;--ink:#3a1d17;--mut:#7a5a4a;--acc:#e98c42;--line:#d9c3a5}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#241d1a;--card:#2f2622;--ink:#f6ecdd;--mut:#c9b49b;--acc:#f0a45e;--line:#4a3a30}}
:root[data-theme="dark"]{--bg:#241d1a;--card:#2f2622;--ink:#f6ecdd;--mut:#c9b49b;--acc:#f0a45e;--line:#4a3a30}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.4 system-ui,sans-serif}
header{padding:16px;border-bottom:2px solid var(--line)}h1{margin:0 0 4px;font-size:20px}p.sub{margin:0;color:var(--mut)}
nav{display:flex;gap:6px;flex-wrap:wrap;padding:10px 16px;position:sticky;top:0;background:var(--bg);z-index:5;border-bottom:1px solid var(--line)}
nav button{border:2px solid var(--ink);background:var(--card);color:var(--ink);border-radius:6px;padding:6px 10px;cursor:pointer;font:inherit}
nav button.on{background:var(--acc);color:#2b1712}
main{padding:16px;max-width:1280px;margin:0 auto}section{display:none}section.on{display:block}
.bar{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:12px}.bar label{display:flex;gap:6px;align-items:center}
select,input[type=range]{font:inherit}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.tile{background:var(--card);border:2px solid var(--line);border-radius:8px;padding:8px;text-align:center}
.tile canvas,.tile img{image-rendering:pixelated;max-width:100%}
.tile b{display:block;font-size:12px}.tile small{color:var(--mut);display:block;font-size:11px}
.icon{width:64px;height:64px;image-rendering:pixelated;background-repeat:no-repeat;margin:0 auto}
.shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.shots figure{margin:0;background:var(--card);border:2px solid var(--line);border-radius:8px;padding:8px}
.shots img{width:100%;image-rendering:pixelated}.shots figcaption{margin-top:6px;font-size:12px}
#pigs{grid-template-columns:1fr}table{border-collapse:collapse}td,th{padding:4px 6px;text-align:center}
#big{position:fixed;inset:0;background:rgba(0,0,0,.7);display:none;align-items:center;justify-content:center;z-index:20;flex-direction:column;gap:10px;color:#fff}
#big.on{display:flex}#big canvas{image-rendering:pixelated;background:#f0e6d4;border-radius:8px}
</style></head><body>
<header><h1>Cuy - album grafik i animacji</h1><p class="sub">Jeden plik, otwiera sie bez serwera. Animacje, rasy, umaszczenia, ikony, ekrany i dekoracje pokoju. Wygenerowano skryptem tools/art/album.py.</p></header>
<nav id="nav"></nav>
<main>
<section id="s-pigs"><p class="sub">Ned, Kuki, Glen, James i Racuch: zdjecia wlascicielki/wlasciciela obok sprite'ow (idle, walk, jedzenie, przod, 3/4, obrot) i etapy zycia baby-junior-adult-senior-legend.</p><div class="shots" id="pigs"></div></section>
<section id="s-anim"><div class="bar">
 <label>Etap <select id="stage"></select></label><label>Rasa <select id="breed"></select></label><label>Umaszczenie <select id="pal"></select></label>
 <label>Predkosc <input type="range" id="speed" min="25" max="200" value="100"><span id="speedv">100%</span></label>
 <label>Szukaj <input id="q" placeholder="np. sleep"></label></div>
 <p class="sub">Kliknij kafelek, zeby zobaczyc animacje duza, klatka po klatce. Wszystkie 60 animacji, tak jak gra je odtwarza (senior i legend wolniejsze).</p>
 <div class="grid" id="anims"></div></section>
<section id="s-breed"><div class="bar"><label>Umaszczenie <select id="pal2"></select></label><label>Animacja <select id="anim2"></select></label></div>
 <p class="sub">Ksztalty = rasa x budowa (wiersze) x etapy zycia (kolumny). Skinny (lysa) odrzucona, stare id skinny = smooth_lean.</p><div id="breedgrid"></div></section>
<section id="s-coat"><p class="sub">Umaszczenia (wzor.paleta): podmiana kolorow z palettes.json na arkuszu glownym kodowanym strefami. Wiersz = umaszczenie, kolumny = etapy zycia (ksztalt smooth_normal, idle).</p><div id="coatgrid"></div></section>
<section id="s-icons"><p class="sub" id="iconsub"></p><div class="grid" id="icons"></div></section>
<section id="s-shots"><p class="sub">Ekrany Domku, funkcje i gry (zrzuty z przegladarki 400x620 / 420x640).</p><div class="shots" id="shots"></div></section>
<section id="s-decor"><p class="sub">Sklep domku: 40 przedmiotow w scenie 240x130 (gora przycieta jak na ekranie), 6 zestawow przykladowych.</p><div class="shots" id="decor"></div></section>
<section id="s-app"><p class="sub">Ikona aplikacji.</p><div class="grid" id="app"></div></section>
</main>
<div id="big"><canvas id="bigc" width="384" height="384"></canvas><div id="bigt"></div><div><button id="bprev">&lt;</button> <button id="bplay">pauza</button> <button id="bnext">&gt;</button> <button id="bclose">zamknij</button></div></div>
<script>
const D=__DATA__;
const SLOW=new Set(['walk','run','popcorn','follow','flee','greet','hurdle','spin','ball_push','tunnel_in','tunnel_out','house_enter','house_exit','come_called','dance']);
const imgs={};function img(key){if(imgs[key])return imgs[key];const i=new Image();i.src=D.sheets[key];imgs[key]=i;return i}
const hex=h=>{const n=parseInt(h.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255]};
const cache={};
function sheetFor(key,pal0){const pal=(key.endsWith('/senior')&&D.palettes.palettes[pal0+'@senior'])?pal0+'@senior':pal0;const ck=key+'|'+pal;if(cache[ck])return cache[ck];const i=img(key);if(!i.complete||!i.naturalWidth)return null;
 const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const x=c.getContext('2d');x.drawImage(i,0,0);
 const pairs=D.palettes.palettes[pal]||[];if(pairs.length){const d=x.getImageData(0,0,c.width,c.height),p=d.data,m={};
  pairs.forEach(a=>{const f=hex(a[0]);m[(f[0]<<16)|(f[1]<<8)|f[2]]=hex(a[1])});
  for(let k=0;k<p.length;k+=4){if(p[k+3]!==255)continue;const t=m[(p[k]<<16)|(p[k+1]<<8)|p[k+2]];if(t){p[k]=t[0];p[k+1]=t[1];p[k+2]=t[2]}}x.putImageData(d,0,0)}
 cache[ck]=c;return c}
function opt(sel,vals,def){sel.innerHTML=vals.map(v=>`<option${v===def?' selected':''}>${v}</option>`).join('')}
const pals=Object.keys(D.palettes.palettes).filter(k=>!k.includes('@'));
// tabs
const tabs=[['pigs','Piec swinek'],['anim','Animacje (60 + obrot)'],['breed','Rasy x etapy'],['coat','Umaszczenia'],['icons','Ikony ('+Object.keys(D.icons).length+')'],['shots','Ekrany i gry'],['decor','Sklep domku (40)'],['app','Ikona aplikacji']];
const nav=document.getElementById('nav');tabs.forEach(([id,t],i)=>{const b=document.createElement('button');b.textContent=t;b.onclick=()=>show(id);b.dataset.id=id;nav.appendChild(b)});
function show(id){document.querySelectorAll('section').forEach(s=>s.classList.toggle('on',s.id==='s-'+id));nav.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.id===id));history.replaceState(null,'','#'+id)}
// animations
const st=document.getElementById('stage'),br=document.getElementById('breed'),pl=document.getElementById('pal'),sp=document.getElementById('speed'),q=document.getElementById('q');
opt(st,D.stages,'adult');opt(br,D.breeds,'smooth_normal');opt(pl,pals,'saddle.ginger');
const grid=document.getElementById('anims');let tiles=[];
function build(){grid.innerHTML='';tiles=D.anims.filter(a=>a.name.includes(q.value.trim())).map(a=>{const t=document.createElement('div');t.className='tile';
 const c=document.createElement('canvas');c.width=64;c.height=64;c.style.width='128px';c.style.height='128px';c.style.background='#f0e6d4';c.style.borderRadius='6px';
 t.appendChild(c);t.insertAdjacentHTML('beforeend',`<b>${a.name}</b><small>${a.frames} kl. | ${a.fps} fps${a.loop?' | petla':''}</small><small>${a.desc}</small>`);
 t.onclick=()=>openBig(a);grid.appendChild(t);return{a,c,ctx:c.getContext('2d'),f:0,acc:0}})}
function fpsOf(a){let f=a.fps;if((st.value==='senior'||st.value==='legend')&&SLOW.has(a.name))f=Math.max(1,Math.round(f*0.8));return f*sp.value/100}
let last=performance.now();
function frame(now){const dt=now-last;last=now;const s=sheetFor(br.value+'/'+st.value,pl.value);
 if(s&&document.getElementById('s-anim').classList.contains('on')){tiles.forEach(t=>{t.acc+=dt;const fd=1000/fpsOf(t.a);while(t.acc>=fd){t.acc-=fd;t.f=(t.f+1)%t.a.frames}
  t.ctx.clearRect(0,0,64,64);t.ctx.drawImage(s,(t.a.col+t.f)*64,t.a.row*64,64,64,0,0,64,64)})}
 if(big.on&&s)drawBig(dt);requestAnimationFrame(frame)}
[st,br,pl,sp,q].forEach(e=>e.oninput=()=>{document.getElementById('speedv').textContent=sp.value+'%';if(e===q)build()});
// big view
const big={on:false,a:null,f:0,acc:0,play:true},bigEl=document.getElementById('big'),bc=document.getElementById('bigc').getContext('2d');
function openBig(a){big.on=true;big.a=a;big.f=0;big.acc=0;big.play=true;bigEl.classList.add('on');document.getElementById('bplay').textContent='pauza'}
function drawBig(dt){const s=sheetFor(br.value+'/'+st.value,pl.value);if(!s)return;if(big.play){big.acc+=dt;const fd=1000/fpsOf(big.a);while(big.acc>=fd){big.acc-=fd;big.f=(big.f+1)%big.a.frames}}
 bc.imageSmoothingEnabled=false;bc.clearRect(0,0,384,384);bc.drawImage(s,(big.a.col+big.f)*64,big.a.row*64,64,64,0,0,384,384);
 document.getElementById('bigt').textContent=big.a.name+' - klatka '+(big.f+1)+'/'+big.a.frames+' - '+big.a.desc}
document.getElementById('bclose').onclick=()=>{big.on=false;bigEl.classList.remove('on')};
document.getElementById('bplay').onclick=e=>{big.play=!big.play;e.target.textContent=big.play?'pauza':'graj'};
document.getElementById('bprev').onclick=()=>{big.play=false;big.f=(big.f+big.a.frames-1)%big.a.frames;document.getElementById('bplay').textContent='graj'};
document.getElementById('bnext').onclick=()=>{big.play=false;big.f=(big.f+1)%big.a.frames;document.getElementById('bplay').textContent='graj'};
// breeds x stages
const pal2=document.getElementById('pal2'),an2=document.getElementById('anim2');opt(pal2,pals,'saddle.ginger');opt(an2,D.anims.map(a=>a.name),'idle');
let bgrid=[];function buildBreeds(){const root=document.getElementById('breedgrid');root.innerHTML='';bgrid=[];const t=document.createElement('table');
 t.innerHTML='<tr><th></th>'+D.stages.map(s=>`<th>${s}</th>`).join('')+'</tr>';D.breeds.forEach(b=>{const tr=document.createElement('tr');tr.innerHTML=`<th>${b}</th>`;
 D.stages.forEach(s=>{const td=document.createElement('td');const c=document.createElement('canvas');c.width=64;c.height=64;c.style.cssText='width:128px;height:128px;image-rendering:pixelated;background:#f0e6d4;border-radius:6px';td.appendChild(c);tr.appendChild(td);bgrid.push({c,key:b+'/'+s,f:0,acc:0})});t.appendChild(tr)});root.appendChild(t)}
function breedFrame(dt){const a=D.anims.find(x=>x.name===an2.value);bgrid.forEach(g=>{const s=sheetFor(g.key,pal2.value);if(!s)return;g.acc+=dt;const fd=1000/a.fps;while(g.acc>=fd){g.acc-=fd;g.f=(g.f+1)%a.frames}
 const x=g.c.getContext('2d');x.clearRect(0,0,64,64);x.drawImage(s,(a.col+g.f)*64,a.row*64,64,64,0,0,64,64)})}
// coats
function buildCoats(){const root=document.getElementById('coatgrid');root.innerHTML='';const t=document.createElement('table');t.innerHTML='<tr><th></th>'+D.stages.map(s=>`<th>${s}</th>`).join('')+'</tr>';
 D.coats.forEach(p=>{const tr=document.createElement('tr');tr.innerHTML=`<th>${p}</th>`;D.stages.forEach(s=>{const td=document.createElement('td');const c=document.createElement('canvas');c.width=64;c.height=64;c.style.cssText='width:112px;height:112px;image-rendering:pixelated;background:#f0e6d4;border-radius:6px';td.appendChild(c);tr.appendChild(td);coat.push({c,key:'smooth_normal/'+s,p})});t.appendChild(tr)});root.appendChild(t)}
const coat=[];function paintCoats(){coat.forEach(g=>{const s=sheetFor(g.key,g.p);if(!s||g.done)return;const x=g.c.getContext('2d');x.clearRect(0,0,64,64);x.drawImage(s,0,0,64,64,0,0,64,64);g.done=true})}
// icons
const ic=document.getElementById('icons');const names=Object.keys(D.icons);document.getElementById('iconsub').textContent=names.length+' ikon 16x16 (arkusz icons_16.png); numer = indeks w arkuszu.';
names.forEach(n=>{const i=D.icons[n];const t=document.createElement('div');t.className='tile';t.innerHTML=`<div class="icon" style="background-image:url(${D.iconsheet});background-size:${names.length*64}px 64px;background-position:${-i*64}px 0"></div><b>${n}</b><small>#${i}</small>`;ic.appendChild(t)});
// shots, decor, app
function figs(id,list){const r=document.getElementById(id);if(!list.length){r.textContent='Brak zrzutow w tej wersji albumu.';return}list.forEach(s=>{const f=document.createElement('figure');f.innerHTML=`<img src="${s.src}" alt=""><figcaption>${s.name}</figcaption>`;r.appendChild(f)})}
figs('pigs',D.pigs);figs('shots',D.shots);figs('decor',D.decor.map(d=>({name:d.name.replace(/_/g,' '),src:d.src})));
const app=document.getElementById('app');Object.entries(D.app).forEach(([n,s])=>{const t=document.createElement('div');t.className='tile';t.innerHTML=`<img src="${s}" style="width:128px;height:128px"><b>${n}</b>`;app.appendChild(t)});
// main loop
opt(document.getElementById('pal2'),pals,'saddle.ginger');
build();buildBreeds();buildCoats();[pal2,an2].forEach(e=>e.oninput=()=>{bgrid.forEach(g=>{g.f=0;g.acc=0})});
let lastB=performance.now();(function loop(now){const dt=now-lastB;lastB=now;if(document.getElementById('s-breed').classList.contains('on'))breedFrame(dt);if(document.getElementById('s-coat').classList.contains('on'))paintCoats();requestAnimationFrame(loop)})(performance.now());
show((location.hash||'#anim').slice(1)||'anim');requestAnimationFrame(frame);
</script></body></html>'''

out = os.path.join(ROOT, 'docs', 'album', 'index.html')
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w', encoding='utf-8').write(HTML.replace('__DATA__', json.dumps(data)))
print('wrote', out, round(os.path.getsize(out) / 1e6, 1), 'MB')
