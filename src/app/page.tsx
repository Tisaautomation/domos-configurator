"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { DomeConfig, DomeSize, WindowType } from "@/components/GeodesicDome";
import {
  DOME_SIZES,
  EXTERIOR_COLORS,
  INTERIOR_COLORS,
  WINDOW_OPTIONS,
  DOOR_OPTIONS,
  FOUNDATION_OPTIONS,
  INSULATION_OPTIONS,
  HEATING_OPTIONS,
  VENTILATION_OPTIONS,
  EXTRAS_OPTIONS,
  DEFAULT_CONFIG,
} from "@/components/GeodesicDome";

const DomeViewer = dynamic(() => import("@/components/DomeViewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-[#1a2a1a] flex items-center justify-center">
      <div className="text-white/40 text-sm tracking-widest uppercase">Loading 3D Viewer...</div>
    </div>
  ),
});

// ─── Section ────────────────────────────────────────────────────────

function Section({ title, children, open, onToggle }: {
  title: string; children: React.ReactNode; open: boolean; onToggle: () => void;
}) {
  return (
    <div className="border-b border-white/10">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-white/5 transition-colors">
        <span className="text-sm font-medium text-white/90 tracking-wide uppercase">{title}</span>
        <svg className={`w-4 h-4 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

// ─── Color Swatch ───────────────────────────────────────────────────

function ColorSwatch({ hex, label, selected, onClick }: {
  hex: string; label: string; selected: boolean; onClick: () => void;
}) {
  const isTransparent = hex === "transparent";
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 cursor-pointer group" title={label}>
      <div
        className={`w-10 h-10 rounded-full border-2 transition-all ${
          selected ? "border-white scale-110 shadow-lg shadow-white/20" : "border-white/20 group-hover:border-white/50"
        } ${isTransparent ? "bg-gradient-to-br from-white/30 to-white/5" : ""}`}
        style={isTransparent ? {} : { backgroundColor: hex }}
      />
      <span className={`text-[10px] leading-tight text-center ${selected ? "text-white" : "text-white/50"}`}>{label}</span>
    </button>
  );
}

// ─── Option Button ──────────────────────────────────────────────────

function OptionBtn({ label, selected, onClick, desc }: {
  label: string; selected: boolean; onClick: () => void; desc?: string;
}) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 rounded-lg border transition-all cursor-pointer ${
      selected ? "border-white/40 bg-white/10 text-white" : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
    }`}>
      <div className="text-sm font-medium">{label}</div>
      {desc && <div className={`text-xs mt-0.5 ${selected ? "text-white/60" : "text-white/40"}`}>{desc}</div>}
    </button>
  );
}

// ─── Toggle Chip (for multi-select: heating, ventilation, extras) ───

