
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ScoreGaugeProps {
  score: number;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score }) => {
  const data = [
    { name: 'Score', value: score },
    { name: 'Remainder', value: 100 - score },
  ];

  const getColor = (val: number) => {
    if (val < 50) return '#ef4444'; // Red
    if (val < 75) return '#f59e0b'; // Amber
    if (val < 90) return '#3b82f6'; // Blue
    return '#10b981'; // Emerald
  };

  const color = getColor(score);

  const getLabel = (val: number) => {
    if (val < 50) return 'Automatic Rejection';
    if (val < 75) return 'Needs Optimization';
    if (val < 90) return 'Strong Contender';
    return 'Top 1% Match';
  };

  return (
    <div className="relative w-full h-64 flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            startAngle={180}
            endAngle={0}
            paddingAngle={0}
            dataKey="value"
          >
            <Cell fill={color} />
            <Cell fill="#e2e8f0" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-2 text-center">
        <span className="text-4xl font-bold" style={{ color }}>{score}%</span>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">
          {getLabel(score)}
        </p>
      </div>
    </div>
  );
};

export default ScoreGauge;
