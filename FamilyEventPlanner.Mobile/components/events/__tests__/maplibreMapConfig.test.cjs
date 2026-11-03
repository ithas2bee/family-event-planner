const assert = require('node:assert/strict');
const test = require('node:test');
const { getMapCameraOptions, MAP_STYLE_URL } = require('../maplibreMapConfig');

test('uses a keyless MapLibre-compatible style', () => {
  assert.equal(MAP_STYLE_URL, 'https://tiles.openfreemap.org/styles/liberty');
});

test('centers the camera on the selected latitude and longitude', () => {
  const camera = getMapCameraOptions({
    latitude: 47.6062,
    longitude: -122.3321,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  assert.deepEqual(camera.center, [-122.3321, 47.6062]);
  assert.equal(camera.zoom, Math.log2(360 / 0.01));
});

test('limits the zoom to the supported range', () => {
  const camera = getMapCameraOptions({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.000001,
    longitudeDelta: 0.000001,
  });

  assert.equal(camera.zoom, 22);
});
