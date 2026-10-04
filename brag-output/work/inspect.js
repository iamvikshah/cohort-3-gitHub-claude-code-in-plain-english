const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto('file://' + require('path').resolve('../../index.html'), { waitUntil: 'networkidle', timeout: 60000 }).catch(e=>console.log('goto',e.message));
  await p.waitForTimeout(3000);
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  console.log('height', h);
  for (let y = 0, i = 0; y < h && i < 14; y += 1700, i++) {
    await p.evaluate(yy => window.scrollTo(0, yy), y); await p.waitForTimeout(700);
    await p.screenshot({ path: `shot-${String(i).padStart(2,'0')}.png` });
  }
  const info = await p.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const vars = {}; const r = getComputedStyle(document.documentElement);
    for (const s of document.styleSheets) { try { for (const rule of s.cssRules) if (rule.selectorText === ':root') for (const n of rule.style) if (n.startsWith('--')) vars[n] = r.getPropertyValue(n).trim(); } catch(e){} }
    const fonts = [...new Set([...document.querySelectorAll('h1,h2,h3,p,a,button,span')].map(e => getComputedStyle(e).fontFamily))];
    const heads = [...document.querySelectorAll('h1,h2,h3,button,a')].map(e => e.tagName + ': ' + e.innerText.replace(/\s+/g,' ').trim()).filter(s => s.length > 4).slice(0, 80);
    return { bg: cs.backgroundColor, color: cs.color, vars, fonts, heads, text: document.body.innerText.slice(0, 6000) };
  });
  require('fs').writeFileSync('page-info.json', JSON.stringify(info, null, 2));
  await b.close();
})();
