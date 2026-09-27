import { memo } from 'react';

import { City, CityTile, ROAD, TILE_SIZE } from './city';
import { Box } from './geo';

// Пороги детализации — в метрах на экранный пиксель (unit).
const LOD = {
  streets: 9, // местные улицы
  buildings: 3.2, // дома, скверы, деревья
  streetNames: 1.9, // названия местных улиц
  arterialNames: 7, // названия магистралей
  houseNumbers: 0.65, // номера домов
};

interface CityLayerProps {
  city: City;
  box: Box;
  unit: number;
  dim?: boolean;
}

// Ширина линии в метрах: не меньше заданной в пикселях, чтобы улица не
// пропадала на обзоре района.
const width = (meters: number, px: number, unit: number) => Math.max(meters, px * unit);

function CityLayer({ city, box, unit, dim }: CityLayerProps) {
  const { base } = city;
  const detailed = unit <= LOD.streets;

  // Кадр округляем до тайлов: список тайлов меняется только при переходе
  // через границу тайла, а не на каждом шаге перетаскивания.
  const snapped: Box = {
    x: Math.floor(box.x / TILE_SIZE) * TILE_SIZE,
    y: Math.floor(box.y / TILE_SIZE) * TILE_SIZE,
    w: Math.ceil(box.w / TILE_SIZE + 1) * TILE_SIZE,
    h: Math.ceil(box.h / TILE_SIZE + 1) * TILE_SIZE,
  };
  const tiles: CityTile[] = detailed
    ? city
        .tilesIn(snapped)
        .map(([ti, tj]) => city.tile(ti, tj))
        .filter((tile): tile is CityTile => tile !== null)
    : [];

  const withBuildings = unit <= LOD.buildings;
  const arterialCasing = width(ROAD.arterial, 3.4, unit);
  const arterialCore = arterialCasing - width(6, 1.3, unit);
  const localCasing = width(ROAD.local, 1.8, unit);
  const localCore = localCasing - width(4, 0.9, unit);
  const traceCasing = width(ROAD.trace, 2, unit);
  const traceCore = traceCasing - width(4, 0.9, unit);
  const labelSize = 11 * unit;

  return (
    <g className={`city${dim ? ' city-dim' : ''}`} aria-hidden="true">
      <path className="city-ground" d={base.outline} />
      <path className="city-parks" d={base.parks} />
      {withBuildings && (
        <g className="city-parks">
          {tiles.map(tile => tile.parks && <path key={tile.key} d={tile.parks} />)}
        </g>
      )}
      <path className="city-water" d={base.river} strokeWidth={width(ROAD.river, 5, unit)} />
      {withBuildings && (
        <g className="city-trees">
          {tiles.map(tile => tile.trees && <path key={tile.key} d={tile.trees} />)}
        </g>
      )}

      <g className="city-road-casing">
        {tiles.map(tile => (
          <path key={tile.key} d={tile.streets} strokeWidth={localCasing} />
        ))}
        {detailed && <path d={base.traceRoads} strokeWidth={traceCasing} />}
        <path d={base.diagonals} strokeWidth={arterialCasing} />
        <path className="city-arterial" d={base.arterials} strokeWidth={arterialCasing} />
      </g>
      <g className="city-road-core">
        {tiles.map(tile => (
          <path key={tile.key} d={tile.streets} strokeWidth={localCore} />
        ))}
        {detailed && <path d={base.traceRoads} strokeWidth={traceCore} />}
        <path d={base.diagonals} strokeWidth={arterialCore} />
        <path className="city-arterial" d={base.arterials} strokeWidth={arterialCore} />
      </g>

      {withBuildings && (
        <g className="city-buildings" strokeWidth={Math.min(1, 0.6 * unit)}>
          {tiles.map(tile => tile.buildings && <path key={tile.key} d={tile.buildings} />)}
        </g>
      )}

      <path className="city-outline" d={base.outline} strokeWidth={2 * unit} strokeDasharray={`${10 * unit} ${6 * unit}`} />

      {unit <= LOD.arterialNames && (
        <StreetNames tiles={tiles} unit={unit} size={labelSize} arterial />
      )}
      {unit <= LOD.streetNames && <StreetNames tiles={tiles} unit={unit} size={labelSize * 0.92} />}

      {unit <= LOD.houseNumbers && (
        <g className="city-house-numbers" fontSize={9 * unit} strokeWidth={2.4 * unit}>
          {tiles.flatMap(tile =>
            tile.numbers.map((number, index) =>
              inside(number.x, number.y, box) ? (
                <text key={`${tile.key}-${index}`} x={number.x} y={number.y} dy="0.35em">
                  {number.text}
                </text>
              ) : null
            )
          )}
        </g>
      )}
    </g>
  );
}

function inside(x: number, y: number, box: Box): boolean {
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
}

interface StreetNamesProps {
  tiles: CityTile[];
  unit: number;
  size: number;
  arterial?: boolean;
}

// Названия вдоль улиц — textPath по оси улицы внутри тайла.
function StreetNames({ tiles, unit, size, arterial }: StreetNamesProps) {
  const labels = tiles.flatMap(tile => (arterial ? tile.arterialLabels : tile.labels));
  return (
    <g className={`city-street-names${arterial ? ' city-street-names-major' : ''}`} fontSize={size} strokeWidth={3 * unit}>
      <defs>
        {labels.map(label => (
          <path key={label.id} id={`city-${label.id}`} d={label.d} />
        ))}
      </defs>
      {labels.map(label => (
        <text key={label.id} dy="0.35em">
          <textPath href={`#city-${label.id}`} startOffset="50%" textAnchor="middle">
            {label.name}
          </textPath>
        </text>
      ))}
    </g>
  );
}

export default memo(CityLayer);
