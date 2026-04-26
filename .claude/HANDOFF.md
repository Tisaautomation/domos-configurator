# Domos Configurator — Handoff de rediseño

> **Para Claude en sesión nueva:** lee este archivo COMPLETO antes de tocar nada.
> El usuario está en el medio de un rediseño grande. NO escribas código hasta que él confirme la fase. Hay fotos pendientes que él va a pegar.

---

## Contexto del proyecto

- **Stack:** Next.js 16.2.2 (App Router, breaking changes — leer `node_modules/next/dist/docs/` antes de escribir), React 19.2.4, TypeScript 5, Tailwind v4, Three.js 0.183 + `@react-three/fiber` + `@react-three/drei`, shadcn/ui, Base UI, Framer Motion.
- **Repo:** `tisaautomation/domos-configurator`
- **Branch de trabajo:** `claude/review-domos-data-U2QOJ` (NO cambiar sin permiso explícito)
- **Deploy:** https://domos-configurator.vercel.app/
- **Referencia visual objetivo:** Fdomes — https://3d.fdomes.com/
- **Restricción AGENTS.md:** Next 16 tiene breaking changes vs entrenamiento. Leer docs locales antes de escribir.

---

## Resumen de lo pedido por el dueño

Rediseño visual + funcional para acercarse a Fdomes. Agrupado por sección de la UI:

### General
- **A.** Cielo gris grafito (no atardecer verde-naranja). Luz blanca neutra (no `#ff9955`).
- **B.** Puerta con marco PVC/aluminio blanco + 2 vidrios horizontales + manija negra (NO vidrio total como ahora). Bisagras visibles abajo. Vidrio translúcido oscuro.
- Vista unificada interior/exterior si es viable (opcional, alto costo de refactor).

### Nueva sección "Framework" (no existe hoy)
- **C.** Toggle de material de struts/hubs:
  - `powder coat white` → blanco mate brillante
  - `raw galvanized metal` → gris medio metálico
- **D.** Tubos más finos: 25 mm para domos 4–7 M, 32 mm para 8–12 M (hoy son 80 mm = `cylinderGeometry args=[0.04,...]`).
- **E.** Arreglar el pentágono mal-formado del apex visto desde adentro mirando arriba. Hoy son 5 triángulos grandes + 10 de relleno (`generateDome` ~líneas 268–280); aplicar `subdivideTriangle()` igual que la zona de la puerta.

### 01 Size
- La puerta debe achicarse proporcionalmente cuando el domo crece (hoy `scale = radius / 3.5` lineal — pasar a sub-lineal).

### 02 Outer cover
- El cover exterior NO debe cambiar de color cuando el usuario cambia a vista interior.

### 03 Inner canvas → renombrar a **"Insulation colours"**
- **H.** El liner debe cubrir los struts (hoy quedan visibles desde adentro).
- Patrón rómbico acolchado (foto pendiente).

### 04 Panoramic window
- **F.** Efecto vinilo transparente (no opaco).
- **G.** Remover la línea negra del zócalo (`Baseboard` con material `#111111`).
- Renombrar opciones:
  - "1/3 panoramic" → "1/3 panoramic standard"
  - "1/2 panoramic" → "1/3 panoramic custom high" *(probable typo del dueño — confirmar con usuario)*
  - "full panoramic" → "Full transparent"

### 07 Heating
- **REMOVER toda la sección.** Eliminar de UI (`page.tsx`) y del `DomeScene` el `WoodStove` (pero conservar el componente porque se reutiliza para chimenea — ver L).

### 09 Extras
- **I.** Skylight pentagonal más chico.
- **J.** Agregar 3 ventanas con velcro.
- Ventana de aluminio real (hoy es un agujero).
- **K.** Rediseñar ventilador solar (foto pendiente).
- **L.** Opción "salida para chimenea" (reusar `WoodStove` con flag de chimenea sola).

---

## Fotos de referencia ya recibidas (4)

1. **Powder coat white vs raw galvanized metal** — close-up de struts, define los 2 materiales del Framework (C).
2. **"Como se ve" vs "como se debería ver"** — confirma puerta destino: marco blanco PVC, 2 vidrios horizontales con travesaño, manija negra derecha, bisagras visibles. Confirma G (línea negra abajo) e H (liner cubre struts).
3. **Top + interior con flecha** — confirma pentágono apex mal-formado (E).
4. **Domo gris completo target** — define la estética global: fondo grafito, cover gris liso, skylights redondas chicas a los costados, base de madera limpia, sin halo verde.

## Fotos pendientes (el usuario va a pegar)

- Patrón rombos acolchado del liner (H).
- Diseño nuevo del ventilador solar (K).
- Posibles capturas adicionales que mencionó ("hay más fotos, andá a verlas").

## Otro pendiente

- `Configurador 3D.zip` que el dueño quería que se clone exacto. NO se pudo subir en sesión anterior (problema de upload del lado del usuario). Preguntar si lo va a subir ahora o si seguimos solo con fotos + Fdomes como referencia.

---

## Mapa de archivos y líneas (de análisis previo, **verificar antes de editar**)

### `src/components/DomeViewer.tsx` (109 líneas)
- `SunsetSky` líneas 32–67 → reemplazar gradient por gris grafito uniforme.
- `GrassGround` líneas 69–76 → quitar o cambiar a gris neutro.
- Luz cálida línea 102: `directionalLight color="#ff9955" intensity=0.6` → blanca neutra.

