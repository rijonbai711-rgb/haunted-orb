import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Provider, Tab, useApp } from './src/store';
import { Btn, Card, DialogHost, Input, Mu, Select, Toast, Tog, Row } from './src/ui';
import { detect } from './src/router/detect';
import { RouterInfo } from './src/types';
import Home from './src/screens/Home';
import Clients from './src/screens/Clients';
import Billing from './src/screens/Billing';
import Tools from './src/screens/Tools';
import Settings from './src/screens/Settings';

const TABS: [Tab, string, string][] = [['home', '🏠', 'Home'], ['clients', '📱', 'Clients'], ['billing', '💳', 'Billing'], ['tools', '🛠', 'Tools'], ['settings', '⚙️', 'Settings']];
const SCREENS = { home: Home, clients: Clients, billing: Billing, tools: Tools, settings: Settings };

function Login() {
  const { C, a } = useApp(); const [gw, setGw] = useState('192.168.1.1'), [pw, setPw] = useState(''), [usr, setUsr] = useState('admin'), [demo, setDemo] = useState(true);
  const [info, setInfo] = useState<RouterInfo | null>(null), [scan, setScan] = useState('Scanning gateway…');
  useEffect(() => {
    let on = true; setInfo(null); setScan('Scanning gateway…');
    detect(gw, demo).then(i => { if (on) { setInfo(i); setScan('Gateway bound ✓'); } }).catch(e => on && setScan(e.message || 'Gateway not reachable'));
    return () => { on = false; };
  }, [gw, demo]);
  return <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
    <Text style={{ fontSize: 44 }}>📡</Text>
    <MaskedView maskElement={<Text style={{ fontSize: 32, fontWeight: '700', margin: 6, backgroundColor: 'transparent' }}>Smart Router</Text>}>
      <LinearGradient colors={[C.ac, C.ac2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}><Text style={{ fontSize: 32, fontWeight: '700', margin: 6, opacity: 0 }}>Smart Router</Text></LinearGradient>
    </MaskedView>
    <Mu>{scan}</Mu>
    <Card style={{ alignSelf: 'stretch', marginHorizontal: 0, marginVertical: 20 }}>
      <Mu>Gateway</Mu><Select value={gw} onChange={setGw} options={['192.168.1.1', '192.168.0.1', 'netis.cc'].map(v => ({ v, l: v }))} />
      <Mu style={{ marginVertical: 8 }}>{info ? `Detected: ${info.brand} ${info.model} · FW ${info.fw}` : ' '}</Mu>
      {info?.user && <><Mu>Username</Mu><Input value={usr} onChangeText={setUsr} /></>}
      <Mu style={{ marginTop: 8 }}>Password</Mu><Input secureTextEntry placeholder="Router password" value={pw} onChangeText={setPw} />
      <Btn pri t="Connect" style={{ marginTop: 14 }} onPress={() => a.login(gw, pw, usr, demo, info)} />
      <Row last style={{ marginTop: 6 }}><Mu>Demo mode{demo ? ': any password works.' : ' off: talks to the real router.'}</Mu><Tog on={demo} onPress={() => setDemo(!demo)} /></Row>
    </Card>
  </ScrollView>;
}

function Shell() {
  const { s, C, a } = useApp(); const ins = useSafeAreaInsets(); const Screen = SCREENS[s.tab];
  return <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>
    <StatusBar style={C.bg === '#070b16' ? 'light' : 'dark'} />
    <View style={{ flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center' }}>
      {!s.session ? <Login /> : <>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 12 }}><Screen /></ScrollView>
        <View style={{ flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.ln, paddingBottom: ins.bottom }}>
          {TABS.map(([k, e, l]) => <Pressable key={k} onPress={() => a.go(k)} style={{ flex: 1, alignItems: 'center', paddingVertical: 9 }}>
            <Text style={{ fontSize: 14 }}>{e}</Text><Text style={{ fontSize: 12, color: s.tab === k ? C.ac : C.mu, fontWeight: s.tab === k ? '700' : '400' }}>{l}</Text></Pressable>)}
        </View></>}
    </View>
    <Toast /><DialogHost />
  </View>;
}
export default function App() { return <SafeAreaProvider><Provider><Shell /></Provider></SafeAreaProvider>; }
