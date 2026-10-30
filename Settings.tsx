import React from 'react';
import { Pressable, View } from 'react-native';
import { Btn, Card, H2, Mu, Row, Select, Txt } from '../ui';
import { useApp } from '../store';

const SW = ['#22e5ff', '#a855f7', '#2cff9a', '#ff9f1c', '#ff4d6d'];
export default function Settings() {
  const { s, C, a } = useApp(); const R = s.router!;
  return <>
    <Card><H2>Appearance</H2>
      <Row><Txt>Theme</Txt><Select width={130} value={s.theme} onChange={v => a.setTheme(v as any)} options={[{ v: 'auto', l: 'Auto' }, { v: 'dark', l: 'Dark' }, { v: 'light', l: 'Light' }]} /></Row>
      <Row last><Txt>Accent</Txt><View style={{ flexDirection: 'row', gap: 8 }}>
        {SW.map(c => <Pressable key={c} onPress={() => a.setAccent(c)} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c, borderWidth: 2, borderColor: C.ac === c ? C.tx : 'transparent' }} />)}</View></Row></Card>
    <Card><H2>Session</H2><Mu>Connected to {s.session!.gw} · {R.brand} {R.model}{s.session!.demo ? ' · demo mode' : ''}</Mu>
      <Btn t="Log out" style={{ marginTop: 8 }} onPress={a.logout} /></Card>
  </>;
}
