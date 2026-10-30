import React from 'react';
import { Animated, View } from 'react-native';
import { Btn, Card, H2, Mu, Row, Txt, useLoop } from '../ui';
import { useApp } from '../store';
import { Client, fmt, rateTxt } from '../types';

function Live({ c }: { c: Client }) {
  const { C, s } = useApp(); const r = c.blocked ? 0 : c.rate, hot = r >= 150;
  const col = hot ? C.bad : c.type === 'Wi-Fi 5 GHz' ? C.ac : c.type === 'LAN' ? C.ok : C.ac2;
  const dur = c.blocked ? 20000 : hot ? Math.max(0.45, 1.2 - (r - 150) / 300) * 1000 : 2000, v = useLoop(dur, { pingpong: true });
  return <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col, marginRight: 6, shadowColor: col, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] }} />
    <Txt style={{ fontSize: 12, fontWeight: '700', color: hot ? C.bad : C.tx }}>{rateTxt(r)}</Txt><Mu> live</Mu>
  </View>;
}

export default function Clients() {
  const { s, C, a, nm } = useApp(); const cl = s.snap.clients;
  return <Card><H2>Connected devices ({cl.length})</H2>
    {cl.map((c, i) => <Row key={c.mac} last={i === cl.length - 1} style={{ alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Txt><Txt style={{ fontWeight: '700' }}>{nm(c)}</Txt>{c.blocked ? <Txt style={{ color: C.bad }}> · blocked</Txt> : null}</Txt>
        <Mu>{c.type}{c.dbm ? ` · ${c.dbm} dBm · ~${Math.round(Math.pow(10, (-30 - c.dbm) / 25))} m` : ''} · {c.mac}</Mu>
        <Mu>Limit: {c.limit ? c.limit + ' KB/s' : 'none'} · Used {fmt(s.used[c.mac] ?? c.used ?? 0)}</Mu>
        <Live c={c} />
      </View>
      <View style={{ gap: 4 }}>
        <Btn t={c.blocked ? 'Unblock' : 'Block'} onPress={() => a.blk(c.mac)} />
        <Btn t="Limit" onPress={() => a.lim(c.mac)} />
        <Btn t="Rename" onPress={() => a.ren(c.mac)} />
      </View>
    </Row>)}
  </Card>;
}
