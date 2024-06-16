import { AppJob, AppQueue, Status } from './app';
import {Metrics} from "bullmq";
export interface QueueMetrics {
  queueName: string;
  metrics: Metrics | undefined;
  averageJobTime: number;
  averageCompletionRate: number;
}

export interface GetMetricsResponse {
  queues: QueueMetrics[];

}

export interface GetQueuesResponse {

  queues: AppQueue[];
}

export interface GetJobResponse {
  job: AppJob;
  status: Status;
}
