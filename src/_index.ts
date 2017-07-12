import { HapiConfig, Hapiness, HttpServerExt } from '@hapiness/core';
import * as config from 'config';
// import { LoggerExt } from '@hapiness/logger';
// import { LoggerOptions, createLogger } from 'bunyan';

import { RabbitMQModule } from './module';
import { RabbitMQExt } from './extension';

// bootstrap application
Hapiness.bootstrap(RabbitMQModule, [
    RabbitMQExt.setConfig(config.get('rabbitmq'))
    // HttpServerExt.setConfig(Config.get<HapiConfig>('server')),
    // LoggerExt.setConfig({ logger: createLogger(Config.get<LoggerOptions>('logger')) })
]);
