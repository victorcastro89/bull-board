import { BullBoardRequest, ControllerHandlerReturnType } from '../../typings/app';
import { Metrics } from "../queueAdapters/bullMQ";
import { BaseAdapter } from "../queueAdapters/base";

export interface QueueMetrics {
    queueName: string;
    metrics: Metrics | undefined;
    averageJobTime: number;
    averageCompletionRate: number;
}

function calculateTimeframeInSeconds(timeframe: string): number {
    switch (timeframe) {
        case 'sec':
            return 1;
        case 'min':
            return 60;
        case 'hour':
            return 3600;
        case 'day':
            return 86400;
        default:
            return 60; // default to minute
    }
}

async function getStats(pairs: [string, BaseAdapter][], timeframe: string, start?: number, end?: number): Promise<QueueMetrics[]> {
    return Promise.all(
        pairs.map(async ([queueName, queue]) => {
            const metrics = await queue.getStats(start, end);

            if (metrics) {
                const currentTime = Date.now();
                const prevTimeInSeconds = (currentTime - metrics.meta.prevTS) / 1000;
                const jobsProcessedInPrevTime = metrics.meta.count - metrics.meta.prevCount;
                const averageCompletionRate = jobsProcessedInPrevTime / (prevTimeInSeconds / 60);

                const totalJobTimeInSeconds = metrics.data.reduce((acc, count) => acc + Number(count), 0);
                const averageJobTimeInSeconds = metrics.data.length ? totalJobTimeInSeconds / metrics.data.length : 0;

                // Convert averageJobTimeInSeconds to the specified timeframe unit
                const timeframeInSeconds = calculateTimeframeInSeconds(timeframe);
                const averageJobTime = averageJobTimeInSeconds / timeframeInSeconds;

                return {
                    queueName,
                    metrics,
                    averageJobTime,
                    averageCompletionRate,
                };
            }

            return {
                queueName,
                metrics: undefined,
                averageJobTime: 0,
                averageCompletionRate: 0,
            };
        })
    );
}

export async function queueStatsHandler({
                                            queues: bullBoardQueues,
                                            query,
                                        }: BullBoardRequest): Promise<ControllerHandlerReturnType> {
    const pairs = [...bullBoardQueues.entries()];
    const { start, end, timeframe } = query;

    const queues = pairs.length > 0 ? await getStats(pairs, timeframe, start, end) : [];

    return {
        body: {
            queues,
        },
    };
}
