export interface RabbitMQConfigConnection {
    uri?: string;
    host?: string;
    vhost?: string;
    port?: number;
    login?: string;
    password?: string;
    parameters?: Array<string | number | boolean>;
}

export interface RabbitMQConfig {
    connection: RabbitMQConfigConnection;
}
