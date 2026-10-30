import { BRANDS, RouterInfo } from '../types';
export async function detect(gw: string, demo: boolean): Promise<RouterInfo> {
  if (demo) { await new Promise(r => setTimeout(r, 600)); return BRANDS[gw] ?? BRANDS['192.168.1.1']; }
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
  try {
    const html = await (await fetch(`http://${gw}/`, { signal: ctl.signal })).text();
    if (/netis/i.test(html)) return { brand: 'Netis', model: (html.match(/NC\d+\w*|NX\d+|MW\d+/i) || ['Router'])[0], fw: (html.match(/V?\d\.\d\.\d\.\d+/) || ['—'])[0], user: false };
    throw new Error('Unsupported router (only Netis is implemented for live mode)');
  } finally { clearTimeout(t); }
}
