import { memo } from 'react';

import { BUILDING_CLASSES, City, CityTile, LAND_FILLS, ROAD, TILE_SIZE } from './city';
import { Box } from './geo';

// Пороги детализации — в метрах на экранный пиксель (unit).
const LOD = {
  streets: 9, // местные улицы и кварталы
  buildings: 3.2, // дома, скверы, деревья
  streetNames: 1.9, // названия местных улиц
  arterialNames: 4, // названия магистралей
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
  // на обзоре магистрали тоньше — видно характер районов, а не только сетку
  const arterialCasing = width(ROAD.arterial, detailed ? 3.4 : 2.2, unit);
  const arterialCore = arterialCasing - width(6, detailed ? 1.3 : 0.9, unit);
  const localCasing = width(ROAD.local, 1.8, unit);
  const localCore = localCasing - width(4, 0.9, unit);
  const traceCasing = width(ROAD.trace, 2, unit);
  const traceCore = traceCasing - width(4, 0.9, unit);
  const railWidth = width(ROAD.rail, 2.6, unit);
  const tie = Math.max(8, 5 * unit);
  const labelSize = 11 * unit;

  return (
    <g className={`city${dim ? ' city-dim' : ''}`} aria-hidden="true">
      <path className="city-ground" d={base.ground} />

      {/* на обзоре — характер районов целыми тайлами, ближе — кварталы */}
      {detailed
        ? LAND_FILLS.map(fill => (
            <g key={fill} className={`city-land city-land-${fill}`}>
              {tiles.map(tile => tile.ground[fill] && <path key={tile.key} d={tile.ground[fill]} />)}
            </g>
          ))
        : LAND_FILLS.map(fill => (
            <path key={fill} className={`city-land city-land-${fill}`} d={base.landuse[fill]} />
          ))}

      <path className="city-lake" d={base.lakes} />
      {detailed && (
        <g className="city-lake">
          {tiles.map(tile => tile.water && <path key={tile.key} d={tile.water} />)}
        </g>
      )}
      <path className="city-water" d={base.river} strokeWidth={width(ROAD.river, 5, unit)} />

      {withBuildings && (
        <>
          <g className="city-pitches" strokeWidth={Math.max(1.5, 0.8 * unit)}>
            {tiles.map(tile => tile.pitches && <path key={tile.key} d={tile.pitches} />)}
          </g>
          <g className="city-paths" strokeWidth={width(2.5, 0.8, unit)}>
            {tiles.map(tile => tile.paths && <path key={tile.key} d={tile.paths} />)}
          </g>
          <g className="city-trees">
            {tiles.map(tile => tile.trees && <path key={tile.key} d={tile.trees} />)}
          </g>
        </>
      )}

      <g className="city-rail">
        <path className="city-rail-bed" d={base.rail} strokeWidth={railWidth} />
        {detailed && (
          <path className="city-rail-ties" d={base.rail} strokeWidth={railWidth * 0.45} strokeDasharray={`${tie} ${tie}`} />
        )}
      </g>

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

      {withBuildings &&
        BUILDING_CLASSES.map(style => (
          <g key={style} className={`city-buildings city-buildings-${style}`} strokeWidth={Math.min(1, 0.6 * unit)}>
            {tiles.map(tile => tile.buildings[style] && <path key={tile.key} d={tile.buildings[style]} />)}
          </g>
        ))}

      {unit <= LOD.arterialNames && <StreetNames tiles={tiles} unit={unit} size={labelSize} arterial />}
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
