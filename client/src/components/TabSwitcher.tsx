import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Target,
  TrendingUp,
  BrainCircuit,
  Briefcase,
  GitCompare,
  Layers,
  Keyboard,
} from "lucide-react";
import type { AnalyzeResponse, Profile } from "../types";

export type TabId = "overview" | "chart" | "agents" | "portfolio" | "audit";

export interface TabConfig {
  id: TabId;
  label: string;
  shortLabel: string;
  subtitle: string;
  icon: typeof Target;
  shortcut: string;
  getBadge: (result?: AnalyzeResponse | null, profile?: Profile | null) => {
    text: string;
    tone: "green" | "rose" | "amber" | "sky" | "violet" | "slate";
  } | null;
}

export const TABS_CONFIG: TabConfig[] = [
  {
    id: "overview",
    label: "Overview & Decision",
    shortLabel: "Overview",
    subtitle: "Synthesis & Action",
    icon: Target,
    shortcut: "1",
    getBadge: (result) => {
      if (!result) return null;
      const code = result.synthesis.action.code;
      if (code === "DO_NOT_INCREASE") {
        return { text: "DO NOT ADD", tone: "rose" };
      }
      if (code === "CONSIDER_SMALL_STAGED_ADD") {
        return { text: "CONSIDER ADD", tone: "green" };
      }
      return { text: "WAIT / REVIEW", tone: "amber" };
    },
  },
  {
    id: "chart",
    label: "Interactive Chart",
    shortLabel: "Chart & Technicals",
    subtitle: "Candlesticks & Indicators",
    icon: TrendingUp,
    shortcut: "2",
    getBadge: (result) => {
      if (!result) return null;
      const chg = result.snapshot.changePct;
      return {
        text: `${chg >= 0 ? "+" : ""}${chg}%`,
        tone: chg >= 0 ? "green" : "rose",
      };
    },
  },
  {
    id: "agents",
    label: "Agent Intelligence",
    shortLabel: "Agents",
    subtitle: "Technical · Filing · News",
    icon: BrainCircuit,
    shortcut: "3",
    getBadge: (result) => {
      if (!result) return null;
      const activeCount = result.agents.filter((a) => a.signal !== "unavailable").length;
      return {
        text: `${activeCount}/3 Active`,
        tone: activeCount === 3 ? "sky" : "amber",
      };
    },
  },
  {
    id: "portfolio",
    label: "Portfolio & Risk",
    shortLabel: "Portfolio",
    subtitle: "Concentration & Limits",
    icon: Briefcase,
    shortcut: "4",
    getBadge: (_result, profile) => {
      if (!profile) return null;
      const shortName = profile.name.split(" ")[0] ?? "Profile";
      return {
        text: shortName,
        tone: "violet",
      };
    },
  },
  {
    id: "audit",
    label: "Compare & Audit",
    shortLabel: "Audit Trail",
    subtitle: "Persisted History & Diffs",
    icon: GitCompare,
    shortcut: "5",
    getBadge: (result) => {
      if (!result) return null;
      return {
        text: result.storage.mode === "supabase" ? "Supabase" : "Local DB",
        tone: "slate",
      };
    },
  },
];

interface TabSwitcherProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  result?: AnalyzeResponse | null;
  profile?: Profile | null;
}

