import React from 'react';
import { ExtractedData } from '../types';

interface SoilProfileChartProps {
  data: ExtractedData[];
}

export const SoilProfileChart: React.FC<SoilProfileChartProps> = ({ data }) => {
  const COLUMN_WIDTH = 420; // Increased width to fit extra Daya parameters
  const COLUMN_GAP = 50;   
  const MARGIN_TOP = 100;
  const MARGIN_BOTTOM = 220;
  const MARGIN_SIDES = 80;
  const PIXELS_PER_METER = 70;

  const parseElevation = (s: string) => {
    const v = parseFloat(s.replace(/[^\d.-]/g, ''));
    return isNaN(v) ? 0 : v;
  };

  const elevations = data.map(d => parseElevation(d.header.elevation));
  const maxRawElev = Math.max(...elevations);
  const minRawElev = Math.min(...elevations);
  const isRelativeMode = (maxRawElev - minRawElev) > 50 || data.length < 2;

  const plotElevations = data.map((d, i) => isRelativeMode ? 0 : elevations[i]);
  
  let maxAbsElev = -Infinity;
  let minAbsElev = Infinity;

  data.forEach((bh, idx) => {
    const surf = plotElevations[idx];
    const maxD = Math.max(...bh.layers.map(l => l.depthTo), ...bh.spt.map(s => s.depth), 10);
    if (surf > maxAbsElev) maxAbsElev = surf;
    if ((surf - maxD) < minAbsElev) minAbsElev = (surf - maxD);
  });

  maxAbsElev = Math.ceil(maxAbsElev) + 1;
  minAbsElev = Math.floor(minAbsElev) - 1;
  
  const elevRange = maxAbsElev - minAbsElev;
  const CHART_HEIGHT = elevRange * PIXELS_PER_METER;
  
  // DYNAMIC CANVAS WIDTH CALCULATION
  const CONTENT_WIDTH = MARGIN_SIDES * 2 + (data.length * COLUMN_WIDTH) + ((data.length - 1) * COLUMN_GAP);
  const CANVAS_WIDTH = CONTENT_WIDTH + 100; 
  const CANVAS_HEIGHT = CHART_HEIGHT + MARGIN_TOP + MARGIN_BOTTOM;

  const getY = (abs: number) => MARGIN_TOP + (maxAbsElev - abs) * PIXELS_PER_METER;

  // Borehole Sub-Column Widths (Adjusted for Daya params)
  const W_DEPTH = 30;
  const W_LITHO = 50;
  const W_PARAMS = 100; // Daya params sub-table
  const W_DESC = 140;
  const W_SPT = 100;

  return (
    <div className="bg-white p-4 inline-block">
       <svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} className="bg-white" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="white"/>
          
          {/* Grid */}
          {Array.from({ length: Math.ceil(elevRange) + 1 }).map((_, i) => {
            const elev = maxAbsElev - i;
            const y = getY(elev);
            return (
              <g key={i}>
                 <line x1={MARGIN_SIDES} y1={y} x2={CANVAS_WIDTH - MARGIN_SIDES} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                 <text x={MARGIN_SIDES - 10} y={y} dy="0.32em" textAnchor="end" fontSize="10" fill="#94a3b8">
                   {isRelativeMode ? `-${i}m` : elev}
                 </text>
              </g>
            )
          })}

          {data.map((bh, idx) => {
            const startX = MARGIN_SIDES + 50 + idx * (COLUMN_WIDTH + COLUMN_GAP);
            const surfElev = plotElevations[idx];

            return (
              <g key={idx}>
                 {/* Header */}
                 <rect x={startX} y={MARGIN_TOP - 80} width={COLUMN_WIDTH} height={60} fill="#1e293b" rx="8" />
                 <text x={startX + COLUMN_WIDTH/2} y={MARGIN_TOP - 45} textAnchor="middle" fill="white" fontWeight="bold" fontSize="16">
                    קידוח {bh.header.boreholeName}
                 </text>
                 <text x={startX + COLUMN_WIDTH/2} y={MARGIN_TOP - 30} textAnchor="middle" fill="#94a3b8" fontSize="10">
                    רום: {bh.header.elevation} | {bh.header.coordinates}
                 </text>

                 {/* Column Frame */}
                 <rect x={startX} y={MARGIN_TOP} width={COLUMN_WIDTH} height={CHART_HEIGHT} fill="none" stroke="#e2e8f0" />
                 
                 {/* Sub-Column headers */}
                 <g fontSize="9" fontWeight="bold" textAnchor="middle" fill="#64748b">
                    <text x={startX + 15} y={MARGIN_TOP - 5}>עומק</text>
                    <text x={startX + 30 + 25} y={MARGIN_TOP - 5}>חתך</text>
                    <text x={startX + 30 + 50 + 50} y={MARGIN_TOP - 5}>פרמטרים (דקים/פלס/תפיחה)</text>
                    <text x={startX + 30 + 50 + 100 + 70} y={MARGIN_TOP - 5}>תיאור גיאולוגי</text>
                    <text x={startX + COLUMN_WIDTH - 50} y={MARGIN_TOP - 5}>SPT</text>
                 </g>

                 {/* Layers */}
                 {bh.layers.map(l => {
                    const yTop = getY(surfElev - l.depthFrom);
                    const yBot = getY(surfElev - l.depthTo);
                    const h = yBot - yTop;
                    const xL = startX + 30;
                    const xP = xL + 50;
                    const xD = xP + 100;

                    return (
                      <g key={l.id}>
                        <rect x={xL} y={yTop} width={50} height={h} fill={l.color} stroke="#000" strokeWidth="0.5" />
                        <text x={xL + 25} y={yTop + Math.min(h/2, 15)} dy="0.3em" textAnchor="middle" fontSize="10" fontWeight="bold">{l.uscs}</text>
                        
                        {/* Daya Parameters Sub-Table */}
                        <g transform={`translate(${xP}, ${yTop})`} fontSize="8">
                           <rect width={100} height={h} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                           <text x="5" y="12" fill="#475569">דקים: {l.finePercent || '-'}</text>
                           <text x="5" y="24" fill="#475569">פלס: {l.plasticity || '-'}</text>
                           <text x="5" y="36" fill="#475569">תפיחה: {l.swelling || '-'}</text>
                        </g>

                        {/* Description */}
                        <foreignObject x={xD} y={yTop} width={140} height={h}>
                           <div className="h-full pr-2 text-[9px] leading-tight text-right overflow-hidden border-b border-slate-100 flex items-center">
                              {l.description}
                           </div>
                        </foreignObject>

                        {/* Depth mark */}
                        <text x={startX + 15} y={yBot} dy="0.3em" textAnchor="middle" fontSize="9" fill="#94a3b8">{l.depthTo}</text>
                      </g>
                    )
                 })}

                 {/* SPT Graph */}
                 {(() => {
                    const xS = startX + COLUMN_WIDTH - 100;
                    const points = bh.spt.sort((a,b)=>a.depth-b.depth).map(p => {
                       const x = xS + (Math.min(p.value, 50)/50)*100;
                       const y = getY(surfElev - p.depth);
                       return `${x},${y}`;
                    }).join(' ');
                    return (
                       <g>
                          <rect x={xS} y={MARGIN_TOP} width={100} height={CHART_HEIGHT} fill="#f8fafc" opacity="0.5" />
                          <polyline points={points} fill="none" stroke="#ef4444" strokeWidth="1.5" />
                          {bh.spt.map(p => (
                             <circle key={p.id} cx={xS + (Math.min(p.value, 50)/50)*100} cy={getY(surfElev - p.depth)} r="2" fill="#ef4444" />
                          ))}
                       </g>
                    )
                 })()}
              </g>
            )
          })}

          {/* Legend / Title Block */}
          <g transform={`translate(${CANVAS_WIDTH - 450}, ${CANVAS_HEIGHT - 180})`}>
             <rect width="400" height="150" fill="white" stroke="black" strokeWidth="2" />
             <text x="380" y="40" textAnchor="end" fontSize="18" fontWeight="bold">פרויקט: {data[0].header.projectName}</text>
             <text x="380" y="70" textAnchor="end" fontSize="14">חתך קרקע הנדסי מאוחד</text>
             <text x="380" y="100" textAnchor="end" fontSize="10" fill="#64748b">תאריך הפקה: {new Date().toLocaleDateString('he-IL')}</text>
             <text x="20" y="135" fontSize="10" fill="#cbd5e1">Generated by GeoPlot AI Professional</text>
          </g>
       </svg>
    </div>
  );
};