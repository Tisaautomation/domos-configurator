"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Types ──────────────────────────────────────────────────────────

export type DomeSize = "5M" | "6M" | "7M" | "8M" | "9M" | "10M" | "11M" | "12M";
export type WindowType = "none" | "third" | "half" | "full";

export interface DomeConfig {
  size: DomeSize;
  exteriorColor: string;
  interiorColor: string;
  view: "exterior" | "interior";
  window: WindowType;
  door: string;
  foundation: string;
  insulation: string;
  heating: Set<string>;
  ventilation: Set<string>;
  extras: Set<string>;
}

// ─── DATA (from original configurator) ──────────────────────────────

export const DOME_SIZES = {
  "5M":  { radius: 2.5, height: 3.1, area: 20, scale: 0.70, label: "5M",  desc: "20 M² · 3.1m high" },
  "6M":  { radius: 3.0, height: 3.6, area: 29, scale: 0.82, label: "6M",  desc: "29 M² · 3.6m high" },
  "7M":  { radius: 3.5, height: 4.2, area: 38, scale: 0.93, label: "7M",  desc: "38 M² · 4.2m high" },
  "8M":  { radius: 4.0, height: 5.0, area: 50, scale: 1.00, label: "8M",  desc: "50 M² · 5.0m high" },
  "9M":  { radius: 4.5, height: 5.6, area: 64, scale: 1.12, label: "9M",  desc: "64 M² · 5.6m high" },
  "10M": { radius: 5.0, height: 5.0, area: 78, scale: 1.22, label: "10M", desc: "78 M² · 5.0m high" },
  "11M": { radius: 5.5, height: 5.5, area: 95, scale: 1.32, label: "11M", desc: "95 M² · 5.5m high" },
  "12M": { radius: 6.0, height: 6.0, area: 112, scale: 1.42, label: "12M", desc: "112 M² · 6.0m high" },
} as const;

export const EXTERIOR_COLORS = [
  { id: "white",       hex: "#c8c0b0", swatchHex: "#c8c0b0",     label: "White" },
  { id: "cream",       hex: "#c8a878", swatchHex: "#c8a878",     label: "Cream" },
  { id: "beige",       hex: "#a08060", swatchHex: "#a08060",     label: "Beige" },
  { id: "army-green",  hex: "#3a5a30", swatchHex: "#3a5a30",     label: "Army Green" },
  { id: "brown",       hex: "#5a3820", swatchHex: "#5a3820",     label: "Brown" },
  { id: "black",       hex: "#1a1a1a", swatchHex: "#1a1a1a",     label: "Black" },
];

export const INTERIOR_COLORS = [
  { id: "cream",         hex: "#ede8d8", label: "Cream" },
  { id: "warm-sand",     hex: "#d4b896", label: "Warm Sand" },
  { id: "terracotta",    hex: "#c47a5a", label: "Terracotta" },
  { id: "forest-green",  hex: "#6b8f71", label: "Forest Green" },
  { id: "olive",         hex: "#8b8c5e", label: "Olive" },
  { id: "charcoal",      hex: "#4a4a4a", label: "Charcoal" },
  { id: "navy",          hex: "#2d3d5c", label: "Navy" },
  { id: "burgundy",      hex: "#6b2d3e", label: "Burgundy" },
];

export const WINDOW_OPTIONS = [
  { id: "none",  label: "Solid Cover",      desc: "No transparent panels" },
  { id: "third", label: "1/3 Front View",   desc: "Front section see-through" },
  { id: "half",  label: "1/2 Panoramic",    desc: "Wide front transparency" },
  { id: "full",  label: "Full Panoramic",   desc: "360° clear outer cover" },
] as const;

export const DOOR_OPTIONS = [
  { id: "glass",  label: "Glass Wing Door",    desc: "Aluminium frame + tempered glass" },
  { id: "double", label: "Double Glass Door",  desc: "Premium bi-fold glass entrance" },
];

export const FOUNDATION_OPTIONS = [
  { id: "ground",   label: "Ground Level",     desc: "Staked directly to terrain" },
  { id: "deck",     label: "Wooden Deck",      desc: "Treated timber raised platform" },
  { id: "insul",    label: "Insulated Floor",  desc: "Rigid foam + finished flooring" },
  { id: "concrete", label: "Concrete Slab",    desc: "Permanent ground foundation" },
];

export const INSULATION_OPTIONS = [
  { id: "none", label: "No Insulation",     desc: "Open air — warm climates only" },
  { id: "std",  label: "Standard Liner",    desc: "Alum-Air multi-foil, all seasons" },
  { id: "prem", label: "Premium Quilted",   desc: "Cotton quilted + vapour barrier" },
];

export const HEATING_OPTIONS = [
  { id: "stove", label: "Wood Burning Stove", desc: "Steel stove + bespoke chimney kit" },
  { id: "ac",    label: "Climate Control",    desc: "Full heating & cooling AC unit" },
];

export const VENTILATION_OPTIONS = [
  { id: "fan", label: "Solar Exhaust Fan", desc: "Solar-powered ventilation unit" },
];

export const EXTRAS_OPTIONS = [
  { id: "skylight", label: "Skylight Window",       desc: "Stargazing hatch at dome apex" },
  { id: "curtains", label: "Rail Curtain Track",     desc: "Single rail curtain system" },
  { id: "tri",      label: "Triangle Glass Window", desc: "Fixed glazed side panel" },
  { id: "camo",     label: "Camouflage Net",        desc: "Blend with natural surroundings" },
  { id: "fan",      label: "Solar Exhaust Fan",      desc: "Solar-powered ventilation fan" },
];

export const DEFAULT_CONFIG: DomeConfig = {
  size: "7M",
  exteriorColor: "#c8a878",
  interiorColor: "#d4b896",
  view: "exterior",
  window: "none",
  door: "glass",
  foundation: "ground",
  insulation: "none",
  heating: new Set(),
  ventilation: new Set(),
  extras: new Set(),
};

// ─── Geometry Generator ─────────────────────────────────────────────

interface DomeData {
  panels: { vertices: [THREE.Vector3, THREE.Vector3, THREE.Vector3]; center: THREE.Vector3; doorZone?: boolean; skylight?: boolean }[];
  struts: { start: THREE.Vector3; end: THREE.Vector3 }[];
  radius: number;
  groundRadius: number;
}

