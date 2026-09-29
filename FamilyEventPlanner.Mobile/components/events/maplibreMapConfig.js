const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/**
 * @param {{ latitude: number, longitude: number, latitudeDelta: number }} region
 * @returns {{ center: [number, number], zoom: number }}
 */
function getMapCameraOptions(region) {
  return {
    center: [region.longitude, region.latitude],
    zoom: Math.max(0, Math.min(22, Math.log2(360 / region.latitudeDelta))),
  };
}

module.exports = { getMapCameraOptions, MAP_STYLE_URL };
