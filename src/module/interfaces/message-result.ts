export interface MessageResultObject {
    ack?: boolean;
    reject?: boolean;
    requeue?: boolean;
}

export type MessageResult = MessageResultObject | Boolean;
