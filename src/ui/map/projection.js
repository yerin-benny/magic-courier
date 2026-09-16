// 위도·경도 → 지도 화면 좌표. 정거원통도법(equirectangular).
// 지도 데이터(Natural Earth)를 붙일 때도 같은 투영을 쓰면 마커와 육지가 맞는다.

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 500;

export function project(lat, lon, { width = MAP_WIDTH, height = MAP_HEIGHT } = {}) {
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) throw new RangeError(`위경도 범위 밖: ${lat}, ${lon}`);
  return {
    x: ((lon + 180) / 360) * width,
    y: ((90 - lat) / 180) * height,
  };
}
