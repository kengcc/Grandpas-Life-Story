const $ = id => document.getElementById(id);
let current = 0;
try { current = Math.min(9, Math.max(0, Number(localStorage.getItem('tiancai-page')) || 0)); } catch {}
const positions = ['0% 0%', '100% 0%', '0% 100%', '100% 100%'];
const asset = i => STORY[i].artwork || `assets/page-${String(i + 1).padStart(2, '0')}.png`;
let prefetchGeneration = 0;
function prefetchNextPage() {
  const generation = ++prefetchGeneration;
  const connection = navigator.connection;
  if (current >= STORY.length - 1 || connection?.saveData || /^(slow-)?2g$/.test(connection?.effectiveType)) return;
  const page = current;
  // Let the visible artwork and cover finish before using bandwidth for the next page.
  const visible = new Image();
  visible.onload = () => {
    const schedule = () => {
      const preload = () => {
        if (generation !== prefetchGeneration) return;
        const next = new Image();
        next.fetchPriority = 'low';
        next.src = asset(page + 1);
      };
      if ('requestIdleCallback' in window) requestIdleCallback(preload, { timeout: 3000 });
      else setTimeout(preload, 500);
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
  };
  visible.src = asset(page);
}
const esc = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const prose = text => text.split(/\n\n/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');
const paragraphList = paragraphs => paragraphs.map(p => `<p>${esc(p)}</p>`).join('');

function panelHTML(chapter, i, j, print = false) {
  const [label, caption] = chapter.frames[j];
  const art = `<div role="img" aria-label="${esc(label)}" class="panel-art" style="background-image:url('${asset(i)}');background-position:${positions[j]}"></div>`;
  return `<figure class="comic-panel">${print ? `<div>${art}</div>` : `<button class="art-button" data-panel="${j}" aria-label="放大：${esc(label)}">${art}</button>`}<figcaption tabindex="0" role="region" aria-label="${esc(label)}原文"><span class="frame-label">${String(i * 4 + j + 1).padStart(2, '0')} / 40</span><div class="caption-prose source-prose">${prose(caption)}</div></figcaption></figure>`;
}

function render(scroll = false) {
  const chapter = STORY[current];
  $('era').textContent = chapter.era;
  $('readerHeading').textContent = chapter.title;
  $('topCounter').textContent = `${String(current + 1).padStart(2, '0')} / 10`;
  $('chapterSelect').value = current;
  $('comicPage').innerHTML = chapter.frames.map((_, j) => panelHTML(chapter, current, j)).join('');
  $('prev').disabled = current === 0;
  $('next').disabled = false;
  $('next').textContent = current === 9 ? '阅读后记 →' : '下一页 →';
  $('dots').textContent = `${current + 1} / ${STORY.length}`;
  try { localStorage.setItem('tiancai-page', String(current)); } catch {}
  $('comicPage').querySelectorAll('[data-panel]').forEach(b => b.addEventListener('click', () => openPanel(Number(b.dataset.panel))));
  $('dots').querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => go(Number(b.dataset.page))));
  if (scroll) jumpToReader();
  prefetchNextPage();
}
function jumpToReader() {
  const top = Math.max(0, window.scrollY + $('reader').getBoundingClientRect().top - 12);
  window.scrollTo({top, behavior: 'instant'});
}
function go(i) { current = Math.min(9, Math.max(0, i)); render(true); }
function advance() {
  if (current < STORY.length - 1) go(current + 1);
  else window.scrollTo({top: Math.max(0, window.scrollY + $('afterword').getBoundingClientRect().top - 12), behavior: 'instant'});
}
function openPanel(j) {
  const chapter = STORY[current];
  $('largeArt').style.backgroundImage = `url('${asset(current)}')`;
  $('largeArt').style.backgroundPosition = positions[j];
  $('largeArt').setAttribute('role', 'img');
  $('largeArt').setAttribute('aria-label', chapter.frames[j][0]);
  $('largeTitle').textContent = chapter.frames[j][0];
  $('largeCaption').innerHTML = prose(chapter.frames[j][1]);
  $('panelDialog').showModal();
}
$('prologue').innerHTML = paragraphList(ARTICLE.intro);
$('afterwordTitle').textContent = ARTICLE.afterwordTitle;
$('afterwordCopy').innerHTML = paragraphList(ARTICLE.afterword);
$('chapterSelect').innerHTML = STORY.map((c, i) => `<option value="${i}">${String(i + 1).padStart(2, '0')} · ${esc(c.title)}${c.continued ? '（续）' : ''}</option>`).join('');
$('chapterSelect').addEventListener('change', e => go(Number(e.target.value)));
$('prev').onclick = () => go(current - 1);
$('next').onclick = advance;
$('closeDialog').onclick = () => $('panelDialog').close();
$('panelDialog').addEventListener('click', e => {
  const d = $('panelDialog'), r = d.getBoundingClientRect();
  if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close();
});
document.addEventListener('keydown', e => {
  if ($('panelDialog').open || ['SELECT', 'INPUT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement.tagName)) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
});
$('reread').onclick = e => { e.preventDefault(); go(0); };
$('storyboardList').innerHTML = STORY.map((c, i) => `<details class="board-chapter"><summary><span class="board-number">${String(i + 1).padStart(2, '0')}</span><span class="board-title">${esc(c.title)}${c.continued ? '（续）' : ''}</span><span>＋</span></summary><ol>${c.frames.map(f => `<li><div class="source-prose">${prose(f[1])}</div></li>`).join('')}</ol><button class="board-read" data-chapter="${i}">阅读这一页漫画 →</button></details>`).join('');
document.querySelectorAll('[data-chapter]').forEach(b => b.onclick = () => go(Number(b.dataset.chapter)));

function preparePrint() {
  $('printPages').innerHTML = `<article class="print-preface"><h1>${esc(ARTICLE.title)}</h1><p class="print-subtitle">${esc(ARTICLE.subtitle)}</p><div class="source-prose">${paragraphList(ARTICLE.intro)}</div></article>` + STORY.map((c, i) => `<article class="print-chapter"><p class="era">${esc(c.era)}</p><h2>${esc(c.title)}</h2><div class="comic-grid">${c.frames.map((_, j) => panelHTML(c, i, j, true)).join('')}</div></article>`).join('') + `<article class="print-afterword"><h2>${esc(ARTICLE.afterwordTitle)}</h2><div class="source-prose">${paragraphList(ARTICLE.afterword)}</div></article>`;
}
$('printButton').onclick = async () => {
  const b = $('printButton'); b.disabled = true; b.textContent = '准备全书…';
  try {
    preparePrint();
    await Promise.all(STORY.map((_, i) => new Promise(resolve => {const im = new Image(); im.onload = resolve; im.onerror = resolve; im.src = asset(i);}))); window.print();
  } finally { b.disabled = false; b.textContent = '打印珍藏 ↗'; }
};
window.addEventListener('beforeprint', preparePrint);
render();