function generateDome(radius: number, detail: number, isDouble = false): DomeData {
  const ico = new THREE.IcosahedronGeometry(radius, detail);
  const pos = ico.attributes.position;

  const verts: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    v.normalize().multiplyScalar(radius);
    verts.push(v);
  }

  const faceIndices: [number, number, number][] = [];
  const idx = ico.index;
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      faceIndices.push([idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)]);
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      faceIndices.push([i, i + 1, i + 2]);
    }
  }

  // 3V 5/8: only include triangles with ALL 3 vertices above cutoff
  // No clamping = equilateral triangles preserved
  const cutoff = -0.25 * radius;

  // Find the lowest vertex Y that passes the cutoff (the natural ground ring)
  let minY = Infinity;
  for (const v of verts) {
    if (v.y >= cutoff && v.y < minY) minY = v.y;
  }
  // Shift everything down so the lowest ring sits at y=0
  const yShift = -minY;

  const panels: DomeData["panels"] = [];
  const edgeSet = new Set<string>();
  const struts: DomeData["struts"] = [];
  const groundRadius = Math.sqrt(radius * radius - minY * minY);

  for (const [ia, ib, ic] of faceIndices) {
    const a = verts[ia], b = verts[ib], c = verts[ic];
    // Only include if ALL 3 vertices are above cutoff
    if (a.y < cutoff || b.y < cutoff || c.y < cutoff) continue;

    // Shift down to ground
    const sa = a.clone(); sa.y += yShift;
    const sb = b.clone(); sb.y += yShift;
    const sc = c.clone(); sc.y += yShift;
    const center = new THREE.Vector3().addVectors(sa, sb).add(sc).multiplyScalar(1 / 3);
    panels.push({ vertices: [sa, sb, sc], center });

    const addEdge = (v1: THREE.Vector3, v2: THREE.Vector3) => {
      const k1 = `${v1.x.toFixed(3)},${v1.y.toFixed(3)},${v1.z.toFixed(3)}`;
      const k2 = `${v2.x.toFixed(3)},${v2.y.toFixed(3)},${v2.z.toFixed(3)}`;
      const key = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        struts.push({ start: v1, end: v2 });
      }
    };

    addEdge(sa, sb);
    addEdge(sb, sc);
    addEdge(sc, sa);
  }

  // Build dome manually — row by row
  const allPanels: DomeData["panels"] = [];
  const allStruts: DomeData["struts"] = [];
  const n = 15;

  const addTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    const center = new THREE.Vector3().addVectors(a, b).add(c).multiplyScalar(1 / 3);
    allPanels.push({ vertices: [a, b, c], center });
    allStruts.push({ start: a, end: b }, { start: b, end: c }, { start: c, end: a });
  };

  // Ring 0: 15 base vertices at ground
  const ring0: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ring0.push(new THREE.Vector3(Math.cos(a) * groundRadius, 0, Math.sin(a) * groundRadius));
  }

  // Ring 1: apex on sphere, offset 0.5
  const baseSide = ring0[0].distanceTo(ring0[1]);
  const apexH = baseSide * Math.sqrt(3) / 2;
  const ring1R = Math.sqrt(Math.max(0.01, radius * radius - apexH * apexH));
  const ring1: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2;
    ring1.push(new THREE.Vector3(Math.cos(a) * ring1R, apexH, Math.sin(a) * ring1R));
  }

  // Row 1 up + down
  for (let i = 0; i < n; i++) addTri(ring0[i], ring0[(i + 1) % n], ring1[i]);
  for (let i = 0; i < n; i++) addTri(ring1[i], ring1[(i + 1) % n], ring0[(i + 1) % n]);

  // Ring 2: offset 1.0
  const side1 = ring1[0].distanceTo(ring1[1]);
  const h2 = apexH + side1 * Math.sqrt(3) / 2.5;
  const ring2R = Math.sqrt(Math.max(0.01, radius * radius - h2 * h2));
  const ring2: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + 1) / n) * Math.PI * 2;
    ring2.push(new THREE.Vector3(Math.cos(a) * ring2R, h2, Math.sin(a) * ring2R));
  }

  // Row 2 up + down
  for (let i = 0; i < n; i++) addTri(ring1[i], ring1[(i + 1) % n], ring2[i]);
  for (let i = 0; i < n; i++) addTri(ring2[i], ring2[(i + 1) % n], ring1[(i + 1) % n]);

  // Ring 3: offset 1.5, half height triangles
  const side2 = ring2[0].distanceTo(ring2[1]);
  const h3 = h2 + side2 * Math.sqrt(3) / 2.8;
  const ring3R = Math.sqrt(Math.max(0.01, radius * radius - h3 * h3));
  const ring3: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + 1.5) / n) * Math.PI * 2;
    ring3.push(new THREE.Vector3(Math.cos(a) * ring3R, h3, Math.sin(a) * ring3R));
  }

  // Row 3 up + down
  for (let i = 0; i < n; i++) addTri(ring2[i], ring2[(i + 1) % n], ring3[i]);
  for (let i = 0; i < n; i++) addTri(ring3[i], ring3[(i + 1) % n], ring2[(i + 1) % n]);

  // Row 4 up: 15 triangles, base on ring3, apex up
  const side3 = ring3[0].distanceTo(ring3[1]);
  const h4 = h3 + side3 * Math.sqrt(3) / 4;
  const ring4R = Math.sqrt(Math.max(0.01, radius * radius - h4 * h4));
  const ring4: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + 2) / n) * Math.PI * 2;
    ring4.push(new THREE.Vector3(Math.cos(a) * ring4R, h4, Math.sin(a) * ring4R));
  }
  for (let i = 0; i < n; i++) addTri(ring3[i], ring3[(i + 1) % n], ring4[i]);

  // Row 4 down: 15 inverted
  for (let i = 0; i < n; i++) addTri(ring4[i], ring4[(i + 1) % n], ring3[(i + 1) % n]);

  // Cap: 5 large pentagon triangles (skylight) + 10 fill triangles
  const apex = new THREE.Vector3(0, radius, 0);
  const skylightStart = allPanels.length; // mark where skylight panels start
  for (let p = 0; p < 5; p++) {
    const i0 = p * 3;
    const i3 = ((p + 1) * 3) % n;
    // Large pentagon triangle (skylight candidate)
    addTri(ring4[i0], ring4[i3], apex);
    // 2 fill triangles between pentagon edges
    addTri(ring4[i0], ring4[i0 + 1], ring4[i3]);
    addTri(ring4[i0 + 1], ring4[i0 + 2], ring4[i3]);
  }
  // Mark the 5 pentagon triangles as skylight
  for (let i = skylightStart; i < allPanels.length; i += 3) {
    allPanels[i].skylight = true;
  }

  // Subdivide panels in the door zone into tiny triangles
  const finalPanels: DomeData["panels"] = [];
  const subdivisions = 6;
  allPanels.forEach((panel) => {
    if (isDoorZone(panel.center, radius, isDouble)) {
      const subTris = subdivideTriangle(panel.vertices[0], panel.vertices[1], panel.vertices[2], subdivisions, radius);
      subTris.forEach(([a, b, c]) => {
        const center = new THREE.Vector3().addVectors(a, b).add(c).multiplyScalar(1 / 3);
        finalPanels.push({ vertices: [a, b, c], center, doorZone: true });
      });
    } else {
      finalPanels.push(panel);
    }
  });

  return { panels: finalPanels, struts: allStruts, radius, groundRadius };
}

// Subdivide a triangle into smaller triangles
// Midpoints are simple linear interpolation (no sphere projection)
// This ensures edge vertices match exactly with neighboring non-subdivided panels
function subdivideTriangle(
  v0: THREE.Vector3, v1: THREE.Vector3, v2: THREE.Vector3,
  depth: number, _radius: number
): [THREE.Vector3, THREE.Vector3, THREE.Vector3][] {
  if (depth === 0) return [[v0, v1, v2]];

  const mid = (a: THREE.Vector3, b: THREE.Vector3) =>
    new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);

  const m01 = mid(v0, v1);
  const m12 = mid(v1, v2);
  const m20 = mid(v2, v0);

  return [
    ...subdivideTriangle(v0, m01, m20, depth - 1, _radius),
    ...subdivideTriangle(m01, v1, m12, depth - 1, _radius),
    ...subdivideTriangle(m20, m12, v2, depth - 1, _radius),
    ...subdivideTriangle(m01, m12, m20, depth - 1, _radius),
  ];
}

// ─── Geometry merger ────────────────────────────────────────────────

function mergeGeos(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0;
  geometries.forEach((g) => { totalVerts += g.attributes.position.count; });

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const indices: number[] = [];
  let vOffset = 0;

  geometries.forEach((g) => {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      positions[(vOffset + i) * 3] = p.getX(i);
      positions[(vOffset + i) * 3 + 1] = p.getY(i);
      positions[(vOffset + i) * 3 + 2] = p.getZ(i);
      if (n) {
        normals[(vOffset + i) * 3] = n.getX(i);
        normals[(vOffset + i) * 3 + 1] = n.getY(i);
        normals[(vOffset + i) * 3 + 2] = n.getZ(i);
      }
    }
    const idx = g.index;
    if (idx) {
      for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + vOffset);
    } else {
      for (let i = 0; i < p.count; i++) indices.push(i + vOffset);
    }
    vOffset += p.count;
  });

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  merged.setIndex(indices);
  return merged;
}

// ─── 3D Sub-components ──────────────────────────────────────────────

// Panoramic window panel indices
const PANORAMIC_IDS = {
  third: new Set([154, 155]),
  half: new Set([154, 155, 118, 117, 158, 119, 150, 151, 152, 153, 156, 157, 159, 115, 116, 114, 113, 112, 111]),
  full: new Set([154, 155, 118, 117, 158, 119, 150, 151, 152, 153, 156, 157, 159, 115, 116, 114, 113, 112, 111]),
};

