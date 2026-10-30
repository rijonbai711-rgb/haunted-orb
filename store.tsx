import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, Config, GB, LIMIT, RouterApi, RouterInfo, Snapshot, Stats } from './types';
import { MockRouter } from './router/mock';
import { NetisRouter } from './router/netis';
import { dialog } from './ui';

export const DARK = { bg: '#070b16', card: '#0f1729', tx: '#e6ecff', mu: '#7d8bb0', ac: '#22e5ff', ac2: '#a855f7', ok: '#2cff9a', bad: '#ff4d6d', ln: '#1c2a47' };
export const LIGHT = { bg: '#eef2fb', card: '#ffffff', tx: '#10182f', mu: '#5b6788', ac: '#0090c8', ac2: '#7a2fd0', ok: '#0a9a5a', bad: '#d62849', ln: '#d6def0' };
export type Colors = typeof DARK;
export type Tab = 'home' | 'clients' | 'billing' | 'tools' | 'settings';
export interface Bill { start?: number; end?: number; amt?: string; paid?: boolean }
const zero = (): Stats => ({ LAN: [0, 0], Internet: [0, 0], 'Wi-Fi 5 GHz': [0, 0], 'Wi-Fi 2.4 GHz': [0, 0] });
const EMPTY: Snapshot = { speed: 0, cpu: 0, ram: 0, ping: 0, sig: 0, wan: [0, 0], clients: [] };
interface State {
  session: { gw: string; demo: boolean } | null; router: RouterInfo | null; tab: Tab; snap: Snapshot; cfg: Config | null;
  names: Record<string, string>; bills: Record<string, Bill>; used: Record<string, number>; stats: Stats;
  theme: 'auto' | 'dark' | 'light'; accent: string | null; toast: string;
}
const init: State = { session: null, router: null, tab: 'home', snap: EMPTY, cfg: null, names: {}, bills: {}, used: {}, stats: zero(), theme: 'auto', accent: null, toast: '' };
const KEY = 'srm';
const Ctx = createContext<any>(null);
export const useApp = () => useContext(Ctx) as { s: State; C: Colors; a: ReturnType<typeof makeActions>; nm: (c: Client) => string };
type Actions = ReturnType<typeof makeActions>;
function makeActions(R: React.MutableRefObject<State>, up: (p: Partial<State>) => void, api: React.MutableRefObject<RouterApi | null>, timer: React.MutableRefObject<any>) {
  let tt: any;
  const toast = (t: string) => { up({ toast: t }); clearTimeout(tt); tt = setTimeout(() => up({ toast: '' }), 1800); };
  const err = (e: any) => toast(e?.message ? String(e.message) : 'Router error');
  const nm = (c: Client) => R.current.names[c.mac] || c.name;
  const save = () => { const s = R.current; AsyncStorage.setItem(KEY, JSON.stringify({ names: s.names, bills: s.bills, used: s.used, stats: s.stats, theme: s.theme, accent: s.accent })).catch(() => {}); };
  const patch = (mac: string, p: Partial<Client>) => up({ snap: { ...R.current.snap, clients: R.current.snap.clients.map(c => c.mac === mac ? { ...c, ...p } : c) } });
  const find = (mac: string) => R.current.snap.clients.find(c => c.mac === mac)!;
  let busy = false, n = 0;

  const enforce = async () => {
    const now = Date.now();
    for (const mac in R.current.bills) {
      const b = R.current.bills[mac], c = R.current.snap.clients.find(x => x.mac === mac);
      if (c && b.end && now >= b.end && !c.blocked && !b.paid) {
        try { await api.current!.setBlock(mac, true); patch(mac, { blocked: true }); toast(nm(c) + ' expired → blocked on router'); } catch (e) { err(e); }
      }
    }
  };
  const tick = async () => {
    if (busy || !api.current) return; busy = true;
    try {
      const sn = await api.current.poll(); const cur = R.current;
      const used = { ...cur.used }; let stats: Stats = JSON.parse(JSON.stringify(cur.stats));
      sn.clients.forEach(c => { if (used[c.mac] === undefined) used[c.mac] = c.used ?? 0; used[c.mac] += c.rate * 1000; const g = stats[c.type]; g[0] += c.rate * 850; g[1] += c.rate * 150; });
      stats.Internet[0] += sn.wan[0] * 1000; stats.Internet[1] += sn.wan[1] * 1000;
      let t = ''; if (stats.Internet[0] + stats.Internet[1] >= LIMIT) { stats = zero(); t = 'Traffic stats auto-reset (4 GB reached)'; }
      up({ snap: sn, used, stats }); if (t) toast(t);
      await enforce(); if (++n % 10 === 0) save();
    } catch (e) { /* keep last snapshot; transient network errors are normal */ } finally { busy = false; }
  };
  const mutate = async (fn: () => Promise<void>, ok?: string) => { try { await fn(); if (ok) toast(ok); } catch (e) { err(e); } };

  return {
    toast, save, nm,
    go: (tab: Tab) => up({ tab }),
    async login(gw: string, pw: string, usr: string, demo: boolean, info: RouterInfo | null) {
      if (!pw) return toast('Enter the router password');
      if (!info) return toast('Router not detected yet');
      const r: RouterApi = demo ? new MockRouter() : new NetisRouter(gw);
      try {
        await r.login({ password: pw, username: usr }); const cfg = await r.getConfig();
        api.current = r; up({ session: { gw, demo }, router: info, cfg, tab: 'home', snap: EMPTY });
        clearInterval(timer.current); tick(); timer.current = setInterval(tick, 1000);
      } catch (e: any) { toast('Login failed: ' + (e?.message ?? 'unreachable')); }
    },
    logout() { clearInterval(timer.current); api.current = null; up({ session: null, cfg: null, snap: EMPTY }); save(); },
    blk: (mac: string) => mutate(async () => { const c = find(mac); await api.current!.setBlock(mac, !c.blocked); patch(mac, { blocked: !c.blocked }); toast(nm(c) + (c.blocked ? ' unblocked' : ' blocked')); }),
    async lim(mac: string) { const v = await dialog.prompt('Speed limit in KB/s (0 = none)'); if (v === null) return; const k = Math.max(0, +v || 0); mutate(async () => { await api.current!.setLimit(mac, k); patch(mac, { limit: k }); }, 'Limit applied'); },
    async ren(mac: string) { const v = await dialog.prompt('Device name', nm(find(mac))); if (v) { up({ names: { ...R.current.names, [mac]: v } }); save(); } },
    bset(mac: string, k: 'start' | 'end' | 'amt', v: string) {
      const b = { ...(R.current.bills[mac] || {}) } as any;
      if (k === 'amt') b.amt = v; else { const t = v ? new Date(v + 'T23:59:59').getTime() : 0; if (isNaN(t)) return toast('Invalid date'); b[k] = t; }
      b.paid = false; up({ bills: { ...R.current.bills, [mac]: b } }); save(); enforce();
    },
    async pay(mac: string, days: number) {
      const b = { ...(R.current.bills[mac] || {}) }; let end: number;
      if (days) end = Math.max(Date.now(), b.end || 0) + days * 864e5;
      else { const v = await dialog.prompt('New end date (YYYY-MM-DD)'); if (!v) return; end = new Date(v + 'T23:59:59').getTime(); if (isNaN(end)) return toast('Invalid date'); }
      const c = find(mac);
      mutate(async () => { await api.current!.setBlock(mac, false); patch(mac, { blocked: false });
        up({ bills: { ...R.current.bills, [mac]: { ...b, start: Date.now(), end, paid: false } }, used: { ...R.current.used, [mac]: 0 } }); save(); }, nm(c) + ': paid, unblocked, counter reset');
    },
    async setGuest() { const v = !R.current.cfg!.guest; mutate(async () => { await api.current!.apply('guest', v); up({ cfg: { ...R.current.cfg!, guest: v } }); }, 'Guest Wi-Fi ' + (v ? 'ON' : 'OFF')); },
    setCfg: <K extends keyof Config>(k: K, v: Config[K], msg?: string) => mutate(async () => { await api.current!.apply(k, v); up({ cfg: { ...R.current.cfg!, [k]: v } }); }, msg),
    async edit(k: 'ssid' | 'wifiPw' | 'adminPw', label: string, min?: number) {
      const v = await dialog.prompt(label); if (!v) return; if (min && v.length < min) return toast('Too short');
      mutate(async () => { if (k === 'adminPw') await api.current!.changeAdminPassword(v); else await api.current!.apply(k, v); up({ cfg: { ...R.current.cfg!, ...(k === 'ssid' ? { ssid: v } : {}) } }); }, 'Applied to router');
    },
    async reboot() { if (!(await dialog.confirm('Restart router?'))) return; await mutate(async () => { await api.current!.reboot(); up({ stats: zero() }); save(); }, 'Router restarting… stats reset'); },
    resetCounters() { up({ stats: zero() }); save(); toast('Statistics reset'); },
    setTheme(theme: State['theme']) { up({ theme }); save(); },
    setAccent(accent: string | null) { up({ accent }); save(); },
  };
}

export function Provider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const [s, setS] = useState<State>(init); const R = useRef(s); const api = useRef<RouterApi | null>(null); const timer = useRef<any>(null);
  const up = (p: Partial<State>) => { R.current = { ...R.current, ...p }; setS(R.current); };
  const a = useMemo(() => makeActions(R, up, api, timer), []);
  useEffect(() => { AsyncStorage.getItem(KEY).then(x => { if (x) up(JSON.parse(x)); }).catch(() => {}); return () => clearInterval(timer.current); }, []);
  const base = (s.theme === 'auto' ? scheme : s.theme) === 'light' ? LIGHT : DARK;
  const C = useMemo(() => ({ ...base, ...(s.accent ? { ac: s.accent } : {}) }), [base, s.accent]);
  return <Ctx.Provider value={{ s, C, a, nm: a.nm }}>{children}</Ctx.Provider>;
}
