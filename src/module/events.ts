import { EventEmitter } from 'events';

export const events = {
    connection: new EventEmitter(),
    queueManager: new EventEmitter(),
    message: new EventEmitter()
};