function DomePanels({ panels, color, innerColor, windowType, radius, selectedKey, isDouble, isInterior, extras }: {
  panels: DomeData["panels"];
  color: string;
  innerColor: string;
  windowType: string;
  radius: number;
  selectedKey: string;
  isDouble: boolean;
  isInterior: boolean;
  extras: Set<string>;
}) {
  const { opaqueGeo, transparentGeo, selectedGeo, camoGeo } = useMemo(() => {
    const selectedSet = new Set(selectedKey ? selectedKey.split(",").map(Number) : []);
    const opaque: number[] = [];
    const trans: number[] = [];
    const sel: number[] = [];

    // Build window IDs from panoramic selection
    const windowIds = windowType !== "none" ? PANORAMIC_IDS[windowType as keyof typeof PANORAMIC_IDS] : null;

    panels.forEach(({ vertices: [a, b, c], center, doorZone, skylight }, i) => {
      if (isDoorPanel(center, radius, isDouble)) return;

      const isSelected = selectedSet.has(i);

      let isWindow = false;
      if (doorZone && windowType !== "full") {
        // Door zone sub-triangles: opaque canvas in 1/3 and 1/2, but transparent in full
        isWindow = false;
      } else if (windowType === "full") {
        // Full panoramic: ALL panels transparent
        isWindow = true;
      } else if (windowType === "half") {
        // 1/2: Expanded from 1/3 — wraps further left and higher
        const h = center.y / radius;
        const ang = Math.atan2(-center.x, center.z);
        if (
          (h > 0.02 && h < 0.22 && ang > 0.1 && ang < 2.8) ||
          (h >= 0.22 && h < 0.60 && ang > 0.1 && ang < 2.3 && !(h > 0.10 && ang < 0.45)) ||
          (h >= 0.60 && h < 0.80 && ang > 0.7 && ang < 2.1)
        ) {
          isWindow = true;
        }
      } else if (windowType === "third") {
        if (center.x < -DOOR_X_OFFSET) {
          const h = center.y / radius;
          const ang = Math.atan2(-center.x, center.z);
          // Base row wider range, upper rows narrower
          if (
            (h > 0.02 && h < 0.22 && ang > 0.1 && ang < 2.3) ||
            (h >= 0.22 && h < 0.60 && ang > 0.1 && ang < 1.85 && !(h > 0.10 && ang < 0.45))
          ) {
            isWindow = true;
          }
        }
      }

      // Skylight: 5 pentagon triangles at apex
      if (!isWindow && extras.has("skylight") && skylight) {
        isWindow = true;
      }

      // Triangle Glass Windows: 3 individual triangles on right side
      if (!isWindow && extras.has("tri")) {
        const h = center.y / radius;
        const ang = Math.atan2(-center.x, center.z);
        if (
          (h > 0.45 && h < 0.65 && ang > -1.2 && ang < -0.8) ||
          (h > 0.45 && h < 0.65 && ang > -2.46 && ang < -2.06) ||
          (h > 0.45 && h < 0.65 && ang > 2.56 && ang < 2.96)
        ) {
          isWindow = true;
        }
      }

      let target = opaque;
      if (isSelected) target = sel;
      else if (isWindow) target = trans;

      target.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    });

    const make = (arr: number[]) => {
      if (!arr.length) return null;
      // Fix winding order: ensure all triangles face outward
      for (let j = 0; j < arr.length; j += 9) {
        const ax = arr[j], ay = arr[j+1], az = arr[j+2];
        const bx = arr[j+3], by = arr[j+4], bz = arr[j+5];
        const cx = arr[j+6], cy = arr[j+7], cz = arr[j+8];
        // Face center
        const fx = (ax+bx+cx)/3, fy = (ay+by+cy)/3, fz = (az+bz+cz)/3;
        // Cross product (b-a) x (c-a) = face normal
        const e1x = bx-ax, e1y = by-ay, e1z = bz-az;
        const e2x = cx-ax, e2y = cy-ay, e2z = cz-az;
        const nx = e1y*e2z - e1z*e2y;
        const ny = e1z*e2x - e1x*e2z;
        const nz = e1x*e2y - e1y*e2x;
        // If normal points inward (dot with center-to-face < 0), swap b and c
        if (fx*nx + fy*ny + fz*nz < 0) {
          arr[j+3] = cx; arr[j+4] = cy; arr[j+5] = cz;
          arr[j+6] = bx; arr[j+7] = by; arr[j+8] = bz;
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
      g.computeVertexNormals();
      return g;
    };

    // Camo net: opaque panels offset slightly outward
    let camoGeo: THREE.BufferGeometry | null = null;
    if (extras.has("camo") && opaque.length) {
      const offset = 0.03; // 3cm outside dome surface
      const camoVerts = new Float32Array(opaque.length);
      for (let j = 0; j < opaque.length; j += 3) {
        const x = opaque[j], y = opaque[j+1], z = opaque[j+2];
        const len = Math.sqrt(x*x + y*y + z*z);
        const scale = (len + offset) / len;
        camoVerts[j] = x * scale;
        camoVerts[j+1] = y * scale;
        camoVerts[j+2] = z * scale;
      }
      // Generate UVs from spherical coordinates
      const uvs = new Float32Array((opaque.length / 3) * 2);
      for (let j = 0; j < opaque.length; j += 3) {
        const x = camoVerts[j], y = camoVerts[j+1], z = camoVerts[j+2];
        const u = 0.5 + Math.atan2(x, z) / (Math.PI * 2);
        const v = y / radius;
        const idx = (j / 3) * 2;
        uvs[idx] = u * 8;
        uvs[idx + 1] = v * 8;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(camoVerts, 3));
      g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
      g.computeVertexNormals();
      camoGeo = g;
    }

    return { opaqueGeo: make(opaque), transparentGeo: make(trans), selectedGeo: make(sel), camoGeo };
  }, [panels, windowType, radius, selectedKey, extras]);

  // Black frame around triangle glass windows
  const triFrameGeo = useMemo(() => {
    if (!extras.has("tri")) return null;
    const tubes: THREE.BufferGeometry[] = [];
    const frameR = 0.025; // ~5cm diameter
    panels.forEach(({ vertices: [a, b, c], center, doorZone, skylight }) => {
      if (isDoorPanel(center, radius, isDouble)) return;
      if (doorZone || skylight) return;
      const h = center.y / radius;
      const ang = Math.atan2(-center.x, center.z);
      if (
        (h > 0.45 && h < 0.65 && ang > -1.2 && ang < -0.8) ||
        (h > 0.45 && h < 0.65 && ang > -2.46 && ang < -2.06) ||
        (h > 0.45 && h < 0.65 && ang > 2.56 && ang < 2.96)
      ) {
        // Create tube for each edge
        [[a,b],[b,c],[c,a]].forEach(([v1, v2]) => {
          const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
          const dir = new THREE.Vector3().subVectors(v2, v1);
          const len = dir.length();
          const geo = new THREE.CylinderGeometry(frameR, frameR, len, 6);
          const q = new THREE.Quaternion();
          q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
          geo.applyQuaternion(q);
          geo.translate(mid.x, mid.y, mid.z);
          tubes.push(geo);
        });
      }
    });
    if (!tubes.length) return null;
    return mergeGeos(tubes);
  }, [panels, radius, extras, isDouble]);

  // White frame around skylight panels
  const skylightFrameGeo = useMemo(() => {
    if (!extras.has("skylight")) return null;
    const tubes: THREE.BufferGeometry[] = [];
    const frameR = 0.015;
    panels.forEach(({ vertices: [a, b, c], skylight: isSky }) => {
      if (!isSky) return;
      [[a,b],[b,c],[c,a]].forEach(([v1, v2]) => {
        const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(v2, v1);
        const len = dir.length();
        const geo = new THREE.CylinderGeometry(frameR, frameR, len, 6);
        const q = new THREE.Quaternion();
        q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        geo.applyQuaternion(q);
        geo.translate(mid.x, mid.y, mid.z);
        tubes.push(geo);
      });
    });
    if (!tubes.length) return null;
    return mergeGeos(tubes);
  }, [panels, extras]);

  return (
    <>
      {opaqueGeo && color !== "_transparent" && (
        <>
          <mesh geometry={opaqueGeo}>
            <meshStandardMaterial color={color} roughness={0.7} metalness={0.05} side={THREE.FrontSide} flatShading />
          </mesh>
          <mesh geometry={opaqueGeo}>
            <meshStandardMaterial color={innerColor} roughness={0.7} metalness={0.05} side={THREE.BackSide} flatShading />
          </mesh>
        </>
      )}
      {opaqueGeo && color === "_transparent" && (
        <mesh geometry={opaqueGeo}>
          <meshPhysicalMaterial color="#aaddee" transparent opacity={0.2} roughness={0.05} side={THREE.DoubleSide} flatShading />
        </mesh>
      )}
      {transparentGeo && (!isInterior || windowType === "full") && (
        <mesh geometry={transparentGeo}>
          <meshPhysicalMaterial
            color="#334444"
            transparent
            opacity={0.35}
            roughness={0.15}
            metalness={0.05}
            transmission={0.6}
            side={THREE.DoubleSide}
            flatShading
          />
        </mesh>
      )}
      {selectedGeo && (
        <mesh geometry={selectedGeo}>
          <meshPhysicalMaterial color="#0055ff" transparent opacity={0.8} roughness={0.1} side={THREE.DoubleSide} flatShading />
        </mesh>
      )}
      {triFrameGeo && (
        <mesh geometry={triFrameGeo}>
          <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.1} />
        </mesh>
      )}
      {skylightFrameGeo && (
        <mesh geometry={skylightFrameGeo}>
          <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.1} />
        </mesh>
      )}
      {camoGeo && <CamoMesh geometry={camoGeo} />}
    </>
  );
}

// Check if a point is inside the door opening (offset by DOOR_X_OFFSET)
function isInsideDoor(p: THREE.Vector3, radius: number, isDouble: boolean): boolean {
  const dims = getDoorDims(radius, isDouble);
  const hw = dims.width / 2;
  const cx = p.x - DOOR_X_OFFSET;
  return Math.abs(cx) < hw && p.y > 0 && p.y < dims.height && p.z > radius * 0.6;
}

// Clip a strut segment to the door frame — returns the clipped [start, end] or null if fully inside
function clipStrutToDoor(a: THREE.Vector3, b: THREE.Vector3, radius: number, isDouble: boolean): [THREE.Vector3, THREE.Vector3] | null {
  const aIn = isInsideDoor(a, radius, isDouble);
  const bIn = isInsideDoor(b, radius, isDouble);
  if (aIn && bIn) return null; // fully inside door
  if (!aIn && !bIn) return [a, b]; // fully outside
  // One inside, one outside — clip at door boundary
  const dims = getDoorDims(radius, isDouble);
  const hw = dims.width / 2;
  const inside = aIn ? a : b;
  const outside = aIn ? b : a;
  const dir = new THREE.Vector3().subVectors(outside, inside);
  // Find t where the strut exits the door box
  let tBest = 1;
  const cx = inside.x - DOOR_X_OFFSET;
  const dx = dir.x;
  // Left/right walls
  if (dx !== 0) {
    const tL = (-hw - cx) / dx;
    const tR = (hw - cx) / dx;
    if (tL > 0 && tL < tBest) tBest = tL;
    if (tR > 0 && tR < tBest) tBest = tR;
  }
  // Top
  if (dir.y !== 0) {
    const tT = (dims.height - inside.y) / dir.y;
    if (tT > 0 && tT < tBest) tBest = tT;
  }
  // Bottom
  if (dir.y !== 0) {
    const tB = -inside.y / dir.y;
    if (tB > 0 && tB < tBest) tBest = tB;
  }
  const clipPt = inside.clone().add(dir.clone().multiplyScalar(tBest));
  return aIn ? [clipPt, b] : [a, clipPt];
}

