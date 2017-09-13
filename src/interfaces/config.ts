export interface RabbitMQConfigConnection {
    uri?: string;
    host?: string;
    vhost?: string;
    port?: number;
    login?: string;
    password?: string;
    params?: Array<string | number | boolean>;
    retry?: {
        maximum_attempts: number;
        delay: number;
    };
}

export interface RabbitMQConfig {
    connection: RabbitMQConfigConnection;
}