export function TabSwitcher({
  activeTab,
  onTabChange,
  result,
  profile,
}: TabSwitcherProps) {
  const tabListRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener: 1-5 keys switch tabs directly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const keyIndex = ["1", "2", "3", "4", "5"].indexOf(e.key);
      if (keyIndex !== -1 && keyIndex < TABS_CONFIG.length) {
        e.preventDefault();
        onTabChange(TABS_CONFIG[keyIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onTabChange]);

  // Arrow key navigation within tablist
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextIndex = (index + 1) % TABS_CONFIG.length;
      onTabChange(TABS_CONFIG[nextIndex].id);
      focusTab(nextIndex);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIndex = (index - 1 + TABS_CONFIG.length) % TABS_CONFIG.length;
      onTabChange(TABS_CONFIG[prevIndex].id);
      focusTab(prevIndex);
    } else if (e.key === "Home") {
      e.preventDefault();
      onTabChange(TABS_CONFIG[0].id);
      focusTab(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onTabChange(TABS_CONFIG[TABS_CONFIG.length - 1].id);
      focusTab(TABS_CONFIG.length - 1);
    }
  };

  const focusTab = (index: number) => {
    const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[index]?.focus();
  };

  const activeConfig = TABS_CONFIG.find((t) => t.id === activeTab) ?? TABS_CONFIG[0];
  const ActiveIcon = activeConfig.icon;

  const toneBadgeClasses: Record<string, string> = {
    green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    sky: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    slate: "bg-zinc-800 text-zinc-300 border-zinc-700",
  };

  const activeToneBadgeClasses: Record<string, string> = {
    green: "bg-emerald-950/80 text-emerald-900 border-emerald-600/30",
    rose: "bg-rose-950/80 text-rose-900 border-rose-600/30",
    amber: "bg-amber-950/80 text-amber-900 border-amber-600/30",
    sky: "bg-sky-950/80 text-sky-900 border-sky-600/30",
    violet: "bg-violet-950/80 text-violet-900 border-violet-600/30",
    slate: "bg-zinc-200 text-zinc-900 border-zinc-300",
  };

  return (
    <div className="space-y-2">
      {/* Top Header & Visual Affordance Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            <span>Analysis Perspectives</span>
          </div>
          <span className="hidden text-zinc-600 sm:inline">·</span>
          <span className="hidden items-center gap-1 text-[11px] text-zinc-400 sm:inline-flex">
            <Keyboard className="h-3 w-3 text-zinc-400" />
            Click tab or press <kbd className="rounded border border-zinc-700 bg-zinc-800/80 px-1 py-0.5 font-mono text-[10px] text-zinc-300">1</kbd>–<kbd className="rounded border border-zinc-700 bg-zinc-800/80 px-1 py-0.5 font-mono text-[10px] text-zinc-300">5</kbd> to switch
          </span>
        </div>

        {/* Live Active View Indicator */}
        <div className="flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-950/90 px-2.5 py-1 text-[11px] font-medium text-zinc-300 shadow-inner">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-zinc-500">Active:</span>
          <div className="flex items-center gap-1 font-semibold text-zinc-100">
            <ActiveIcon className="h-3 w-3 text-cyan-400" />
            <span>{activeConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Switchable Segmented Control Rail */}
      <div
        ref={tabListRef}
        role="tablist"
        aria-label="Analysis Perspectives"
        className="relative grid grid-cols-2 gap-1.5 rounded-2xl border border-zinc-800/90 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-xl sm:grid-cols-3 lg:grid-cols-5 ring-1 ring-white/5"
      >
        {TABS_CONFIG.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          const badge = tab.getBadge(result, profile);

          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={`group relative flex cursor-pointer flex-col items-start justify-between rounded-xl p-3 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                isActive
                  ? "text-zinc-950 shadow-md"
                  : "border border-zinc-850 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/80 hover:text-zinc-100"
              }`}
            >
              {/* Smooth Animated Background Indicator for Active Tab */}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 rounded-xl bg-gradient-to-b from-white to-zinc-100 shadow-[0_4px_20px_rgba(255,255,255,0.18)] ring-1 ring-white"
                  transition={{
                    type: "spring",
                    stiffness: 450,
                    damping: 35,
                  }}
                />
              )}

              {/* Tab Header Row: Icon + Number Shortcut Key */}
              <div className="relative z-10 flex w-full items-center justify-between gap-1.5">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? "bg-zinc-900/10 text-zinc-900"
                      : "bg-zinc-800/80 text-zinc-400 group-hover:bg-zinc-700/80 group-hover:text-cyan-400"
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Dynamic context badge */}
                  {badge && (
                    <span
                      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                        isActive
                          ? activeToneBadgeClasses[badge.tone]
                          : toneBadgeClasses[badge.tone]
                      }`}
                    >
                      {badge.text}
                    </span>
                  )}

                  {/* Hotkey Tag */}
                  <span
                    title={`Press ${tab.shortcut} to switch`}
                    className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors ${
                      isActive
                        ? "border-zinc-900/20 bg-zinc-900/10 text-zinc-900 font-semibold"
                        : "border-zinc-700/60 bg-zinc-800 text-zinc-400 group-hover:border-zinc-500 group-hover:text-zinc-200"
                    }`}
                  >
                    {tab.shortcut}
                  </span>
                </div>
              </div>

              {/* Tab Label & Subtitle */}
              <div className="relative z-10 mt-2 w-full">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold tracking-tight transition-colors ${
                      isActive
                        ? "text-zinc-950"
                        : "text-zinc-200 group-hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </span>
                </div>
                <p
                  className={`mt-0.5 line-clamp-1 text-[10px] leading-tight transition-colors ${
                    isActive
                      ? "text-zinc-600 font-medium"
                      : "text-zinc-500 group-hover:text-zinc-400"
                  }`}
                >
                  {tab.subtitle}
                </p>
              </div>

              {/* Active Bottom Glow Accent Line */}
              {isActive && (
                <div className="relative z-10 mt-2 h-0.5 w-full rounded-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-80" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
