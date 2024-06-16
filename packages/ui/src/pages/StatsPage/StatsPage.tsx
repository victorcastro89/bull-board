/* eslint-disable */
import React, { useState } from 'react';
import { useQueues } from '../../hooks/useQueues';
import QueueMetricsChart from '../../components/Chart/QueueMetricsChart';
import s from './StatsPage.module.css';

export const StatsPage: React.FC = () => {
    const { actions, queues, metrics } = useQueues();
    const [timeframe, setTimeframe] = useState('1440'); // Default to the last day
    const [metricType, setMetricType] = useState<'JobPerMinute' | 'JobAvgTime'>('JobPerMinute'); // Default to jobs per minute

    const handleTimeframeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setTimeframe(e.target.value);
    };

    const handleMetricTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setMetricType(e.target.value as 'JobPerMinute' | 'JobAvgTime');
    };


    actions.pollQueues();
    const start = 0;
    console.log(timeframe)
    const end = parseInt(timeframe);
    actions.pullMetrics(start, end, 'min');

    return (
        <section>
            <div className={s.filters}>
                <div>
                    <label htmlFor="timeframe">Select Timeframe:</label>
                    <select id="timeframe" value={timeframe} onChange={handleTimeframeChange}>
                        <option value="60">Last Hour</option>
                        <option value="1440">Last Day</option>
                        <option value="10080">Last Week</option>
                        <option value="20160">Last 2 Weeks</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="metricType">Select Metric Type:</label>
                    <select id="metricType" value={metricType} onChange={handleMetricTypeChange}>
                        <option value="JobPerMinute">Jobs Per Minute</option>
                        <option value="JobAvgTime">Average Job Time</option>
                    </select>
                </div>
            </div>
            <div className={s.stats}>
                {queues?.map((queue) => (
                    <div key={queue.name}>
                        <h3>{queue.name}</h3>
                        {metrics && metrics.queues ? (
                            metrics.queues.map((metric) => (
                                metric.queueName === queue.name && (
                                    <QueueMetricsChart
                                        key={metric.queueName}
                                        metrics={metric.metrics}
                                        metricType={metricType}
                                    />
                                )
                            ))
                        ) : (
                            <p>Loading metrics...</p>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
};