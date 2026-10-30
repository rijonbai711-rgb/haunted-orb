import React from 'react';
import { View } from 'react-native';
import { Btn, Card, Grid, H2, Input, Mu, Row, Txt } from '../ui';
import { useApp } from '../store';

const d = (t?: number) => t ? new Date(t).toISOString().slice(0, 10) : '';
export default function Billing() {
  const { s, C, a, nm } = useApp();
  return <>
    <Card><H2>Billing & auto-block</H2><Mu>Set a cycle per device. At expiry the app blocks the device on the router. Marking paid unblocks it, resets its data counter and starts a new cycle.</Mu></Card>
    {s.snap.clients.map(c => {
      const b = s.bills[c.mac] || {}; const left = b.end ? Math.ceil((b.end - Date.now()) / 864e5) : null;
      return <Card key={c.mac}>
        <Row><Txt style={{ fontWeight: '700' }}>{nm(c)}</Txt><Txt style={{ color: b.end && left! <= 0 ? C.bad : C.ok }}>{b.end ? (left! > 0 ? left + ' days left' : 'Expired') : 'No plan'}</Txt></Row>
        <Grid>
          <View><Mu>Start</Mu><Input key={'s' + b.start} placeholder="YYYY-MM-DD" defaultValue={d(b.start)} onEndEditing={e => a.bset(c.mac, 'start', e.nativeEvent.text)} /></View>
          <View><Mu>End</Mu><Input key={'e' + b.end} placeholder="YYYY-MM-DD" defaultValue={d(b.end)} onEndEditing={e => a.bset(c.mac, 'end', e.nativeEvent.text)} /></View>
        </Grid>
        <Row><Mu>Amount</Mu><Input style={{ width: 110 }} keyboardType="numeric" placeholder="৳" defaultValue={b.amt || ''} onEndEditing={e => a.bset(c.mac, 'amt', e.nativeEvent.text)} /></Row>
        <Grid><Btn pri t="Paid +30 days" onPress={() => a.pay(c.mac, 30)} /><Btn t="Paid (custom)" onPress={() => a.pay(c.mac, 0)} /></Grid>
      </Card>;
    })}
  </>;
}
