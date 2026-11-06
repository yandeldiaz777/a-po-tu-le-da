const test = require('node:test');
const assert = require('node:assert/strict');
const {tiktokInputMode} = require('../tiktok-input');

test('Reconoce un perfil con los parámetros que añade TikTok al compartirlo', () => {
  const link = 'https://www.tiktok.com/@ejemplo?is_from_webapp=1&sender_device=pc';
  assert.equal(tiktokInputMode(link), 'profile');
  assert.equal(tiktokInputMode('  @ejemplo  '), 'profile');
  assert.equal(tiktokInputMode('https://m.tiktok.com/@ejemplo/'), 'profile');
});

test('Distingue los videos y los enlaces cortos de un perfil', () => {
  assert.equal(tiktokInputMode('https://www.tiktok.com/@ejemplo/video/1234567890123456789?lang=es'), 'video');
  assert.equal(tiktokInputMode('https://vm.tiktok.com/ZMPrueba/'), 'video');
  assert.equal(tiktokInputMode('https://vt.tiktok.com/ZMPrueba/?t=1'), 'video');
});

test('Mantiene la selección manual mientras el enlace está incompleto', () => {
  assert.equal(tiktokInputMode(''), null);
  assert.equal(tiktokInputMode('@'), null);
  assert.equal(tiktokInputMode('https://www.tiktok.com/'), null);
});

test('Rechaza otros sitios y enlaces que intentan aparentar ser TikTok', () => {
  assert.equal(tiktokInputMode('https://www.instagram.com/reel/ejemplo/'), null);
  assert.equal(tiktokInputMode('https://www.tiktok.com.ejemplo.com/@usuario'), null);
  assert.equal(tiktokInputMode('https://usuario@www.tiktok.com/@ejemplo'), null);
  assert.equal(tiktokInputMode('file:///www.tiktok.com/@ejemplo'), null);
  assert.equal(tiktokInputMode(null), null);
});
