import { QueueManager } from './queue-manager';

export class QueueStore {
  private static instance: QueueStore;
  private queues: QueueManager[] = [];

  public static getInstance(): QueueStore {
    if (!QueueStore.instance) {
      QueueStore.instance = new QueueStore();
    }

    return QueueStore.instance;
  }

  addQueue(queue: QueueManager) {
    this.queues.push(queue);

    return this;
  }

  removeQueue(queue: QueueManager) {
    const index = this.queues.indexOf(queue);

    if (!index) {
      return this;
    }

    this.queues.splice(index, 1);

    return this;
  }

  removeAll() {
    this.queues = [];
  }

  getQueues() {
    return this.queues;
  }
}

