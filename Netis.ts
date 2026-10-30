/**
 * Netis (NC63 / NC65 / NC21 / NX10 / MW5360 …) adapter.
 *
 * Netis publishes NO public API. These routers run a Boa web server whose UI posts form-encoded
 * requests to /cgi-bin/netis.cgi with a session cookie, and the login password is sent Base64-encoded.
 * Everything marked VERIFY below is a best guess: open the router UI in a desktop browser, DevTools ->
 * Network, perform the action once, and copy the exact URL / field names / response shape here.
 * All guesses are isolated in this file so nothing else in the app needs to change.
 */
import { encode } from 'base-64';
import { Client, ConnType, Config, RouterApi, Snapshot } from '../types';

type Body = Record<string, string | number>;
const CGI = '/cgi-bin/netis.cgi'; // VERIFY

export class NetisRouter implements RouterApi {
  private creds?: { password: string; username?: string };
  constructor(private gw: string) {}

  private async raw(body: Body, path = CGI): Promise<any> {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
    try {
      const r = await fetch(`http://${this.gw}${path}`, {
        method: 'POST', credentials: 'include', signal: ctl.signal, // native cookie jar keeps the session
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: Object.entries(body).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&'),
      });
      if (r.status === 401 || r.status === 403) throw new Error('AUTH');
      if (!r.ok) throw new Error('Router HTTP ' + r.status);
      const txt = await r.text();
      try { return JSON.parse(txt); } catch { return txt; }
    } finally { clearTimeout(t); }
  }
  /** Authenticated call; re-logs in once if the session expired. */
  private async call(body: Body) {
    try { return await this.raw(body); }
    catch (e: any) { if (e.message === 'AUTH' && this.creds) { await this.login(this.creds); return this.raw(body); } throw e; }
  }

  async login(p: { password: string; username?: string }) {
    this.creds = p;
    const r = await this.raw({ action: 'login', username: p.username || 'admin', password: encode(p.password) }); // VERIFY
    const bad = typeof r === 'string' ? /fail|error|invalid|incorrect/i.test(r) : !r || r.error || r.result === false; // VERIFY
    if (bad) throw new Error('Wrong password');
  }

  async getConfig(): Promise<Config> {
    const [w, d, f, p] = await Promise.all([
      this.call({ action: 'getWifi' }), this.call({ action: 'getDhcp' }),   // VERIFY
      this.call({ action: 'getFirewall' }), this.call({ action: 'getPortForward' })]); // VERIFY
    return {
      ssid: w?.ssid5g ?? w?.ssid ?? '', wifiPw: '********', guest: !!w?.guestEnable, qos: !!w?.qosEnable, fw: !!f?.enable,
      dhcp: { start: d?.start ?? '', end: d?.end ?? '', lease: d?.lease ?? '24h' },
      ports: (p?.list ?? []).map((x: any) => ({ n: x.name, ext: +x.extPort, int: `${x.ip}:${x.intPort}` })),
      fwRules: (f?.rules ?? []).map((x: any) => String(x.desc ?? x)),
    };
  }

  async poll(): Promise<Snapshot> {
    const [sys, list] = await Promise.all([this.call({ action: 'getStatus' }), this.call({ action: 'getClients' })]); // VERIFY
    const clients: Client[] = (list?.clients ?? []).map((x: any) => ({
      mac: String(x.mac).toUpperCase(), name: x.hostname || x.name || x.mac,
      type: (x.link === 'wired' ? 'LAN' : x.band === '5G' ? 'Wi-Fi 5 GHz' : 'Wi-Fi 2.4 GHz') as ConnType,
      dbm: x.rssi != null ? +x.rssi : null, blocked: !!x.blocked, limit: +(x.limitKB ?? 0),
      rate: +(x.rxKBps ?? 0) + +(x.txKBps ?? 0),
    }));
    return { speed: Math.round(+(sys?.wanKBps ?? 0)), cpu: Math.round(+(sys?.cpu ?? 0)), ram: Math.round(+(sys?.mem ?? 0)),
      ping: +(sys?.ping ?? 0), sig: Math.round(+(sys?.signal ?? 0)), wan: [+(sys?.wanRx ?? 0), +(sys?.wanTx ?? 0)], clients };
  }

  async setBlock(mac: string, b: boolean) { await this.call({ action: 'macFilter', mac, mode: b ? 'deny' : 'allow' }); } // VERIFY
  async setLimit(mac: string, kbps: number) { await this.call({ action: 'qosLimit', mac, down: kbps, up: kbps }); }       // VERIFY
  async changeAdminPassword(pw: string) { await this.call({ action: 'setAdminPassword', password: encode(pw) }); }         // VERIFY
  async reboot() { await this.call({ action: 'reboot' }).catch(() => {}); } // router drops the connection; ignore

  async apply<K extends keyof Config>(k: K, v: Config[K]) { // VERIFY every branch
    switch (k) {
      case 'ssid': return void (await this.call({ action: 'setWifi', ssid: v as string }));
      case 'wifiPw': return void (await this.call({ action: 'setWifi', wpaKey: v as string }));
      case 'guest': return void (await this.call({ action: 'setGuest', enable: v ? 1 : 0 }));
      case 'qos': return void (await this.call({ action: 'setQos', enable: v ? 1 : 0 }));
      case 'fw': return void (await this.call({ action: 'setFirewall', enable: v ? 1 : 0 }));
      case 'dhcp': { const d = v as Config['dhcp']; return void (await this.call({ action: 'setDhcp', start: d.start, end: d.end, lease: d.lease })); }
      case 'ports': return void (await this.call({ action: 'setPortForward', json: JSON.stringify(v) }));
      case 'fwRules': return void (await this.call({ action: 'setFirewallRules', json: JSON.stringify(v) }));
    }
  }
}