function DomeStruts({ struts, radius, isDouble }: { struts: DomeData["struts"]; radius: number; isDouble: boolean }) {
  const geometry = useMemo(() => {
    const merged: THREE.BufferGeometry[] = [];
    struts.forEach(({ start, end }) => {
      const clipped = clipStrutToDoor(start, end, radius, isDouble);
      if (!clipped) return;
      const [s, e] = clipped;
      const midPt = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(e, s);
      const length = dir.length();
      if (length < 0.01) return;
      const geo = new THREE.CylinderGeometry(0.04, 0.04, length, 6, 1);
      const q = new THREE.Quaternion();
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      geo.applyQuaternion(q);
      geo.translate(midPt.x, midPt.y, midPt.z);
      merged.push(geo);
    });
    return mergeGeos(merged);
  }, [struts, radius, isDouble]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.15} />
    </mesh>
  );
}

function DomeHubs({ struts, radius, isDouble }: { struts: DomeData["struts"]; radius: number; isDouble: boolean }) {
  const geometry = useMemo(() => {
    const seen = new Set<string>();
    const merged: THREE.BufferGeometry[] = [];
    struts.forEach(({ start, end }) => {
      [start, end].forEach((v) => {
        if (isInsideDoor(v, radius, isDouble)) return;
        const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
        if (!seen.has(key)) {
          seen.add(key);
          const geo = new THREE.SphereGeometry(0.06, 8, 8);
          geo.translate(v.x, v.y, v.z);
          merged.push(geo);
        }
      });
    });
    return mergeGeos(merged);
  }, [struts, radius, isDouble]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#e8e8e8" roughness={0.3} metalness={0.2} />
    </mesh>
  );
}

