const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + require('path').resolve('../../index.html'), { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  const r = await p.evaluate(async () => {
    const imgs = [...document.images].map(i => ({ w: i.naturalWidth, h: i.naturalHeight, alt: i.alt, src: i.src.slice(0, 60) }));
    const fonts = [...document.fonts].map(f => f.family + ' ' + f.weight + ' ' + f.style + ' ' + f.status);
    return { imgs, fonts };
  });
  console.log(JSON.stringify(r, null, 1));
  const el = await p.$('img'); if (el) await el.screenshot({ path: 'vik.png' });
  // grab largest image as data
  const data = await p.evaluate(async () => { const i=[...document.images].sort((a,b)=>b.naturalWidth-a.naturalWidth)[0]; const c=document.createElement('canvas'); c.width=i.naturalWidth;c.height=i.naturalHeight;c.getContext('2d').drawImage(i,0,0); return c.toDataURL('image/png'); });
  require('fs').writeFileSync('vik-full.png', Buffer.from(data.split(',')[1], 'base64'));
  await b.close();
})();
