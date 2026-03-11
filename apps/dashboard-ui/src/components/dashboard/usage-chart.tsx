'use client';

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';

interface UsageChartProps {
    data: any[];
    type: 'requests' | 'cost';
}

export const UsageChart: React.FC<UsageChartProps> = ({ data, type }) => {
    const isCost = type === 'cost';
    const color = isCost ? '#10b981' : '#8b5cf6'; // Green for cost, Purple for requests
    const fillId = `color-${type}`;

    return (
        <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis 
                        dataKey="day" 
                        stroke="#94a3b8" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis 
                        stroke="#94a3b8" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => isCost ? `$${value}` : value}
                    />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '1px solid #1e293b',
                            borderRadius: '8px',
                            color: '#f8fafc'
                        }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey={isCost ? 'cost' : 'requests'} 
                        stroke={color} 
                        fillOpacity={1} 
                        fill={`url(#${fillId})`} 
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
