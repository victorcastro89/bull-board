import React from 'react';
import { Line } from 'react-chartjs-2';
import { ChartData, ChartOptions, registerables } from 'chart.js';
import { Chart } from 'chart.js';
import { QueueMetrics } from '@bull-board/api/typings/responses';

Chart.register(...registerables);

interface QueueMetricsChartProps {
    metrics: QueueMetrics['metrics'];
    metricType: 'JobPerMinute' | 'JobAvgTime';
}

const QueueMetricsChart: React.FC<QueueMetricsChartProps> = ({ metrics, metricType }) => {
    if (!metrics) {
        return <p>Loading chart...</p>;
    }

    const chartData: ChartData<'line'> = {
        labels: metrics.data.map((_, index) => new Date(metrics.meta.prevTS + index * 60000).toLocaleString()),
        datasets: [
            {
                label: metricType === 'JobPerMinute' ? 'Jobs Per Minute' : 'Average Job Time',
                data: metricType === 'JobPerMinute' ? metrics.data : metrics.data.map(job => job *1000/ 60),
                fill: false,
                backgroundColor: 'rgba(75,192,192,0.2)',
                borderColor: 'rgba(75,192,192,1)',
            },
        ],
    };

    const chartOptions: ChartOptions<'line'> = {
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Timestamp',
                },
            },
            y: {
                title: {
                    display: true,
                    text: metricType === 'JobPerMinute' ? 'Job Count' : 'Average Time (ms)',
                },
            },
        },
    };

    return <Line data={chartData} options={chartOptions} />;
};

export default QueueMetricsChart;
