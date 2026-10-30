import { Client, Config, RouterApi, Snapshot } from '../types';
const j = (v: number, a: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v + (Math.random() - 0.5) * a));
export class MockRouter implements RouterApi {
  private sp = 378; private cpu = 19; private ram = 35; private ping = 8.6; private sig = 79;
  private w: Record<string, number> = {}; private rate: Record<string, number> = {};
  private cl: Omit<Client, 'rate'>[] = [
    { mac: 'A4:5E:60:11:22:33', name: "Dad's Phone", type: 'Wi-Fi 5 GHz', dbm: -52, blocked: false, limit: 0, used: 1.2e9 },
    { mac: 'B8:27:EB:44:55:66', name: 'Living Room TV', type: 'Wi-Fi 2.4 GHz', dbm: -67, blocked: false, limit: 0, used: 3.4e9 },
    { mac: '3C:22:FB:77:88:99', name: 'Laptop', type: 'LAN', dbm: null, blocked: false, limit: 2048, used: 0.6e9 },
    { mac: 'F0:18:98:AA:BB:CC', name: 'Neighbor Tablet', type: 'Wi-Fi 2.4 GHz', dbm: -78, blocked: false, limit: 512, used: 0.2e9 },
  ];
  private cfg: Config = { ssid: 'Netis_5G_Home', wifiPw: '********', guest: false, qos: true, fw: true,
    dhcp: { start: '192.168.1.100', end: '192.168.1.200', lease: '24h' }, ports: [{ n: 'Web', ext: 8080, int: '192.168.1.10:80' }], fwRules: [] };
  async login() {}
  async getConfig() { return JSON.parse(JSON.stringify(this.cfg)) as Config; }
  async poll(): Promise<Snapshot> {
    this.sp = Math.round(j(this.sp, 120, 20, 900)); this.cpu = Math.round(j(this.cpu, 6, 5, 80));
    this.ram = Math.round(j(this.ram, 3, 20, 90)); this.ping = +j(this.ping, 2, 3, 40).toFixed(2); this.sig = Math.round(j(this.sig, 4, 40, 100));
    const clients = this.cl.map(c => {
      let r = 0;
      if (!c.blocked) {
        const w = (this.w[c.mac] ??= 0.1 + Math.random() * 0.6);
        let t = this.sp * w * (0.6 + Math.random() * 0.8); if (c.limit) t = Math.min(t, c.limit);
        r = (this.rate[c.mac] || 0) * 0.6 + t * 0.4;
      }
      this.rate[c.mac] = r; return { ...c, rate: r };
    });
    return { speed: this.sp, cpu: this.cpu, ram: this.ram, ping: this.ping, sig: this.sig, clients,
      wan: [Math.random() * this.sp * 0.3, Math.random() * this.sp * 0.06] };
  }
  async setBlock(mac: string, b: boolean) { this.cl.find(c => c.mac === mac)!.blocked = b; }
  async setLimit(mac: string, k: number) { this.cl.find(c => c.mac === mac)!.limit = k; }
  async apply<K extends keyof Config>(k: K, v: Config[K]) { this.cfg[k] = v; }
  async changeAdminPassword() {}
  async reboot() {}
}
