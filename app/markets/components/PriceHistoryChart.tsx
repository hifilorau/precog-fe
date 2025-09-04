'use client';

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PriceHistoryResponse } from '@/lib/types/markets';
import styles from './PriceHistoryChart.module.css';

interface PriceHistoryChartProps {
  data: PriceHistoryResponse;
  highlightOutcomeId?: string | number;
  showOnlyHighlighted?: boolean;
}

// Define a type for the structured data points for the chart
interface ChartDataPoint {
  timestamp: string;
  [key: string]: number | string | null;
}

// High-contrast, colorblind-friendly palette for dark backgrounds
const CHART_COLORS = [
  '#FF6B6B', // Red
  '#FFD93D', // Yellow
  '#6BCB77', // Green
  '#4D96FF', // Blue
  '#FF6FFF', // Magenta
  '#FF922B', // Orange
  '#845EC2', // Purple
  '#00C9A7', // Teal
  '#F9F871', // Light Yellow
  '#F9844A', // Coral
  '#43B0F1', // Sky Blue
  '#F7B801', // Gold
];

const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ 
  data, 
  highlightOutcomeId,
  showOnlyHighlighted = false 
}) => {
  if (!data || !data.outcomes || Object.keys(data.outcomes).length === 0) {
    return <p className="text-gray-500">No price history available to chart.</p>;
  }

  // Filter outcomes if showOnlyHighlighted is true and we have a highlightOutcomeId
  const filteredOutcomes = useMemo(() => {
    if (showOnlyHighlighted && highlightOutcomeId) {
      const idStr = highlightOutcomeId.toString();
      return Object.fromEntries(
        Object.entries(data.outcomes).filter(([key, outcome]) =>
          key === idStr ||
          outcome.name === idStr ||
          key.toLowerCase() === idStr.toLowerCase() ||
          outcome.name?.toLowerCase() === idStr.toLowerCase()
        )
      );
    }
    return data.outcomes;
  }, [data.outcomes, highlightOutcomeId, showOnlyHighlighted]);

  // We need to transform the data into a format that recharts can easily use.
  // The goal is an array of objects, where each object represents a point in time
  // and has a key for each outcome's price at that time.

  const chartData: ChartDataPoint[] = useMemo(() => {
    // Pre-index each outcome's prices by ISO timestamp for O(1) lookup
    const indexByOutcome: Record<string, Record<string, number>> = {};
    const allTimestamps = new Set<string>();
    Object.values(filteredOutcomes).forEach(outcome => {
      const map: Record<string, number> = {};
      outcome.prices.forEach(p => {
        const t = new Date(p.timestamp).toISOString();
        allTimestamps.add(t);
        // @ts-ignore
        if (p && typeof p.price === 'number') {
          // @ts-ignore
          map[t] = p.price;
        }
      });
      indexByOutcome[outcome.name] = map;
    });
    const sortedTimestamps = Array.from(allTimestamps).sort();
    return sortedTimestamps.map(timestamp => {
      const dataPoint: ChartDataPoint = { timestamp };
      Object.values(filteredOutcomes).forEach(outcome => {
        const val = indexByOutcome[outcome.name]?.[timestamp] ?? null;
        dataPoint[outcome.name] = val as number | null;
      });
      return dataPoint;
    });
  }, [filteredOutcomes]);

  const outcomes = useMemo(() => Object.entries(filteredOutcomes).map(([id, outcome]) => {
    const idStr = highlightOutcomeId?.toString();
    const isHighlighted = id === idStr ||
      outcome.name === idStr ||
      id.toLowerCase() === idStr?.toLowerCase() ||
      outcome.name?.toLowerCase() === idStr?.toLowerCase();
    return { id, name: outcome.name, isHighlighted };
  }), [filteredOutcomes, highlightOutcomeId]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="#2d3748" 
          opacity={highlightOutcomeId ? 0.3 : 0.7}
        />
        <XAxis 
          dataKey="timestamp"
          tickFormatter={(timeStr) => new Date(timeStr).toLocaleDateString()} 
        />
        <YAxis />
        <Tooltip
          labelFormatter={(label) => new Date(label).toLocaleString()}
          formatter={(value: number) => value !== null ? value.toFixed(4) : 'N/A'}
          wrapperClassName={styles['recharts-tooltip-wrapper']}
          contentStyle={{ background: '#18181b', color: '#fff', borderRadius: 8, border: '1px solid #333' }}
          itemStyle={{ color: '#fff' }}
        />
        <Legend />
        {outcomes.map((outcome, idx) => {
          const color = CHART_COLORS[idx % CHART_COLORS.length];
          return (
            <Line 
              key={outcome.id}
              type="monotone"
              dataKey={outcome.name}
              stroke={color}
              strokeWidth={outcome.isHighlighted ? 3 : 1.5}
              strokeOpacity={outcome.isHighlighted ? 1 : 0.7}
              dot={false}
              connectNulls
              activeDot={outcome.isHighlighted ? { r: 4, fill: color } : undefined}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default React.memo(PriceHistoryChart);
