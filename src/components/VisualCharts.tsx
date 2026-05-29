/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

// ==========================================
// RADAR CHART (知識掌握度)
// ==========================================
interface RadarChartProps {
  skills: {
    algebra: number;
    geometry: number;
    numberSense: number;
    dataAnalysis: number;
    functions: number;
  };
}

export function RadarChart({ skills }: RadarChartProps) {
  const categories = [
    { key: 'algebra', label: '代數' },
    { key: 'geometry', label: '幾何' },
    { key: 'numberSense', label: '數與式' },
    { key: 'dataAnalysis', label: '數據分析' },
    { key: 'functions', label: '函數' },
  ];

  const size = 300;
  const center = size / 2;
  const radius = 90;

  // 5 angle indices (72 degrees each), starting at top (angle = -90 degrees or -pi/2)
  const getCoordinates = (index: number, value: number) => {
    const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Generate background pentagons at 20, 40, 60, 80, 100%
  const backgroundLevels = [20, 40, 60, 80, 100];
  const gridPolygons = backgroundLevels.map((level) => {
    const points = Array.from({ length: 5 }, (_, idx) => {
      const coord = getCoordinates(idx, level);
      return `${coord.x},${coord.y}`;
    }).join(' ');
    return points;
  });

  // Coordinates of the actual data polygon
  const actualPoints = categories.map((cat, idx) => {
    const val = skills[cat.key as keyof typeof skills] || 50;
    const coord = getCoordinates(idx, val);
    return `${coord.x},${coord.y}`;
  }).join(' ');

  // Standard label anchors
  const getLabelAnchor = (index: number) => {
    if (index === 0) return { textAnchor: 'middle', dy: '-8px' };
    if (index === 1 || index === 2) return { textAnchor: 'start', dx: '6px', dy: '4px' };
    return { textAnchor: 'end', dx: '-6px', dy: '4px' };
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-blue-50/50 bg-white/70 shadow-sm backdrop-blur-sm relative overflow-hidden" id="radar-chart-container">
      <div className="absolute top-2 left-3 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
        <span className="text-[11px] font-mono tracking-wider font-semibold text-slate-400 uppercase">Mastery Radar</span>
      </div>
      <svg width="100%" height="240" viewBox={`0 0 ${size} ${size}`} className="max-w-[250px] md:max-w-[2700px]">
        {/* Draw background radial grid lines */}
        {Array.from({ length: 5 }, (_, idx) => {
          const farCoord = getCoordinates(idx, 100);
          return (
            <line
              key={`line-${idx}`}
              x1={center}
              y1={center}
              x2={farCoord.x}
              y2={farCoord.y}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          );
        })}

        {/* Draw background concentric pentagons */}
        {gridPolygons.map((points, idx) => (
          <polygon
            key={`grid-${idx}`}
            points={points}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}

        {/* Level indicators inside radar */}
        {backgroundLevels.map((level) => {
          const coord = getCoordinates(1, level);
          return (
            <text
              key={`level-text-${level}`}
              x={coord.x}
              y={coord.y}
              className="text-[9px] fill-slate-300 font-mono"
              dx="4"
              dy="-4"
            >
              {level}%
            </text>
          );
        })}

        {/* Shaded student mastery area */}
        <polygon
          points={actualPoints}
          className="fill-teal-400/20 stroke-teal-500 stroke-[2] transition-all duration-500 ease-out"
        />

        {/* Dots on mastery corners */}
        {categories.map((cat, idx) => {
          const val = skills[cat.key as keyof typeof skills] || 50;
          const coord = getCoordinates(idx, val);
          return (
            <g key={`dot-group-${idx}`} className="group cursor-help">
              <circle
                cx={coord.x}
                cy={coord.y}
                r="5"
                className="fill-teal-500 stroke-white stroke-[2] shadow-sm hover:scale-130 transition-transform duration-200"
              />
              <circle
                cx={coord.x}
                cy={coord.y}
                r="10"
                className="fill-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              />
            </g>
          );
        })}

        {/* Category Labels */}
        {categories.map((cat, idx) => {
          const val = skills[cat.key as keyof typeof skills] || 50;
          const coord = getCoordinates(idx, 110); // slightly further out for text label
          const anchor = getLabelAnchor(idx);
          return (
            <text
              key={`label-${idx}`}
              x={coord.x}
              y={coord.y}
              {...anchor}
              className="text-xs font-medium fill-slate-700 font-sans"
            >
              {cat.label}
              <tspan className="text-[10px] text-teal-600 font-mono block lg:inline ml-1">
                ({val}%)
              </tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ==========================================
// AREA/LINE CHART (長期答對率趨勢)
// ==========================================
interface TrendChartProps {
  records: {
    date: string;
    title: string;
    accuracyRate: number;
  }[];
}

export function TrendChart({ records }: TrendChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Pad or take initial data if records are empty
  const defaultData = [
    { date: '04/15', accuracyRate: 0, title: '起步基準' },
    ...records.map(r => {
      const parts = r.date.split('-');
      const formattedDate = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : r.date;
      return {
        date: formattedDate,
        accuracyRate: r.accuracyRate,
        title: r.title
      };
    })
  ].sort((a,b) => a.date.localeCompare(b.date));

  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Max value is always 100%
  const getX = (index: number) => {
    if (defaultData.length <= 1) return paddingX + chartWidth / 2;
    return paddingX + (index / (defaultData.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return height - paddingY - (val / 100) * chartHeight;
  };

  // Generate SVG Path for line and area
  const points = defaultData.map((d, idx) => ({
    x: getX(idx),
    y: getY(d.accuracyRate)
  }));

  const linePath = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') 
    : '';

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  return (
    <div className="p-4 rounded-xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur-sm relative" id="linear-trend-chart">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <span className="text-[11px] font-mono tracking-wider font-semibold text-slate-400 uppercase">Accuracy Trend</span>
        </div>
        <span className="text-xs text-slate-400">水準：0% - 100%</span>
      </div>

      <div className="relative overflow-visible">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Y-Axis Horizontal Grid Lines & Labels */}
          {[0, 25, 50, 75, 100].map((level, idx) => {
            const h = getY(level);
            return (
              <g key={`y-grid-${idx}`}>
                <line
                  x1={paddingX}
                  y1={h}
                  x2={width - paddingX}
                  y2={h}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={h + 3}
                  className="text-[10px] font-mono fill-slate-400"
                  textAnchor="end"
                >
                  {level}%
                </text>
              </g>
            );
          })}

          {/* X Axis Line */}
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#cbd5e1"
            strokeWidth="1"
          />

          {/* Shaded Area with Gradient in background */}
          {points.length > 0 && (
            <>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#chartGradient)" />
              <path
                d={linePath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Interactive Trigger Zones & Data Dots */}
          {points.map((p, idx) => {
            const d = defaultData[idx];
            return (
              <g key={`point-group-${idx}`}>
                {/* Horizontal reference line when hovered */}
                {hoveredPoint === idx && (
                  <line
                    x1={p.x}
                    y1={getY(100)}
                    x2={p.x}
                    y2={height - paddingY}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Vertical dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hoveredPoint === idx ? '6' : '4'}
                  className={`${indexColors(d.accuracyRate)} stroke-white stroke-[2] transition-colors duration-150 shadow-md cursor-pointer`}
                  onMouseEnter={() => setHoveredPoint(idx)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />

                {/* X labels */}
                <text
                  x={p.x}
                  y={height - paddingY + 15}
                  className="text-[10px] font-mono fill-slate-500 font-medium"
                  textAnchor="middle"
                >
                  {d.date}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Tooltip on Hover */}
        {hoveredPoint !== null && (
          <div 
            className="absolute z-15 bg-slate-900 border border-slate-800 text-white p-2.5 rounded-lg shadow-xl text-left text-xs pointer-events-none transition-all duration-150"
            style={{
              left: `${(points[hoveredPoint].x / width) * 100}%`,
              top: `${(points[hoveredPoint].y / height) * 100 - 45}%`,
              transform: 'translate(-50%, -100%)',
              minWidth: '150px'
            }}
          >
            <div className="font-semibold text-sky-300 truncate">{defaultData[hoveredPoint].title}</div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-slate-400 text-[10px]">日期:</span>
              <span className="font-mono">{defaultData[hoveredPoint].date}</span>
            </div>
            <div className="flex justify-between items-center mt-0.5">
              <span className="text-slate-400 text-[10px]">答對率 / 成果:</span>
              <span className="font-mono font-bold text-emerald-400">{defaultData[hoveredPoint].accuracyRate}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function indexColors(val: number): string {
  if (val >= 80) return 'fill-emerald-500';
  if (val >= 60) return 'fill-blue-500';
  if (val >= 45) return 'fill-amber-500';
  return 'fill-rose-500';
}