function ToggleChip({ label, active, onClick, desc }: {
  label: string; active: boolean; onClick: () => void; desc?: string;
}) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 rounded-lg border transition-all cursor-pointer ${
      active ? "border-green-500/50 bg-green-900/20 text-white" : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
    }`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
          active ? "bg-green-500 border-green-500" : "border-white/30"
        }`}>
          {active && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      {desc && <div className={`text-xs mt-0.5 ${active ? "text-green-300/60" : "text-white/40"}`}>{desc}</div>}
    </button>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string>("");
  const [config, setConfig] = useState<DomeConfig>(DEFAULT_CONFIG);
  const [selectedKey] = useState("");

  const closeMobile = useCallback(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, []);

  const updateAndClose = useCallback((partial: Partial<DomeConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
    closeMobile();
  }, [closeMobile]);

  const toggleSet = useCallback((field: "heating" | "ventilation" | "extras", id: string) => {
    setConfig((prev) => {
      const next = new Set(prev[field]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      const updated = { ...prev, [field]: next };
      // Auto-switch to interior when LED is turned on
      if (field === "extras" && id === "led" && next.has("led")) {
        updated.view = "interior";
      }
      return updated;
    });
    closeMobile();
  }, [closeMobile]);

  const toggleSection = (s: string) => setOpenSection((prev) => (prev === s ? "" : s));

  const sizeData = DOME_SIZES[config.size];

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#1a2a1a]">
      {/* 3D Viewer — offset for sidebar on desktop */}
      <div className="absolute inset-0 lg:left-[300px]">
        <DomeViewer config={config} selectedKey={selectedKey} />
      </div>

      {/* Hamburger — mobile only */}
      <button onClick={() => setSidebarOpen(true)}
        className="lg:hidden absolute top-4 left-4 z-30 w-11 h-11 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 cursor-pointer hover:bg-black/60 transition-colors"
        aria-label="Open configurator">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* View toggle */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex bg-black/40 backdrop-blur-md rounded-full border border-white/10 overflow-hidden">
        {(["exterior", "interior"] as const).map((v) => (
          <button key={v} onClick={() => setConfig((p) => ({ ...p, view: v }))}
            className={`px-5 py-2.5 text-xs font-medium tracking-wide uppercase cursor-pointer transition-colors ${
              config.view === v ? "bg-white/20 text-white" : "text-white/50 hover:text-white/70"
            }`}>{v}</button>
        ))}
      </div>

      {/* Size badge */}
      <div className="absolute top-14 sm:top-4 right-2 sm:right-4 z-20 bg-black/40 backdrop-blur-md rounded-full border border-white/10 px-3 py-1.5">
        <div className="text-white text-[10px] sm:text-xs font-medium">{sizeData.label}</div>
        <div className="text-white/40 text-[8px] sm:text-[10px]">{sizeData.desc}</div>
      </div>

      {/* Overlay — mobile only */}
      {sidebarOpen && <div className="lg:hidden absolute inset-0 z-40 bg-black/30" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar — always visible on desktop, slide-in on mobile */}
      <div className={`absolute top-0 left-0 bottom-0 z-50 w-[300px] max-w-[85vw] bg-[#1a2820]/95 backdrop-blur-xl border-r border-white/10 overflow-y-auto lg:translate-x-0 transition-transform duration-300 ease-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white text-sm font-semibold tracking-wide uppercase">Configure Your Dome</h2>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer">
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 01 · Size */}
        <Section title="01 · Size" open={openSection === "size"} onToggle={() => toggleSection("size")}>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(DOME_SIZES) as DomeSize[]).map((key) => (
              <OptionBtn key={key} label={DOME_SIZES[key].label} desc={DOME_SIZES[key].desc}
                selected={config.size === key} onClick={() => updateAndClose({ size: key })} />
            ))}
          </div>
        </Section>

        {/* 02 · Outer Cover */}
        <Section title="02 · Outer Cover" open={openSection === "outer"} onToggle={() => toggleSection("outer")}>
          <div className="grid grid-cols-3 gap-3">
            {EXTERIOR_COLORS.map((c) => (
              <ColorSwatch key={c.id} hex={c.swatchHex} label={c.label} selected={config.exteriorColor === c.hex}
                onClick={() => updateAndClose({ exteriorColor: c.hex })} />
            ))}
          </div>
        </Section>

        {/* 03 · Inner Canvas */}
        <Section title="03 · Inner Canvas" open={openSection === "inner"} onToggle={() => toggleSection("inner")}>
          <div className="grid grid-cols-4 gap-3">
            {INTERIOR_COLORS.map((c) => (
              <ColorSwatch key={c.id} hex={c.hex} label={c.label} selected={config.interiorColor === c.hex}
                onClick={() => updateAndClose({ interiorColor: c.hex })} />
            ))}
          </div>
        </Section>

        {/* 04 · Window */}
        <Section title="04 · Panoramic Window" open={openSection === "window"} onToggle={() => toggleSection("window")}>
          <div className="flex flex-col gap-2">
            {WINDOW_OPTIONS.map((opt) => (
              <OptionBtn key={opt.id} label={opt.label} desc={opt.desc}
                selected={config.window === opt.id} onClick={() => updateAndClose({ window: opt.id as WindowType })} />
            ))}
          </div>
        </Section>

        {/* 05 · Insulation */}
        <Section title="06 · Insulation" open={openSection === "insulation"} onToggle={() => toggleSection("insulation")}>
          <div className="flex flex-col gap-2">
            {INSULATION_OPTIONS.map((opt) => (
              <OptionBtn key={opt.id} label={opt.label} desc={opt.desc}
                selected={config.insulation === opt.id} onClick={() => updateAndClose({ insulation: opt.id })} />
            ))}
          </div>
        </Section>

        {/* 07 · Heating */}
        <Section title="07 · Heating" open={openSection === "heating"} onToggle={() => toggleSection("heating")}>
          <div className="flex flex-col gap-2">
            {HEATING_OPTIONS.map((opt) => (
              <ToggleChip key={opt.id} label={opt.label} desc={opt.desc}
                active={config.heating.has(opt.id)} onClick={() => toggleSet("heating", opt.id)} />
            ))}
          </div>
        </Section>

        {/* 08 · Extras */}
        <Section title="09 · Extras" open={openSection === "extras"} onToggle={() => toggleSection("extras")}>
          <div className="flex flex-col gap-2">
            {EXTRAS_OPTIONS.map((opt) => (
              <ToggleChip key={opt.id} label={opt.label} desc={opt.desc}
                active={config.extras.has(opt.id)} onClick={() => toggleSet("extras", opt.id)} />
            ))}
          </div>
        </Section>

        {/* Quote button */}
        <div className="px-5 py-6">
          <a href="mailto:info@thedomeshop.com?subject=Dome%20Quote%20Request" className="block w-full py-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-medium tracking-wide uppercase cursor-pointer hover:bg-white/20 transition-colors text-center">
            Request Quote
          </a>
        </div>
      </div>
    </main>
  );
}
