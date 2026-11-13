"use client";
/**
 * @name point-cloud
 * @category three
 * @description Data as points in 3D: three numbers place each point inside a framed cube, a fourth field gives its group colour from the chart series; it goes inside scene (and model-stage to turn it), with PointCloudTable as its text alternative.
 * @when Three measures that belong together and are best turned in space: a scan, positions in a volume, an embedding. It is harder to read exactly than a 2D chart, so pass a scatter-chart as the scene's fallback and keep the table. For two measures use scatter-chart; for thousands of points in 2D use density-chart.
 * @example
 * <Scene label="Samples by depth, width and height" aspect={4 / 3} fallback={<ScatterChart label="Samples" data={rows} x="width" y="height" />}>
 *   <ModelStage><PointCloud data={rows} x="width" y="height" z="depth" group="kind" /></ModelStage>
 * </Scene>
 * <PointCloudTable caption="Samples" data={rows} x="width" y="height" z="depth" group="kind" />
 */
import { useMemo } from "react";
import { BufferAttribute, BufferGeometry, Color, EdgesGeometry, BoxGeometry } from "three";
import { useThree } from "@react-three/fiber";
import { useThemeColors } from "@/lib/theme-color";
import { ChartDataTable, formatNumber, readNumber } from "@/components/viz/chart";

export type PointCloudProps<T extends object> = {
  data: readonly T[];
  x: keyof T & string;
  y: keyof T & string;
  z: keyof T & string;
  /** A field naming each point's group: one series colour per group, in order of first appearance (five at most; the rest share the neutral). */
  group?: keyof T & string;
  /** The point size in scene units. Default 0.06. */
  size?: number;
  /** Half the cube's side in scene units. Default 1.4. */
  extent?: number;
};

const SERIES = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5", "--muted-foreground", "--border-strong"] as const;

function extentOf(values: number[]): [number, number] {
  const low = Math.min(...values);
  const high = Math.max(...values);
  return low === high ? [low - 1, high + 1] : [low, high];
}

export function PointCloud<T extends object>({ data, x, y, z, group, size = 0.06, extent = 1.4 }: PointCloudProps<T>) {
  const canvas = useThree((state) => state.gl.domElement);
  const colors = useThemeColors(SERIES, canvas);
  const { geometry, frame } = useMemo(() => {
    const rows = data.flatMap((row) => {
      const px = readNumber(row, x);
      const py = readNumber(row, y);
      const pz = readNumber(row, z);
      return px === null || py === null || pz === null ? [] : [{ px, py, pz, g: group ? String((row as Record<string, unknown>)[group] ?? "") : "" }];
    });
    const groups = [...new Set(rows.map((r) => r.g))];
    const [x0, x1] = extentOf(rows.map((r) => r.px));
    const [y0, y1] = extentOf(rows.map((r) => r.py));
    const [z0, z1] = extentOf(rows.map((r) => r.pz));
    const place = (v: number, a: number, b: number): number => ((v - a) / (b - a) - 0.5) * 2 * extent;
    const positions = new Float32Array(rows.length * 3);
    const tints = new Float32Array(rows.length * 3);
    const color = new Color();
    rows.forEach((r, i) => {
      positions[i * 3] = place(r.px, x0, x1);
      positions[i * 3 + 1] = place(r.py, y0, y1);
      positions[i * 3 + 2] = place(r.pz, z0, z1);
      const slot = Math.min(groups.indexOf(r.g), 5);
      const value = colors[SERIES[slot] ?? "--muted-foreground"];
      // Before the theme is read, a neutral grey (as a number, not a colour of its own).
      if (value) color.set(value);
      else color.setScalar(0.5);
      tints[i * 3] = color.r;
      tints[i * 3 + 1] = color.g;
      tints[i * 3 + 2] = color.b;
    });
    const points = new BufferGeometry();
    points.setAttribute("position", new BufferAttribute(positions, 3));
    points.setAttribute("color", new BufferAttribute(tints, 3));
    const box = new EdgesGeometry(new BoxGeometry(extent * 2, extent * 2, extent * 2));
    return { geometry: points, frame: box };
  }, [data, x, y, z, group, extent, colors]);
  return (
    <group>
      <points geometry={geometry}>
        <pointsMaterial size={size} vertexColors sizeAttenuation />
      </points>
      <lineSegments geometry={frame}>
        <lineBasicMaterial color={colors["--border-strong"] ? new Color(colors["--border-strong"]) : new Color().setScalar(0.6)} />
      </lineSegments>
    </group>
  );
}

export type PointCloudTableProps<T extends object> = Omit<PointCloudProps<T>, "size" | "extent"> & { caption: string; locale?: string; xLabel?: string; yLabel?: string; zLabel?: string };

/** The points as a table for screen readers: put it beside the scene, outside the canvas. */
export function PointCloudTable<T extends object>({ caption, data, x, y, z, group, xLabel, yLabel, zLabel, locale }: PointCloudTableProps<T>) {
  const number = (v: number | null): string => (v === null ? "" : formatNumber(v, locale));
  return (
    <ChartDataTable
      caption={caption}
      columns={["#", xLabel ?? x, yLabel ?? y, zLabel ?? z, ...(group ? [group] : [])]}
      rows={data.map((row, i) => [String(i + 1), number(readNumber(row, x)), number(readNumber(row, y)), number(readNumber(row, z)), ...(group ? [String((row as Record<string, unknown>)[group] ?? "")] : [])])}
    />
  );
}