// Generate wood plank texture via canvas
function CamoMesh({ geometry }: { geometry: THREE.BufferGeometry }) {
  const camoTex = useMemo(() => makeCamoTexture(), []);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        map={camoTex}
        roughness={0.95}
        metalness={0.0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function makeCamoTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const ctx = c.getContext("2d")!;

  // Base: dark net string color
  ctx.fillStyle = "#3a3a2a";
  ctx.fillRect(0, 0, 512, 512);

  // Net string grid — diagonal diamond pattern
  const spacing = 20;
  ctx.strokeStyle = "#2a2a1a";
  ctx.lineWidth = 2;
  for (let y = -512; y < 1024; y += spacing) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y + 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y - 512); ctx.stroke();
  }

  // Fake leaves — dense layer covering the net, various muted greens/browns
  const leafColors = [
    "#4a5a32", "#556B2F", "#3d4d28", "#5e6e3a",
    "#4d5530", "#6b7a45", "#3a4a22", "#5a6a38",
    "#4e5e2e", "#697a42", "#445528", "#586835",
    "#6d6b40", "#5a5530", "#4a4828",  // brownish leaves
  ];

  for (let i = 0; i < 350; i++) {
    const lx = Math.random() * 512;
    const ly = Math.random() * 512;
    const angle = Math.random() * Math.PI * 2;
    const leafW = 10 + Math.random() * 22;
    const leafH = 4 + Math.random() * 9;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(angle);
    ctx.fillStyle = leafColors[Math.floor(Math.random() * leafColors.length)];

    // Leaf shape
    ctx.beginPath();
    ctx.moveTo(-leafW, 0);
    ctx.quadraticCurveTo(-leafW * 0.2, -leafH, leafW, 0);
    ctx.quadraticCurveTo(-leafW * 0.2, leafH, -leafW, 0);
    ctx.fill();

    // Center vein
    ctx.strokeStyle = "rgba(30,40,20,0.4)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-leafW * 0.8, 0);
    ctx.lineTo(leafW * 0.8, 0);
    ctx.stroke();

    // Side veins
    for (let v = -2; v <= 2; v++) {
      if (v === 0) continue;
      ctx.strokeStyle = "rgba(30,40,20,0.2)";
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      const vx = v * leafW * 0.25;
      ctx.moveTo(vx, 0);
      ctx.lineTo(vx + leafW * 0.15, v > 0 ? -leafH * 0.5 : leafH * 0.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Shadow/depth between leaves
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = "rgba(20,25,15,0.15)";
    ctx.beginPath();
    ctx.ellipse(Math.random() * 512, Math.random() * 512, 5 + Math.random() * 15, 3 + Math.random() * 8, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  return tex;
}

function makeWoodTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 1024;
  const ctx = c.getContext("2d")!;

  // Base warm wood color
  ctx.fillStyle = "#8B6914";
  ctx.fillRect(0, 0, 1024, 1024);

  // Planks with realistic variation
  const plankHeight = 80;
  const plankColors = [
    [140, 100, 45], [155, 110, 50], [130, 90, 40], [145, 105, 48],
    [160, 115, 55], [135, 95, 42], [150, 108, 52], [125, 88, 38],
    [148, 102, 46], [138, 96, 44], [152, 112, 53], [142, 100, 47],
    [158, 114, 54],
  ];

  for (let y = 0; y < 1024; y += plankHeight) {
    const ci = Math.floor(Math.random() * plankColors.length);
    const [r, g, b] = plankColors[ci];
    // Base plank fill
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, y + 2, 1024, plankHeight - 3);

    // Plank gap — dark line
    ctx.fillStyle = "#3a2810";
    ctx.fillRect(0, y, 1024, 2);

    // Wood grain — curved lines for natural look
    for (let j = 0; j < 15; j++) {
      const grainY = y + 4 + Math.random() * (plankHeight - 8);
      const dark = Math.random() > 0.5;
      ctx.strokeStyle = dark
        ? `rgba(60,35,15,${0.1 + Math.random() * 0.15})`
        : `rgba(180,140,80,${0.08 + Math.random() * 0.1})`;
      ctx.lineWidth = 0.5 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, grainY);
      // Wavy grain line
      for (let x = 0; x < 1024; x += 40) {
        ctx.lineTo(x + 40, grainY + (Math.random() - 0.5) * 3);
      }
      ctx.stroke();
    }

    // Knots — occasional dark oval
    if (Math.random() < 0.15) {
      const kx = 100 + Math.random() * 824;
      const ky = y + plankHeight * 0.3 + Math.random() * plankHeight * 0.4;
      const kr = 6 + Math.random() * 10;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(kx, ky, kr, kr * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(50,30,10,${0.3 + Math.random() * 0.3})`;
      ctx.fill();
      // Knot ring
      ctx.strokeStyle = `rgba(80,50,20,${0.2 + Math.random() * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(kx, ky, kr + 3, kr * 0.7 + 2, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Subtle highlight streak on some planks
    if (Math.random() < 0.3) {
      ctx.fillStyle = `rgba(200,160,90,0.06)`;
      ctx.fillRect(0, y + plankHeight * 0.2, 1024, plankHeight * 0.3);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function Baseboard({ groundRadius, sphereRadius, windowType, panels, radius, isDouble }: {
  groundRadius: number; sphereRadius: number; windowType: string;
  panels: DomeData["panels"]; radius: number; isDouble: boolean;
}) {
  const geo = useMemo(() => {
    if (windowType === "none") return null;
    if (windowType === "full") {
      // Full: complete ring
      const angStart = 0;
      const angEnd = Math.PI * 2;
      const height = 0.10;
      const segments = 48;
      const step = (angEnd - angStart) / segments;
      const verts: number[] = [];
      const idx: number[] = [];
      for (let i = 0; i <= segments; i++) {
        const ang = angStart + i * step;
        const r = groundRadius - 0.04;
        const x0 = -Math.sin(ang) * r;
        const z0 = Math.cos(ang) * r;
        verts.push(x0, 0, z0);
        verts.push(x0, height, z0);
      }
      for (let i = 0; i < segments; i++) {
        const b = i * 2;
        idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    }
    // Find actual min/max angle of base-row transparent panels
    let minAng = Infinity;
    let maxAng = -Infinity;
    panels.forEach(({ center, doorZone }) => {
      if (isDoorPanel(center, radius, isDouble)) return;
      if (doorZone) return;
      const h = center.y / radius;
      if (h > 0.25) return; // only base row
      const ang = Math.atan2(-center.x, center.z);
      let isWindow = false;
      if (windowType === "half") {
        if ((h > 0.02 && h < 0.22 && ang > 0.1 && ang < 2.8)) isWindow = true;
      } else if (windowType === "third") {
        if (center.x < -DOOR_X_OFFSET && (h > 0.02 && h < 0.22 && ang > 0.1 && ang < 2.3)) isWindow = true;
      }
      if (isWindow) {
        if (ang < minAng) minAng = ang;
        if (ang > maxAng) maxAng = ang;
      }
    });
    if (minAng === Infinity) return null;
    // Shrink slightly so baseboard doesn't poke past panels
    const angStart = minAng + 0.05;
    const angEnd = maxAng - 0.05;
    const height = 0.10;
    const segments = 48;
    const step = (angEnd - angStart) / segments;
    const verts: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const ang = angStart + i * step;
      // Bottom at y=0, horizontal radius = groundRadius
      const r = groundRadius - 0.04;
      const x0 = -Math.sin(ang) * r;
      const z0 = Math.cos(ang) * r;
      const x1 = x0;
      const z1 = z0;
      verts.push(x0, 0, z0);        // bottom
      verts.push(x1, height, z1);    // top on sphere
    }
    for (let i = 0; i < segments; i++) {
      const b = i * 2;
      idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [groundRadius, sphereRadius, windowType, panels, radius, isDouble]);

  if (!geo) return null;
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#111111" roughness={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
}

function WoodDeck({ radius }: { radius: number }) {
  const deckRadius = radius + 0.3;
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const sides = 10;
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const x = Math.cos(angle) * deckRadius;
      const z = Math.sin(angle) * deckRadius;
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -0.15, 0);
    return geo;
  }, [deckRadius]);

  const woodTex = useMemo(() => makeWoodTexture(), []);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial map={woodTex} roughness={0.8} metalness={0.0} />
    </mesh>
  );
}

function InteriorFloor({ radius }: { radius: number }) {
  const woodTex = useMemo(() => makeWoodTexture(), []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <circleGeometry args={[radius, 64]} />
      <meshStandardMaterial map={woodTex} roughness={0.8} />
    </mesh>
  );
}

// Door dimensions
// Door dimensions scale with dome size
function getDoorDims(radius: number, isDouble: boolean) {
  const scale = radius / 3.5; // normalized to 7M dome
  return {
    width: isDouble ? 1.6 * scale : 0.9 * scale,
    height: Math.min(2.1 * scale, radius * 0.58), // never taller than dome allows
  };
}

// Door X offset — must match the group position in DomeScene
const DOOR_X_OFFSET = 0.3;

// Check if a panel is in the door ZONE (used for subdivision selection)
function isDoorZone(center: THREE.Vector3, radius: number, isDouble = false): boolean {
  const dims = getDoorDims(radius, isDouble);
  const cx = center.x - DOOR_X_OFFSET;
  const margin = radius * 0.15; // scale margin with dome size
  return (
    Math.abs(cx) < dims.width / 2 + margin &&
    center.z > radius * 0.45 &&
    center.y < dims.height + margin &&
    center.y >= -0.1
  );
}

// Check if a (small subdivided) panel falls INSIDE the door opening and should be removed
function isDoorPanel(center: THREE.Vector3, radius: number, isDouble = false): boolean {
  const dims = getDoorDims(radius, isDouble);
  const hw = dims.width / 2;
  const cx = center.x - DOOR_X_OFFSET;
  return (
    Math.abs(cx) < hw &&
    center.y > 0 &&
    center.y < dims.height &&
    center.z > radius * 0.65
  );
}

function Door({ radius, canvasColor, isInterior, isDouble, windowType }: { radius: number; canvasColor: string; isInterior: boolean; isDouble: boolean; windowType: string }) {
  const dims = getDoorDims(radius, isDouble);
  const DWIDTH = dims.width;
  const DHEIGHT = dims.height;
  const doorZ = radius + 0.05;
  const domeSurfaceZAtTop = Math.sqrt(Math.max(0.01, radius * radius - DHEIGHT * DHEIGHT));
  const tunnelDepth = doorZ - domeSurfaceZAtTop;
  const hw = DWIDTH / 2;

  // Build canvas tunnel geometry: left wall, right wall, top
  const tunnelGeo = useMemo(() => {
    const positions: number[] = [];
    const steps = 10; // subdivisions for smooth curve

    // LEFT WALL: x = -hw, from y=0 to y=DHEIGHT
    for (let i = 0; i < steps; i++) {
      const y0 = (i / steps) * DHEIGHT;
      const y1 = ((i + 1) / steps) * DHEIGHT;
      // Start tunnel deeper inside dome (subtract overlap) to close gap with panels
      const overlap = 0.4;
      const z0_dome = Math.sqrt(Math.max(0.01, radius * radius - y0 * y0 - hw * hw)) - overlap;
      const z1_dome = Math.sqrt(Math.max(0.01, radius * radius - y1 * y1 - hw * hw)) - overlap;

      positions.push(-hw, y0, z0_dome, -hw, y0, doorZ, -hw, y1, doorZ);
      positions.push(-hw, y0, z0_dome, -hw, y1, doorZ, -hw, y1, z1_dome);
    }

    // RIGHT WALL: x = +hw
    for (let i = 0; i < steps; i++) {
      const y0 = (i / steps) * DHEIGHT;
      const y1 = ((i + 1) / steps) * DHEIGHT;
      const overlap = 0.4;
      const z0_dome = Math.sqrt(Math.max(0.01, radius * radius - y0 * y0 - hw * hw)) - overlap;
      const z1_dome = Math.sqrt(Math.max(0.01, radius * radius - y1 * y1 - hw * hw)) - overlap;

      positions.push(hw, y0, doorZ, hw, y0, z0_dome, hw, y1, z1_dome);
      positions.push(hw, y0, doorZ, hw, y1, z1_dome, hw, y1, doorZ);
    }

    // TOP: y = DHEIGHT, from x=-hw to x=+hw
    const topSteps = 8;
    for (let i = 0; i < topSteps; i++) {
      const x0 = -hw + (i / topSteps) * DWIDTH;
      const x1 = -hw + ((i + 1) / topSteps) * DWIDTH;
      const overlap = 0.4;
      const z0_dome = Math.sqrt(Math.max(0.01, radius * radius - DHEIGHT * DHEIGHT - x0 * x0)) - overlap;
      const z1_dome = Math.sqrt(Math.max(0.01, radius * radius - DHEIGHT * DHEIGHT - x1 * x1)) - overlap;

      positions.push(x0, DHEIGHT, z0_dome, x0, DHEIGHT, doorZ, x1, DHEIGHT, doorZ);
      positions.push(x0, DHEIGHT, z0_dome, x1, DHEIGHT, doorZ, x1, DHEIGHT, z1_dome);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }, [radius, doorZ]);

  return (
    <group>
      {/* Canvas tunnel — always opaque */}
      <mesh geometry={tunnelGeo}>
        <meshStandardMaterial color={isInterior ? "#e8e0d0" : (canvasColor === "_transparent" ? "#e8e0d0" : canvasColor)} roughness={0.7} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>

      {/* Door frame - at doorZ */}
      {/* Left post */}
      <mesh position={[-hw, DHEIGHT / 2, doorZ]}>
        <boxGeometry args={[0.06, DHEIGHT, 0.06]} />
        <meshStandardMaterial color="#b0b0b0" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Right post */}
      <mesh position={[hw, DHEIGHT / 2, doorZ]}>
        <boxGeometry args={[0.06, DHEIGHT, 0.06]} />
        <meshStandardMaterial color="#b0b0b0" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Top beam */}
      <mesh position={[0, DHEIGHT, doorZ]}>
        <boxGeometry args={[DWIDTH + 0.06, 0.06, 0.06]} />
        <meshStandardMaterial color="#b0b0b0" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Threshold */}
      <mesh position={[0, 0.02, doorZ]}>
        <boxGeometry args={[DWIDTH + 0.06, 0.04, 0.06]} />
        <meshStandardMaterial color="#b0b0b0" roughness={0.3} metalness={0.4} />
      </mesh>



      {/* Double door: center divider + 2 handles */}
      {isDouble && (
        <>
          <mesh position={[0, DHEIGHT / 2, doorZ]}>
            <boxGeometry args={[0.06, DHEIGHT, 0.06]} />
            <meshStandardMaterial color="#b0b0b0" roughness={0.3} metalness={0.4} />
          </mesh>
          <mesh position={[-0.1, DHEIGHT * 0.5, doorZ + 0.04]}>
            <boxGeometry args={[0.03, 0.14, 0.03]} />
            <meshStandardMaterial color="#111111" roughness={0.3} metalness={0.4} />
          </mesh>
          <mesh position={[0.1, DHEIGHT * 0.5, doorZ + 0.04]}>
            <boxGeometry args={[0.03, 0.14, 0.03]} />
            <meshStandardMaterial color="#111111" roughness={0.3} metalness={0.4} />
          </mesh>
        </>
      )}
      {/* Single door: 1 handle */}
      {!isDouble && (
        <mesh position={[hw - 0.12, DHEIGHT * 0.5, doorZ + 0.04]}>
          <boxGeometry args={[0.03, 0.14, 0.03]} />
          <meshStandardMaterial color="#111111" roughness={0.3} metalness={0.4} />
        </mesh>
      )}

      {/* Glass panel fill — hidden from interior for full transparency */}
      {isInterior ? null : isDouble ? (
        <>
          <mesh position={[-DWIDTH / 4, DHEIGHT / 2, doorZ]}>
            <planeGeometry args={[DWIDTH / 2 - 0.08, DHEIGHT - 0.08]} />
            <meshPhysicalMaterial
              color="#aaccdd"
              transparent
              opacity={0.15}
              roughness={0.05}
              metalness={0.1}
              transmission={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[DWIDTH / 4, DHEIGHT / 2, doorZ]}>
            <planeGeometry args={[DWIDTH / 2 - 0.08, DHEIGHT - 0.08]} />
            <meshPhysicalMaterial
              color="#aaccdd"
              transparent
              opacity={0.15}
              roughness={0.05}
              metalness={0.1}
              transmission={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      ) : (
        <mesh position={[0, DHEIGHT / 2, doorZ]}>
          <planeGeometry args={[DWIDTH - 0.08, DHEIGHT - 0.08]} />
          <meshPhysicalMaterial
            color="#aaccdd"
            transparent
            opacity={0.15}
            roughness={0.05}
            metalness={0.1}
            transmission={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

// ─── Climate Control (AC Split) ────────────────────────────────────

function ACSplit({ radius, isInterior }: { radius: number; isInterior: boolean }) {
  const scale = radius / 3.5;

  const wallAngle = Math.PI * 0.25; // front-right (opposite side of stove)
  const facingAngle = wallAngle + Math.PI; // face inward toward center

  // Indoor unit: flush on dome wall, big and visible
  const indoorDist = radius * 0.78;
  const indoorX = Math.cos(wallAngle) * indoorDist;
  const indoorZ = Math.sin(wallAngle) * indoorDist;
  const indoorY = radius * 0.42;

  // Outdoor unit + pipes: same angle, just outside dome
  const outdoorDist = radius + 0.4;
  const outdoorX = Math.cos(wallAngle) * outdoorDist;
  const outdoorZ = Math.sin(wallAngle) * outdoorDist;

  // Where dome wall is at ground level on this angle (for pipe run)
  const domeWallDist = radius;
  const domeWallX = Math.cos(wallAngle) * domeWallDist;
  const domeWallZ = Math.sin(wallAngle) * domeWallDist;

  // Pipe entry point on dome — matches where indoor pipe cover meets the wall
  const pipeEntryY = 0.08;

  const uW = 0.9;
  const uH = 0.28;
  const uD = 0.20;

  return (
    <group>
      {/* Indoor unit — visible from both views */}
      <group position={[indoorX, indoorY, indoorZ]} rotation={[0, facingAngle, 0]}>
        {/* ── Main body ── */}
        <mesh>
          <boxGeometry args={[uW, uH, uD]} />
          <meshStandardMaterial color="#f8f8f8" roughness={0.15} metalness={0.02} />
        </mesh>

        {/* Front panel — smooth white face */}
        <mesh position={[0, 0.02, uD / 2 + 0.001]}>
          <boxGeometry args={[uW - 0.02, uH * 0.6, 0.008]} />
          <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.0} />
        </mesh>

        {/* Air outlet — wide dark opening at bottom */}
        <mesh position={[0, -uH * 0.28, uD / 2 + 0.001]}>
          <boxGeometry args={[uW * 0.9, uH * 0.28, 0.006]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.95} />
        </mesh>

        {/* Deflector vane (angled flap inside outlet) */}
        <mesh position={[0, -uH * 0.35, uD / 2 - 0.02]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[uW * 0.85, 0.005, 0.06]} />
          <meshStandardMaterial color="#e0e0e0" roughness={0.2} metalness={0.05} />
        </mesh>

        {/* LED display area (right side) */}
        <mesh position={[uW * 0.35, uH * 0.2, uD / 2 + 0.005]}>
          <boxGeometry args={[0.06, 0.03, 0.003]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.3} />
        </mesh>
        {/* Green power LED */}
        <mesh position={[uW * 0.35, uH * 0.2, uD / 2 + 0.007]}>
          <circleGeometry args={[0.006, 8]} />
          <meshStandardMaterial color="#00ee44" emissive="#00ee44" emissiveIntensity={4} />
        </mesh>

        {/* Top rounded edge */}
        <mesh position={[0, uH / 2, 0]}>
          <boxGeometry args={[uW + 0.01, 0.015, uD + 0.005]} />
          <meshStandardMaterial color="#eeeeee" roughness={0.2} metalness={0.05} />
        </mesh>

        {/* Bottom edge */}
        <mesh position={[0, -uH / 2, 0]}>
          <boxGeometry args={[uW + 0.01, 0.01, uD + 0.005]} />
          <meshStandardMaterial color="#e5e5e5" roughness={0.2} metalness={0.05} />
        </mesh>

        {/* Black accent stripe across front */}
        <mesh position={[0, uH * 0.08, uD / 2 + 0.002]}>
          <boxGeometry args={[uW * 0.92, 0.012, 0.003]} />
          <meshStandardMaterial color="#111111" roughness={0.3} metalness={0.1} />
        </mesh>

        {/* Buttons row (right side, small) */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[uW * 0.3 + i * 0.03, uH * 0.35, uD / 2 + 0.005]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.003, 8]} />
            <meshStandardMaterial color="#333333" roughness={0.4} metalness={0.3} />
          </mesh>
        ))}

        {/* Back plate (mount bracket) */}
        <mesh position={[0, 0, -uD / 2 - 0.008]}>
          <boxGeometry args={[uW * 0.7, uH * 0.8, 0.015]} />
          <meshStandardMaterial color="#cccccc" roughness={0.5} metalness={0.15} />
        </mesh>
      </group>

      {/* Interior pipe — from ground up wall to indoor unit */}
      <mesh position={[domeWallX * 0.95, indoorY / 2, domeWallZ * 0.95]}>
        <cylinderGeometry args={[0.02, 0.02, indoorY, 8]} />
        <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Pipe cover at base (where it enters dome wall) */}
      <mesh position={[domeWallX * 0.95, 0.05, domeWallZ * 0.95]} rotation={[0, wallAngle, 0]}>
        <boxGeometry args={[0.08, 0.1, 0.04]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Pipe cover at top (where it connects to unit) */}
      <mesh position={[domeWallX * 0.95, indoorY - 0.05, domeWallZ * 0.95]} rotation={[0, wallAngle, 0]}>
        <boxGeometry args={[0.08, 0.1, 0.04]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Outdoor compressor unit + pipes */}
      <group position={[outdoorX, 0, outdoorZ]} rotation={[0, facingAngle + 2.79, 0]}>
        {/* Main body */}
        <mesh position={[0, 0.25 * scale, 0]}>
          <boxGeometry args={[0.55 * scale, 0.45 * scale, 0.25 * scale]} />
          <meshStandardMaterial color="#d8d8d8" roughness={0.5} metalness={0.15} />
        </mesh>

        {/* Top plate */}
        <mesh position={[0, 0.476 * scale, 0]}>
          <boxGeometry args={[0.58 * scale, 0.02 * scale, 0.28 * scale]} />
          <meshStandardMaterial color="#c0c0c0" roughness={0.4} metalness={0.2} />
        </mesh>

        {/* Fan grille */}
        <mesh position={[0, 0.28 * scale, 0.126 * scale]}>
          <circleGeometry args={[0.14 * scale, 24]} />
          <meshStandardMaterial color="#555555" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.28 * scale, 0.128 * scale]}>
          <circleGeometry args={[0.04 * scale, 12]} />
          <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.4} />
        </mesh>
        {[-2, -1, 0, 1, 2].map((i) => (
          <mesh key={`h${i}`} position={[0, 0.28 * scale + i * 0.055 * scale, 0.127 * scale]}>
            <boxGeometry args={[0.28 * scale, 0.006 * scale, 0.004]} />
            <meshStandardMaterial color="#aaaaaa" roughness={0.4} metalness={0.3} />
          </mesh>
        ))}

        {/* Side vents */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={`v${i}`} position={[-0.276 * scale, 0.12 * scale + i * 0.05 * scale, 0]}>
            <boxGeometry args={[0.005, 0.02 * scale, 0.2 * scale]} />
            <meshStandardMaterial color="#aaaaaa" roughness={0.5} metalness={0.2} />
          </mesh>
        ))}

        {/* Feet */}
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dz], i) => (
          <mesh key={i} position={[dx * 0.22 * scale, 0.015 * scale, dz * 0.1 * scale]}>
            <boxGeometry args={[0.06 * scale, 0.03 * scale, 0.06 * scale]} />
            <meshStandardMaterial color="#333333" roughness={0.9} metalness={0.05} />
          </mesh>
        ))}
      </group>

      {/* Pipes from compressor top to dome wall entry point */}
      {(() => {
        // Pipe starts at compressor top, goes horizontal to dome wall, then up to entry
        const pipeR = 0.015 * scale;
        const thinR = 0.01 * scale;
        const compTopY = 0.48 * scale;

        // Horizontal run: from compressor back to dome wall
        const horizDist = Math.sqrt(
          (outdoorX - domeWallX) ** 2 + (outdoorZ - domeWallZ) ** 2
        );
        const midHorizX = (outdoorX + domeWallX) / 2;
        const midHorizZ = (outdoorZ + domeWallZ) / 2;

        // Vertical run: from compressor height up dome wall to entry point
        const vertHeight = pipeEntryY - compTopY;
        const vertCenterY = compTopY + vertHeight / 2;

        return (
          <group>
            {/* Thick pipe - horizontal from compressor to dome wall */}
            <mesh position={[midHorizX, compTopY, midHorizZ]} rotation={[0, wallAngle, Math.PI / 2]}>
              <cylinderGeometry args={[pipeR, pipeR, horizDist, 8]} />
              <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.5} />
            </mesh>
            {/* Thick pipe - vertical along dome wall */}
            <mesh position={[domeWallX, vertCenterY, domeWallZ]}>
              <cylinderGeometry args={[pipeR, pipeR, Math.abs(vertHeight) + 0.05, 8]} />
              <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.5} />
            </mesh>

            {/* Thin pipe - horizontal (offset slightly) */}
            <mesh position={[midHorizX + Math.cos(wallAngle + Math.PI / 2) * 0.04 * scale, compTopY - 0.04 * scale, midHorizZ + Math.sin(wallAngle + Math.PI / 2) * 0.04 * scale]} rotation={[0, wallAngle, Math.PI / 2]}>
              <cylinderGeometry args={[thinR, thinR, horizDist, 8]} />
              <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.5} />
            </mesh>
            {/* Thin pipe - vertical */}
            <mesh position={[domeWallX + Math.cos(wallAngle + Math.PI / 2) * 0.04 * scale, vertCenterY - 0.02 * scale, domeWallZ + Math.sin(wallAngle + Math.PI / 2) * 0.04 * scale]}>
              <cylinderGeometry args={[thinR, thinR, Math.abs(vertHeight) + 0.05, 8]} />
              <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.5} />
            </mesh>

            {/* Pipe cover / wall plate where pipes enter dome */}
            <mesh position={[domeWallX, pipeEntryY, domeWallZ]} rotation={[0, wallAngle, 0]}>
              <boxGeometry args={[0.12 * scale, 0.1 * scale, 0.03 * scale]} />
              <meshStandardMaterial color="#e0e0e0" roughness={0.4} metalness={0.2} />
            </mesh>
          </group>
        );
      })()}
    </group>
  );
}


