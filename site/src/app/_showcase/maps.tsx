"use client";
// Showcase: maps. The land, its districts, towns and every number are invented here, so the page needs no
// network and no data file, and nothing on it is about real people. Tiles come from /tiles, a route of this
// site that draws them as SVG.

import type { ExtendedFeature, ExtendedFeatureCollection } from "d3-geo";
import { useState } from "react";
import { MapFrame, MapFrameActivate, MapFrameCanvas, MapFrameFullscreen, MapFrameList, MapFrameNotice, MapFramePlaceholder, MapFrameStage, MapFrameToolbar } from "@/components/layout/map-frame";
import { Choropleth, ChoroplethLegend, choroplethScale } from "@/components/viz/choropleth";
import { GeoFeatures, GeoGraticule, GeoMap, GeoScaleBar, type GeoView } from "@/components/viz/geo-map";
import { GeoHexbin } from "@/components/viz/geo-hexbin";
import { GeoMarkers, type GeoPoint } from "@/components/viz/geo-markers";
import { GeoRoutes, type GeoRoute } from "@/components/viz/geo-routes";
import { GeoTiles } from "@/components/viz/geo-tiles";
import { Demo } from "./demo";

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = seeded(11);

/** Districts of an invented coast: a grid of cells in longitude and latitude, with the sea cut out of one corner. Rings run clockwise, as d3-geo reads them. */
const DISTRICTS: ExtendedFeatureCollection = {
  type: "FeatureCollection",
  features: Array.from({ length: 24 }, (_, i) => {
    const column = i % 6;
    const row = Math.floor(i / 6);
    return { column, row, i };
  })
    .filter(({ column, row }) => !(column >= 4 && row === 3) && !(column === 5 && row === 2))
    .map(({ column, row, i }): ExtendedFeature => {
      const x0 = 4 + column * 2;
      const y0 = 44 + row * 2;
      return {
        type: "Feature",
        id: `d${i}`,
        properties: { name: `District ${String.fromCharCode(65 + row)}${column + 1}`, rate: Math.round(8 + random() * 30 + column * 2) },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [x0, y0],
              [x0, y0 + 2],
              [x0 + 2, y0 + 2],
              [x0 + 2, y0],
              [x0, y0],
            ],
          ],
        },
      };
    }),
};
const RATES = DISTRICTS.features.map((f) => (f.properties as { rate: number }).rate);
const CLASSES = choroplethScale(RATES, { thresholds: [15, 25, 35] });
const SEQUENTIAL = choroplethScale(RATES);

const TOWNS: GeoPoint[] = [
  { id: "harbour", name: "Harbour", lon: 6.4, lat: 45.1, value: 820, group: "Port" },
  { id: "millford", name: "Millford", lon: 9.2, lat: 47.6, value: 310, group: "Inland" },
  { id: "eastwick", name: "Eastwick", lon: 14.6, lat: 46.2, value: 450, group: "Port" },
  { id: "highmoor", name: "Highmoor", lon: 11.3, lat: 50.8, value: 120, group: "Inland" },
  { id: "saltby", name: "Saltby", lon: 5.1, lat: 49.4, value: 260, group: "Port" },
  { id: "ferncross", name: "Ferncross", lon: 12.8, lat: 48.9, value: 190, group: "Inland" },
  { id: "oldbridge", name: "Oldbridge", lon: 7.7, lat: 51.3, value: 75, group: "Inland" },
];
const ROUTES: GeoRoute[] = TOWNS.filter((t) => t.id !== "harbour").map((town) => ({
  id: town.id,
  name: `Harbour to ${town.name}`,
  from: [6.4, 45.1],
  to: [town.lon, town.lat],
  value: Math.round((town.value ?? 100) / 20),
}));
const SIGHTINGS = Array.from({ length: 1400 }, (_, i) => {
  const centre = TOWNS[i % 4] ?? TOWNS[0];
  const spread = 0.9;
  return { lon: (centre?.lon ?? 8) + (random() + random() - 1) * spread * 2, lat: (centre?.lat ?? 46) + (random() + random() - 1) * spread };
});

