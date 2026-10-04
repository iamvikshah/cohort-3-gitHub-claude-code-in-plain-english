const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const mode = process.argv[2];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('PAGE ERROR', e.message));
  await p.goto('file://' + require('path').resolve('composition.html'));
  await p.evaluate(async () => { await Promise.all(['500','600','700','800'].map(w=>document.fonts.load(w+' 40px "Bricolage Grotesque"')).concat(['400','500','600','700'].map(w=>document.fonts.load(w+' 40px "DM Sans"')), ['400','500'].map(w=>document.fonts.load(w+' 40px "DM Mono"')))); await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())); });
  const fontsOk = await p.evaluate(() => ['700 40px "Bricolage Grotesque"','400 40px "DM Sans"','400 40px "DM Mono"'].map(f => f + ':' + document.fonts.check(f)));
  console.log(fontsOk.join(' '));
  if (mode === 'stills') {
    fs.mkdirSync('stills', { recursive: true });
    for (const t of process.argv.slice(3).map(Number)) {
      await p.evaluate(t => render(t), t);
      await p.screenshot({ path: `stills/t${t.toFixed(2)}.png` });
    }
  } else {
    fs.mkdirSync('frames', { recursive: true });
    const fps = 30, n = Math.round(await p.evaluate(() => DURATION) * fps);
    for (let i = 0; i < n; i++) {
      await p.evaluate(t => render(t), i / fps);
      await p.screenshot({ path: `frames/f${String(i).padStart(4, '0')}.png` });
      if (i % 100 === 0) console.log('frame', i, '/', n);
    }
  }
  await b.close();
})();