// ─── Wood Burning Stove ────────────────────────────────────────────

function WoodStove({ radius, isInterior }: { radius: number; isInterior: boolean }) {
  const scale = radius / 3.5; // normalize to 7M
  const stoveX = -radius * 0.45;
  const stoveZ = -radius * 0.45;

  // Chimney: starts flush with stove top plate, goes through dome
  const chimneyBaseY = 0.62 * scale; // flush with stove top
  const chimneyXZ = Math.sqrt(stoveX * stoveX + stoveZ * stoveZ);
  const domeYAtChimney = Math.sqrt(Math.max(0, radius * radius - chimneyXZ * chimneyXZ));
  const chimneyTopY = domeYAtChimney + 0.6;
  const chimneyHeight = chimneyTopY - chimneyBaseY;

  // Rain cap sits on top of chimney
  const capY = chimneyTopY + 0.02;

  if (true) {
    // Show stove body from both views (visible through panoramic)
    return (
      <group position={[stoveX, 0, stoveZ]}>
        {/* Stove body - main box */}
        <mesh position={[0, 0.32 * scale, 0]}>
          <boxGeometry args={[0.5 * scale, 0.55 * scale, 0.4 * scale]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.85} metalness={0.3} />
        </mesh>

        {/* Stove top plate */}
        <mesh position={[0, 0.6 * scale, 0]}>
          <boxGeometry args={[0.54 * scale, 0.04 * scale, 0.44 * scale]} />
          <meshStandardMaterial color="#222222" roughness={0.6} metalness={0.4} />
        </mesh>

        {/* Fire window (front face) */}
        <mesh position={[0, 0.32 * scale, 0.201 * scale]}>
          <planeGeometry args={[0.3 * scale, 0.28 * scale]} />
          <meshStandardMaterial color="#ff6622" emissive="#ff4400" emissiveIntensity={0.6} transparent opacity={0.85} />
        </mesh>

        {/* Fire window frame */}
        <mesh position={[0, 0.32 * scale, 0.202 * scale]}>
          <boxGeometry args={[0.34 * scale, 0.32 * scale, 0.01]} />
          <meshStandardMaterial color="#333333" roughness={0.5} metalness={0.5} />
        </mesh>
        {/* Cut out the inner frame by overlaying the glass again */}
        <mesh position={[0, 0.32 * scale, 0.203 * scale]}>
          <planeGeometry args={[0.28 * scale, 0.26 * scale]} />
          <meshPhysicalMaterial color="#331100" transparent opacity={0.3} roughness={0.1} />
        </mesh>

        {/* Legs (4 short cylinders) */}
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dz], i) => (
          <mesh key={i} position={[dx * 0.2 * scale, 0.025 * scale, dz * 0.15 * scale]}>
            <cylinderGeometry args={[0.025 * scale, 0.03 * scale, 0.05 * scale, 8]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.3} />
          </mesh>
        ))}

        {/* Handle on front */}
        <mesh position={[0, 0.48 * scale, 0.22 * scale]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012 * scale, 0.012 * scale, 0.06 * scale, 8]} />
          <meshStandardMaterial color="#444444" roughness={0.4} metalness={0.6} />
        </mesh>

        {/* Chimney pipe - from stove top to dome exit */}
        <mesh position={[0, chimneyBaseY + chimneyHeight / 2, 0]}>
          <cylinderGeometry args={[0.06 * scale, 0.06 * scale, chimneyHeight, 12]} />
          <meshStandardMaterial color="#222222" roughness={0.7} metalness={0.3} />
        </mesh>

        {/* Fire glow light */}
        <pointLight position={[0, 0.35 * scale, 0.3 * scale]} color="#ff5500" intensity={0.8} distance={2.5 * scale} decay={2} />

        {/* Exterior chimney + rain cap (visible from outside through dome) */}
        {/* Flashing ring where pipe meets dome */}
        <mesh position={[0, domeYAtChimney, 0]}>
          <cylinderGeometry args={[0.1 * scale, 0.1 * scale, 0.03, 16]} />
          <meshStandardMaterial color="#444444" roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Rain cap */}
        <mesh position={[0, chimneyTopY + 0.08 + 0.03, 0]}>
          <cylinderGeometry args={[0.01, 0.12 * scale, 0.06, 12]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.4} />
        </mesh>
        {/* Cap support posts (3) */}
        {[0, 1, 2].map((i) => {
          const angle = (i / 3) * Math.PI * 2;
          const px = Math.cos(angle) * 0.055 * scale;
          const pz = Math.sin(angle) * 0.055 * scale;
          return (
            <mesh key={i} position={[px, chimneyTopY + 0.04, pz]}>
              <cylinderGeometry args={[0.006 * scale, 0.006 * scale, 0.08, 6]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.4} />
            </mesh>
          );
        })}
      </group>
    );
  }
}