export function Maps() {
  const [view, setView] = useState<GeoView>({ k: 1, x: 0, y: 0 });
  return (
    <div className="grid gap-6 @3xl:grid-cols-2">
      <Demo title="Choropleth in classes" className="@3xl:col-span-2">
        <div className="flex flex-col gap-3">
          <GeoMap label="Invented coast: rate by district" fit={DISTRICTS} projection="conic-equal-area" rotate={[-10, 0]} view={view} onViewChange={setView}>
            <GeoGraticule outline={false} />
            <Choropleth
              label="Rate by district"
              data={DISTRICTS}
              value={(f) => (f.properties as { rate: number }).rate}
              name={(f) => (f.properties as { name: string }).name}
              scale={CLASSES}
              valueLabel="Rate (%)"
            />
            <GeoScaleBar />
          </GeoMap>
          <ChoroplethLegend title="Rate (%)" scale={CLASSES} />
          <p className="text-sm text-muted-foreground" data-testid="map-zoom">
            {`${view.k.toFixed(2)} ${Math.round(view.x)} ${Math.round(view.y)}`}
          </p>
        </div>
      </Demo>
      <Demo title="Markers and bubbles">
        <GeoMap label="Invented coast: towns by visits" fit={DISTRICTS} projection="mercator">
          <GeoFeatures data={DISTRICTS} />
          <GeoMarkers label="Towns" points={TOWNS} variant="bubble" valueLabel="Visits" />
        </GeoMap>
      </Demo>
      <Demo title="Routes">
        <GeoMap label="Invented coast: sailings from Harbour" fit={DISTRICTS} projection="mercator">
          <GeoFeatures data={DISTRICTS} />
          <GeoRoutes label="Sailings" routes={ROUTES} variant="arc" valueLabel="Sailings a week" />
          <GeoMarkers label="Towns" points={TOWNS} showLabels={false} />
        </GeoMap>
      </Demo>
      <Demo title="Hexagon bins">
        <GeoMap label="Invented coast: sightings" fit={DISTRICTS} projection="mercator">
          <GeoFeatures data={DISTRICTS} />
          <GeoHexbin label="Sightings" points={SIGHTINGS} radius={12} valueLabel="Sightings" />
        </GeoMap>
      </Demo>
      <Demo title="Tiles">
        <GeoMap label="Invented coast over tiles" fit={DISTRICTS} projection="mercator">
          <GeoTiles url="/tiles/{z}/{x}/{y}" attribution="Tiles drawn by this site" />
          <GeoFeatures data={DISTRICTS} variant="line" />
          <GeoMarkers label="Towns" points={TOWNS} />
        </GeoMap>
      </Demo>
      <Demo title="In a map frame" className="@3xl:col-span-2">
        <MapFrame aria-label="Map of the invented coast">
          <MapFrameStage className="aspect-[16/10]">
            <MapFramePlaceholder>
              <MapFrameActivate>Show the map</MapFrameActivate>
              <MapFrameNotice>The map is drawn on this page from data it already has. Nothing is fetched.</MapFrameNotice>
            </MapFramePlaceholder>
            <MapFrameCanvas>
              <GeoMap label="Invented coast: rate by district, sequential" fit={DISTRICTS} projection="equal-earth" className="h-full rounded-none border-0" style={{ aspectRatio: "auto" }}>
                <Choropleth
                  label="Rate by district"
                  data={DISTRICTS}
                  value={(f) => (f.properties as { rate: number }).rate}
                  name={(f) => (f.properties as { name: string }).name}
                  scale={SEQUENTIAL}
                  valueLabel="Rate (%)"
                />
              </GeoMap>
            </MapFrameCanvas>
            <MapFrameToolbar>
              <MapFrameFullscreen />
            </MapFrameToolbar>
          </MapFrameStage>
          <MapFrameList>
            <ul className="grid gap-1 text-sm @md:grid-cols-2">
              {DISTRICTS.features.map((f) => (
                <li key={String(f.id)}>
                  {(f.properties as { name: string }).name}: {(f.properties as { rate: number }).rate}%
                </li>
              ))}
            </ul>
          </MapFrameList>
        </MapFrame>
      </Demo>
    </div>
  );
}
