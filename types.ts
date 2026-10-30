export type ConnType = 'LAN' | 'Wi-Fi 5 GHz' | 'Wi-Fi 2.4 GHz';
export type StatKey = ConnType | 'Internet';
export type Stats = Record<StatKey, [number, number]>; // [download bytes, upload bytes]
export interface Client { mac: string; name: string; type: ConnType; dbm: number | null; blocked: boolean; limit: number; rate: number; used?: number }
export interface Snapshot { speed: number; cpu: number; ram: number; ping: number; sig: number; wan: [number, number]; clients: Client[] }
export interface Config {
  ssid: string; wifiPw: string; guest: boolean; qos: boolean; fw: boolean;
  dhcp: { start: string; end: string; lease: string };
  ports: { n: string; ext: number; int: string }[];
  fwRules: string[];
}
/** Every router backend (Mock, Netis, …) implements this. The UI never talks HTTP directly. */
export interface RouterApi {
  login(p: { password: string; username?: string }): Promise<void>;
  getConfig(): Promise<Config>;
  poll(): Promise<Snapshot>;                       // called every second; rates are KB/s
  setBlock(mac: string, blocked: boolean): Promise<void>;
  setLimit(mac: string, kbps: number): Promise<void>; // 0 = none
  apply<K extends keyof Config>(k: K, v: Config[K]): Promise<void>;
  changeAdminPassword(pw: string): Promise<void>;
  reboot(): Promise<void>;
}
export interface RouterInfo { brand: string; model: string; fw: string; user: boolean }
export const BRANDS: Record<string, RouterInfo> = {
  '192.168.1.1': { brand: 'Netis', model: 'NC63-v4', fw: 'V3.0.0', user: false },
  'netis.cc': { brand: 'Netis', model: 'NC63-v4', fw: 'V3.0.0', user: false },
  '192.168.0.1': { brand: 'TP-Link', model: 'Archer C6', fw: '1.3.2', user: true },
};
export const GB = 1e9, LIMIT = 4 * GB;
export const fmt = (b: number) => b >= GB ? (b / GB).toFixed(2) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : (b / 1e3).toFixed(0) + ' KB';
export const rateTxt = (r: number) => r >= 1000 ? (r / 1000).toFixed(1) + ' MB/s' : Math.round(r) + ' KB/s';