// ─── Solar Exhaust Fan ─────────────────────────────────────────────

function FanBlades({ bladeRadius, z }: { bladeRadius: number; z: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (groupRef.current) groupRef.current.rotation.z += delta * 6;
  });

  const bladeGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(bladeRadius * 0.15, bladeRadius * 0.3);
    shape.lineTo(bladeRadius * 0.06, bladeRadius * 0.95);
    shape.lineTo(-bladeRadius * 0.04, bladeRadius * 0.9);
    shape.lineTo(-bladeRadius * 0.08, bladeRadius * 0.25);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.005, bevelEnabled: false });
    return geo;
  }, [bladeRadius]);

  return (
    <group ref={groupRef} position={[0, 0, z]}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} geometry={bladeGeo} rotation={[0, 0, (i / 5) * Math.PI * 2]}>
          <meshStandardMaterial color="#f0f0f0" roughness={0.3} metalness={0.05} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function SolarExhaustFan({ radius, isInterior }: { radius: number; isInterior: boolean }) {
  const scale = radius / 3.5;

  const mountAngle = Math.PI * 0.05;
  const mountHeight = radius * 0.82;
  const mountXZ = Math.sqrt(Math.max(0, radius * radius - mountHeight * mountHeight));
  const mountX = Math.cos(mountAngle) * mountXZ;
  const mountZ = Math.sin(mountAngle) * mountXZ;

  const nx = mountX / radius;
  const ny = mountHeight / radius;
  const nz = mountZ / radius;

  const lookDir = new THREE.Vector3(nx, ny, nz);
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion();
  const mat4 = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), lookDir, up);
  quat.setFromRotationMatrix(mat4);

  const fanR = 0.15 * scale;
  const housingR = fanR + 0.03 * scale;
  const depth = 0.06 * scale;

  if (isInterior) {
    return (
      <group position={[mountX, mountHeight, mountZ]} quaternion={quat}>
        {/* Circular white housing */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[housingR, housingR, depth, 32]} />
          <meshStandardMaterial color="#f5f5f5" roughness={0.3} metalness={0.05} />
        </mesh>

        {/* Front rim */}
        <mesh position={[0, 0, depth / 2 + 0.002]}>
          <ringGeometry args={[housingR - 0.008 * scale, housingR, 32]} />
          <meshStandardMaterial color="#e0e0e0" roughness={0.3} metalness={0.1} />
        </mesh>

        {/* Spinning blades */}
        <FanBlades bladeRadius={fanR * 0.85} z={depth / 2 + 0.005} />

        {/* Center hub */}
        <mesh position={[0, 0, depth / 2 + 0.008]}>
          <circleGeometry args={[fanR * 0.15, 16]} />
          <meshStandardMaterial color="#cccccc" roughness={0.3} metalness={0.2} />
        </mesh>

        {/* Grille (protective front) */}
        {[-1, 0, 1].map((i) => (
          <mesh key={`gh${i}`} position={[0, i * housingR * 0.55, depth / 2 + 0.01]}>
            <boxGeometry args={[housingR * 1.8, 0.004 * scale, 0.002]} />
            <meshStandardMaterial color="#dddddd" roughness={0.3} metalness={0.1} />
          </mesh>
        ))}
      </group>
    );
  }

  // Exterior: same fan visible from outside
  const outOffset = 0.04 * scale;
  const extX = mountX + nx * outOffset;
  const extY = mountHeight + ny * outOffset;
  const extZ = mountZ + nz * outOffset;

  return (
    <group position={[extX, extY, extZ]} quaternion={quat}>
      {/* Housing */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[housingR, housingR, depth, 32]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.35} metalness={0.05} />
      </mesh>

      {/* Spinning blades */}
      <FanBlades bladeRadius={fanR * 0.85} z={depth / 2 + 0.005} />

      {/* Center hub */}
      <mesh position={[0, 0, depth / 2 + 0.008]}>
        <circleGeometry args={[fanR * 0.15, 16]} />
        <meshStandardMaterial color="#cccccc" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Protective grille */}
      {[-1, 0, 1].map((i) => (
        <mesh key={`egh${i}`} position={[0, i * housingR * 0.55, depth / 2 + 0.01]}>
          <boxGeometry args={[housingR * 1.8, 0.004 * scale, 0.002]} />
          <meshStandardMaterial color="#dddddd" roughness={0.3} metalness={0.1} />
        </mesh>
      ))}

      {/* Mounting bracket */}
      <mesh position={[0, 0, -depth / 2 - 0.01 * scale]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[housingR * 0.5, housingR * 0.5, 0.02 * scale, 12]} />
        <meshStandardMaterial color="#888888" roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}

