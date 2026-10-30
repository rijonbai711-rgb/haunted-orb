import React from 'react';
import { Btn, Card, H2, Mu, Row, Tog, Txt } from '../ui';
import { dialog } from '../ui';
import { useApp } from '../store';
import { fmt } from '../types';

export default function Tools() {
  const { s, a } = useApp(); const T = s.cfg!;
  const tg = (k: 'qos' | 'fw', l: string) => <Row key={k}><Txt>{l}</Txt><Tog on={T[k]} onPress={() => a.setCfg(k, !T[k], l + ' updated')} /></Row>;
  const addfw = async () => { const v = await dialog.prompt('Rule (e.g. Block 192.168.1.50 → port 25)'); if (v) a.setCfg('fwRules', [...T.fwRules, v]); };
  const dh = async () => {
    const st = await dialog.prompt('DHCP pool start', T.dhcp.start); if (!st) return;
    const en = await dialog.prompt('DHCP pool end', T.dhcp.end); if (!en) return;
    const le = await dialog.prompt('Lease time', T.dhcp.lease); if (!le) return;
    a.setCfg('dhcp', { start: st, end: en, lease: le }, 'DHCP updated');
  };
  const addp = async () => {
    const n = await dialog.prompt('Name'), e = +((await dialog.prompt('External port')) || 0), i = await dialog.prompt('Internal IP:port');
    if (n && e && i) a.setCfg('ports', [...T.ports, { n, ext: e, int: i }]);
  };
  return <>
    <Card><H2>Wi-Fi</H2>
      <Row><Txt>SSID: <Txt style={{ fontWeight: '700' }}>{T.ssid}</Txt></Txt><Btn t="Rename" onPress={() => a.edit('ssid', 'New SSID')} /></Row>
      <Row last><Txt>Wi-Fi password</Txt><Btn t="Change" onPress={() => a.edit('wifiPw', 'New Wi-Fi password (8+ chars)', 8)} /></Row></Card>
    <Card><H2>QoS & Security</H2>{tg('qos', 'QoS')}{tg('fw', 'Firewall')}
      <Row last={!T.fwRules.length}><Txt>Firewall rules: {T.fwRules.length}</Txt><Btn t="Add rule" onPress={addfw} /></Row>
      {T.fwRules.map((r, i) => <Row key={i} last={i === T.fwRules.length - 1}><Mu style={{ flex: 1 }}>{r}</Mu><Btn t="✕" onPress={() => a.setCfg('fwRules', T.fwRules.filter((_, j) => j !== i))} /></Row>)}</Card>
    <Card><H2>DHCP</H2><Row><Txt>Pool {T.dhcp.start} – {T.dhcp.end}</Txt><Btn t="Edit" onPress={dh} /></Row><Row last><Txt>Lease: {T.dhcp.lease}</Txt></Row></Card>
    <Card><H2>Port forwarding</H2>
      {T.ports.map((p, i) => <Row key={i}><Txt>{p.n}: {p.ext} → {p.int}</Txt><Btn t="✕" onPress={() => a.setCfg('ports', T.ports.filter((_, j) => j !== i))} /></Row>)}
      <Btn t="+ Add rule" style={{ marginTop: 8 }} onPress={addp} /></Card>
    <Card><H2>Traffic statistics</H2>
      {Object.entries(s.stats).map(([k, v]) => <Row key={k}><Txt>{k}</Txt><Mu>{fmt(v[1])} ↑ · {fmt(v[0])} ↓</Mu></Row>)}
      <Btn t="Reset counters" style={{ marginTop: 8 }} onPress={a.resetCounters} /></Card>
    <Card><H2>Admin password</H2><Btn t="Change admin password" onPress={() => a.edit('adminPw', 'New admin password', 4)} /></Card>
  </>;
}
