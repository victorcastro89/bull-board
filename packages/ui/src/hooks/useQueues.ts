import { JobCleanStatus, JobRetryStatus } from '@bull-board/api/typings/app';
import { GetMetricsResponse, GetQueuesResponse } from '@bull-board/api/typings/responses';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';
import { QueueActions } from '../../typings/app';
import { getConfirmFor } from '../utils/getConfirmFor';
import { useActiveQueueName } from './useActiveQueueName';
import { useApi } from './useApi';
import { useConfirm } from './useConfirm';
import { useInterval } from './useInterval';
import { useQuery } from './useQuery';
import { useSelectedStatuses } from './useSelectedStatuses';
import { useSettingsStore } from './useSettings';

export type TimeUnit = "sec" | "min" | "hour" | "day";

export type QueuesState = {
    metrics: null | GetMetricsResponse;
    queues: null | GetQueuesResponse['queues'];
    loading: boolean;
    updateQueues(queues: GetQueuesResponse['queues']): void;
    updateMetrics(metrics: GetMetricsResponse): void;
};

const useQueuesStore = create<QueuesState>((set) => ({
    metrics: null,
    queues: [],
    loading: true,
    updateQueues: (queues: GetQueuesResponse['queues']) => set(() => ({ queues, loading: false })),
    updateMetrics: (metrics: GetMetricsResponse) => set(() => ({ metrics })),
}));

export function useQueues(): Omit<QueuesState, 'updateQueues' | 'updateMetrics'> & { actions: QueueActions } {
    const query = useQuery();
    const { t } = useTranslation();
    const api = useApi();
    const activeQueueName = useActiveQueueName();
    const selectedStatuses = useSelectedStatuses();
    const { pollingInterval, jobsPerPage, confirmQueueActions } = useSettingsStore(
        ({ pollingInterval, jobsPerPage, confirmQueueActions }) => ({
            pollingInterval,
            jobsPerPage,
            confirmQueueActions,
        })
    );

    const { queues, loading, metrics, updateQueues: setState, updateMetrics: setMetrics } = useQueuesStore((state) => state);
    const { openConfirm } = useConfirm();

    const updateQueues = useCallback(
        () =>
            api
                .getQueues({
                    activeQueue: activeQueueName || undefined,
                    status: activeQueueName ? selectedStatuses[activeQueueName] : undefined,
                    page: query.get('page') || '1',
                    jobsPerPage,
                })
                .then((data) => {
                    setState(data.queues);
                })
                .catch((error) => console.error('Failed to poll', error)),
        [activeQueueName, jobsPerPage, selectedStatuses]
    );

    const getQueueStats = useCallback((timeframe: TimeUnit, start?: number, end?: number) => {
        return api
            .getQueueStats({
                start,
                end,
                timeframe,
            })
            .then((data) => {

                setMetrics(data);
                return data;
            })
            .catch((error) => {
                console.error('Failed to poll', error);
                throw error;
            });
    }, [setMetrics]);

    const pollQueues = () =>
        useInterval(updateQueues, pollingInterval > 0 ? pollingInterval * 1000 : null, [selectedStatuses]);

    const pullMetrics = useCallback((start: number, end: number, timeframe: TimeUnit) => {
        return useInterval(() => getQueueStats(timeframe, start, end), pollingInterval > 0 ? pollingInterval * 1000 : null, []);
    }, [getQueueStats, pollingInterval]);

    const withConfirmAndUpdate = getConfirmFor(updateQueues, openConfirm);

    const retryAll = (queueName: string, status: JobRetryStatus) =>
        withConfirmAndUpdate(
            () => api.retryAll(queueName, status),
            t('QUEUE.ACTIONS.RETRY_ALL_CONFIRM_MSG', { status }),
            confirmQueueActions
        );

    const promoteAll = (queueName: string) =>
        withConfirmAndUpdate(
            () => api.promoteAll(queueName),
            t('QUEUE.ACTIONS.PROMOTE_ALL_CONFIRM_MSG'),
            confirmQueueActions
        );

    const cleanAll = (queueName: string, status: JobCleanStatus) =>
        withConfirmAndUpdate(
            () => api.cleanAll(queueName, status),
            t('QUEUE.ACTIONS.CLEAN_ALL_CONFIRM_MSG', { status }),
            confirmQueueActions
        );

    const pauseQueue = (queueName: string) =>
        withConfirmAndUpdate(
            () => api.pauseQueue(queueName),
            t('QUEUE.ACTIONS.PAUSE_QUEUE_CONFIRM_MSG'),
            confirmQueueActions
        );

    const resumeQueue = (queueName: string) =>
        withConfirmAndUpdate(
            () => api.resumeQueue(queueName),
            t('QUEUE.ACTIONS.RESUME_QUEUE_CONFIRM_MSG'),
            confirmQueueActions
        );

    const emptyQueue = (queueName: string) =>
        withConfirmAndUpdate(
            () => api.emptyQueue(queueName),
            t('QUEUE.ACTIONS.EMPTY_QUEUE_CONFIRM_MSG'),
            confirmQueueActions
        );

    const addJob = (
        queueName: string,
        jobName: string,
        jobData: Record<any, any>,
        jobOptions: Record<any, any>
    ) => withConfirmAndUpdate(() => api.addJob(queueName, jobName, jobData, jobOptions), '', false);

    return {
        queues,
        loading,
        metrics,
        actions: {
            updateQueues,
            pollQueues,
            retryAll,
            promoteAll,
            cleanAll,
            pauseQueue,
            resumeQueue,
            emptyQueue,
            addJob,
            pullMetrics,
        },
    };
}