// ─── Rail Curtain Track ────────────────────────────────────────────

function CurtainTrack({ radius, windowType }: { radius: number; windowType: string }) {
  if (windowType === "none") return null;

  const trackR = radius * 0.55; // well inside dome wall
  const railR = 0.018; // rail tube radius

  // Panoramic is on the left side (negative X, positive ang in atan2(-x,z))
  // In cos/sin system: left side = angle ~PI/2 to PI
  let arcSpan: number;
  let trackHeight: number;
  let centerAngle: number;

  if (windowType === "full") {
    arcSpan = Math.PI * 1.4;
    trackHeight = radius * 0.85;
    centerAngle = Math.PI;
  } else if (windowType === "half") {
    arcSpan = Math.PI * 0.65;
    trackHeight = radius * 0.75;
    centerAngle = Math.PI * 0.9;
  } else {
    // third
    arcSpan = Math.PI * 0.45;
    trackHeight = radius * 0.78;
    centerAngle = Math.PI * 0.75;
  }

  const startAngle = centerAngle - arcSpan / 2;
  const segments = 48;

  // Build rail geometry as merged cylinders along arc
  const railGeo = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < segments; i++) {
      const a1 = startAngle + (i / segments) * arcSpan;
      const a2 = startAngle + ((i + 1) / segments) * arcSpan;
      const x1 = Math.cos(a1) * trackR;
      const z1 = Math.sin(a1) * trackR;
      const x2 = Math.cos(a2) * trackR;
      const z2 = Math.sin(a2) * trackR;

      const start = new THREE.Vector3(x1, trackHeight, z1);
      const end = new THREE.Vector3(x2, trackHeight, z2);
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(end, start);
      const len = dir.length();

      const geo = new THREE.CylinderGeometry(railR, railR, len, 6);
      const q = new THREE.Quaternion();
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      geo.applyQuaternion(q);
      geo.translate(mid.x, mid.y, mid.z);
      geos.push(geo);
    }

    // Merge
    let total = 0;
    geos.forEach(g => { total += g.attributes.position.count; });
    const pos = new Float32Array(total * 3);
    const nor = new Float32Array(total * 3);
    const idx: number[] = [];
    let off = 0;
    geos.forEach(g => {
      const p = g.attributes.position;
      const n = g.attributes.normal;
      for (let j = 0; j < p.count; j++) {
        pos[(off + j) * 3] = p.getX(j);
        pos[(off + j) * 3 + 1] = p.getY(j);
        pos[(off + j) * 3 + 2] = p.getZ(j);
        if (n) { nor[(off + j) * 3] = n.getX(j); nor[(off + j) * 3 + 1] = n.getY(j); nor[(off + j) * 3 + 2] = n.getZ(j); }
      }
      const ix = g.index;
      if (ix) { for (let j = 0; j < ix.count; j++) idx.push(ix.getX(j) + off); }
      off += p.count;
    });
    const merged = new THREE.BufferGeometry();
    merged.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    merged.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    merged.setIndex(idx);
    return merged;
  }, [trackR, trackHeight, startAngle, arcSpan]);

  // Ring positions along rail
  const ringPositions = useMemo(() => {
    const rings: { x: number; z: number; angle: number }[] = [];
    const count = windowType === "full" ? 30 : windowType === "half" ? 16 : 10;
    for (let i = 0; i <= count; i++) {
      const a = startAngle + (i / count) * arcSpan;
      rings.push({
        x: Math.cos(a) * trackR,
        z: Math.sin(a) * trackR,
        angle: a,
      });
    }
    return rings;
  }, [startAngle, arcSpan, trackR, windowType]);

  return (
    <group>
      {/* Metal rail */}
      <mesh geometry={railGeo}>
        <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Rail end caps */}
      {[startAngle, startAngle + arcSpan].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * trackR, trackHeight, Math.sin(a) * trackR]}>
          <sphereGeometry args={[railR * 1.5, 8, 8]} />
          <meshStandardMaterial color="#666666" roughness={0.3} metalness={0.5} />
        </mesh>
      ))}

      {/* Curtain rings */}
      {ringPositions.map((p, i) => (
        <mesh key={`ring${i}`} position={[p.x, trackHeight, p.z]} rotation={[0, p.angle, 0]}>
          <torusGeometry args={[railR * 2.5, railR * 0.6, 6, 12]} />
          <meshStandardMaterial color="#777777" roughness={0.3} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}


// ─── Main Scene (exported for use in page) ──────────────────────────

export function DomeScene({ config, selectedKey }: { config: DomeConfig; selectedKey: string }) {
  const sizeData = DOME_SIZES[config.size];
  const isDouble = config.size === "12M";
  const dome = useMemo(() => generateDome(sizeData.radius, 3, isDouble), [sizeData.radius, isDouble]);

  const isInterior = config.view === "interior";


  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={isInterior && config.window !== "none" ? 0.4 : 1.0} color={isInterior && config.window !== "none" ? "#ffe8cc" : "#ffffff"} />
      <directionalLight position={[10, 12, 8]} intensity={isInterior && config.window !== "none" ? 0.6 : 1.5} />
      <directionalLight position={[-8, 8, -6]} intensity={0.8} />
      <directionalLight position={[0, 10, -10]} intensity={0.6} />
      <directionalLight position={[0, 5, 10]} intensity={0.5} />
      <hemisphereLight args={[isInterior && config.window !== "none" ? "#ffddaa" : "#ffffff", "#e0d8c8", 0.6]} />

      {/* Sunset light through panoramic windows */}
      {config.window !== "none" && (
        <>
          <directionalLight position={[-6, 3, 4]} intensity={1.8} color="#ff9944" />
          <directionalLight position={[-4, 1, 6]} intensity={0.8} color="#ffaa55" />
          <pointLight position={[-dome.radius * 0.3, dome.radius * 0.2, dome.radius * 0.3]} intensity={1.2} color="#ff8833" distance={dome.radius * 3} decay={2} />
        </>
      )}

      <group>
        <DomePanels
          panels={dome.panels}
          color={config.exteriorColor}
          innerColor={config.interiorColor}
          windowType={config.window}
          radius={dome.radius}
          selectedKey={selectedKey}
          isDouble={isDouble}
          isInterior={isInterior}
          extras={config.extras}
        />
        {isInterior && <DomeStruts struts={dome.struts} radius={dome.radius} isDouble={isDouble} />}
        {isInterior && <DomeHubs struts={dome.struts} radius={dome.radius} isDouble={isDouble} />}
        <group position={[0.3, 0, 0]}>
          <Door radius={dome.radius} canvasColor={config.exteriorColor} isInterior={isInterior} isDouble={isDouble} windowType={config.window} />
        </group>
        {config.heating.has("stove") && (
          <WoodStove radius={dome.radius} isInterior={isInterior} />
        )}
        {config.heating.has("ac") && (
          <ACSplit radius={dome.radius} isInterior={isInterior} />
        )}
        {config.extras.has("fan") && (
          <SolarExhaustFan radius={dome.radius} isInterior={isInterior} />
        )}
        {config.extras.has("curtains") && config.window !== "none" && (
          <CurtainTrack radius={dome.radius} windowType={config.window} />
        )}
      </group>

      {isInterior ? (
        <InteriorFloor radius={dome.groundRadius} />
      ) : (
        <WoodDeck radius={dome.groundRadius} />
      )}
      <Baseboard groundRadius={dome.groundRadius} sphereRadius={dome.radius} windowType={config.window} panels={dome.panels} radius={dome.radius} isDouble={isDouble} />

      <OrbitControls
        key={config.view}
        makeDefault
        enablePan={false}
        enableZoom={!isInterior}
        minDistance={isInterior ? 0.01 : sizeData.radius + 1}
        maxDistance={isInterior ? 0.1 : sizeData.radius * 4}
        minPolarAngle={isInterior ? Math.PI / 4 : 0.1}
        maxPolarAngle={isInterior ? Math.PI / 1.5 : Math.PI / 2.05}
        target={[0, isInterior ? sizeData.height * 0.35 : sizeData.height * 0.35, 0]}
        enableDamping={false}
      />
    </>
  );
}

// Need to import OrbitControls here too
import { OrbitControls, Html } from "@react-three/drei";

// ─── Clickable Panel (for selection mode) ───────────────────────────

function ClickablePanel({ vertices, index, selected, onSelect }: {
  vertices: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  index: number;
  selected: boolean;
  onSelect: (idx: number) => void;
}) {
  const geo = useMemo(() => {
    const [a, b, c] = vertices;
    // Push vertices slightly outward so raycaster hits these first
    const offset = 0.05;
    const oa = a.clone().add(a.clone().normalize().multiplyScalar(offset));
    const ob = b.clone().add(b.clone().normalize().multiplyScalar(offset));
    const oc = c.clone().add(c.clone().normalize().multiplyScalar(offset));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([
      oa.x, oa.y, oa.z, ob.x, ob.y, ob.z, oc.x, oc.y, oc.z
    ], 3));
    g.computeVertexNormals();
    return g;
  }, [vertices]);

  return (
    <mesh
      geometry={geo}
      onClick={(e) => { e.stopPropagation(); onSelect(index); }}
    >
      <meshStandardMaterial
        color={selected ? "#0055ff" : "#ffffff"}
        opacity={selected ? 0.85 : 0.01}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