### `src/components/GeodesicDome.tsx` (1937 líneas)
- `DOME_SIZES`, `WINDOW_OPTIONS`, `DOOR_OPTIONS` (parte alta del archivo).
- `generateDome(radius, detail, isDouble)` líneas ~268–280: apex cap con 5 triángulos grandes + 10 fill → subdividir.
- `subdivideTriangle()` ya existe (usado para zona de puerta) → reusar para cap.
- `PANORAMIC_IDS` líneas ~367–371: índices hardcodeados de paneles. **Se rompen cuando se subdivide el cap.** Recalcular después.
- `DomeStruts` línea 678: `cylinderGeometry args=[0.04, 0.04, length, 6, 1]` (80 mm). Reducir a 25 mm / 32 mm según `DOME_SIZES`.
- `DomeStruts` línea 690: `meshStandardMaterial color="#ffffff"` hardcodeado. Reemplazar por material configurable según `framework` (powder/galvanized).
- `DomeHubs` línea 705: `sphereGeometry args=[0.06, 8, 8]`. Achicar proporcionalmente.
- `Baseboard` línea 983: `meshStandardMaterial color="#111111"` (línea negra del zócalo) → remover/blanquear (issue G).
- `getDoorDims` líneas 1028–1034: `scale = radius / 3.5` lineal → sub-lineal (issue 01 Size).
- `Door` líneas 1180–1220: `meshPhysicalMaterial transmission=0.9` plano → reemplazar por componente con marco + 2 paneles vidrio + manija (issue B).
- `DomeScene` líneas 1814–1895: luces (`directionalLight` 1.5, `hemisphereLight`, naranjas en 1834–1840), conditional `isInterior` para struts/hubs.
- `OrbitControls` líneas 1880–1892: distancias hardcodeadas interior/exterior.
- `WoodStove` líneas 1448–1545: reusar para chimenea exit (L).
- `SolarExhaustFan` líneas 1579–1675: rediseñar (K).
- Lógica de panel windows líneas 408–446 (definida por `center.y`/`center.x` trig).

### `src/app/page.tsx` (313 líneas)
- Secciones 01–09 con labels. Quitar 07 Heating. Renombrar 03 → "Insulation colours". Renombrar opciones de 04. Agregar nueva sección "Framework".

---

## Plan de ejecución por fases (orden por riesgo creciente)

| Fase | Contenido | Riesgo | Toca geometría |
|------|-----------|--------|----------------|
| **1** | UI: remover Heating, renames (03, 04). Cielo gris grafito. Luz blanca. Quitar línea negra zócalo (G). | Bajo | No |
| **2** | Nueva sección "Framework": toggle material + tubos finos (C, D). Hubs proporcionales. | Medio | Sí (materiales/escala) |
| **3** | Fix apex pentagon (E): subdividir cap + **recalcular `PANORAMIC_IDS`**. | Alto | Sí (topología) |
| **4** | Puerta nueva: componente con marco PVC + 2 vidrios + manija (B). Escalado sub-lineal (01 Size). | Medio | Sí (mesh nueva) |
| **5** | Inner canvas → "Insulation colours": liner cubre struts + patrón rombos (H). | Medio | Sí (offset radial) |
| **6** | Panoramic window: vinilo transparente (F), renames. | Bajo | No |
| **7** | Extras: skylight chico (I), 3 velcro windows (J), aluminum window real, solar fan rediseño (K), chimenea (L). | Medio-Alto | Sí (multi-mesh) |

**Opcional / discutir:** vista unificada interior/exterior. Implica refactor extenso de `isInterior` en muchos componentes — solo si el dueño insiste.

---

## Riesgos técnicos identificados

1. **`PANORAMIC_IDS` se rompe** cuando se subdivide el cap (Fase 3). Hay que regenerar los índices después de la subdivisión, antes de ejecutar lógica de panoramic window.
2. **Z-fighting liner vs struts** en domos chicos (5M) si el offset radial del liner es muy pequeño.
3. **Costo de subdivisión** en el apex: agregar `useMemo` para evitar recomputar en cada render.
4. **Backwards-compat de configs guardadas:** si hay state persistido que referencia "1/2 panoramic" (clave vieja), considerar mapeo al renombrar.
5. **`framework` agregado al `DomeConfig` type:** chequear que no rompa serialización del Quote por mailto.

---

## Preguntas abiertas para el usuario

1. ✅ Puerta — RESUELTA por foto 2 (PVC blanco + 2 vidrios + manija negra).
2. ⏳ ¿El cover exterior debe quedar invisible en vista interior, o transparente, o simplemente no cambia color?
3. ⏳ "1/3 panoramic custom high" — ¿typo de "1/2" o nombre comercial real?
4. ⏳ ¿Subís el `Configurador 3D.zip` para clonarlo exacto, o avanzamos solo con fotos + Fdomes?
5. ⏳ ¿"Vista unificada" del comentario General es prioridad o nice-to-have?

---

## Reglas operativas para esta sesión

- **NO escribir código hasta que el usuario confirme fase y queden resueltas las preguntas abiertas relevantes a esa fase.**
- Trabajar siempre en branch `claude/review-domos-data-U2QOJ`.
- Después de cada fase: commit + push a esa branch + abrir/actualizar PR draft.
- Idioma: usuario habla español. Código en inglés. Commits en inglés.
- Antes de tocar `GeodesicDome.tsx`, releer el archivo completo (es grande, 1937 líneas) — las líneas listadas arriba son de análisis previo y pueden haberse desplazado.
- Si el usuario pega más fotos, esperar a verlas antes de actualizar plan.

---

## Próximo paso al abrir sesión nueva

1. Leer este archivo.
2. Saludar al usuario y confirmar que tenés el contexto.
3. Pedirle que pegue las fotos pendientes (rombos del liner, solar fan, las "más fotos" que mencionó).
4. Confirmar respuestas a las preguntas abiertas 2–5.
5. Recién entonces proponer arrancar **Fase 1** (la de menor riesgo, sin tocar geometría).
