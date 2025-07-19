'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PriceHistoryResponse } from '@/lib/types/markets';
import styles from './PriceHistoryChart.module.css';

interface PriceHistoryChartProps {
  data: PriceHistoryResponse;
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

const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ data }) => {
  if (!data || !data.outcomes || Object.keys(data.outcomes).length === 0) {
    return <p className="text-gray-500">No price history available to chart.</p>;
  }

  // We need to transform the data into a format that recharts can easily use.
  // The goal is an array of objects, where each object represents a point in time
  // and has a key for each outcome's price at that time.

  const allTimestamps = new Set<string>();
  Object.values(data.outcomes).forEach(outcome => {
    outcome.prices.forEach(pricePoint => {
      allTimestamps.add(new Date(pricePoint.timestamp).toISOString());
    });
  });

  const sortedTimestamps = Array.from(allTimestamps).sort();

  const chartData: ChartDataPoint[] = sortedTimestamps.map(timestamp => {
    const dataPoint: ChartDataPoint = { timestamp };
    Object.values(data.outcomes).forEach(outcome => {
      const pricePoint = outcome.prices.find(p => new Date(p.timestamp).toISOString() === timestamp);
      // Type guard to ensure 'price' exists
      if (pricePoint && 'price' in pricePoint) {
        dataPoint[outcome.name] = pricePoint.price;
      } else {
        dataPoint[outcome.name] = null;
      }
    });
    return dataPoint;
  });

  const outcomeNames = Object.values(data.outcomes).map(o => o.name);

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
        <CartesianGrid strokeDasharray="3 3" />
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
        {outcomeNames.map((name, idx) => (
          <Line 
            key={name} 
            type="monotone" 
            dataKey={name} 
            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
            dot={false}
            connectNulls // This will connect lines across null data points
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default PriceHistoryChart;
