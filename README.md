<img src="http://bit.ly/2mxmKKI" width="500" alt="Hapiness" />

<div style="margin-bottom:20px;">
<div style="line-height:60px">
    <a href="https://travis-ci.org/hapinessjs/rabbit-module.svg?branch=master">
        <img src="https://travis-ci.org/hapinessjs/rabbit-module.svg?branch=master" alt="build" />
    </a>
    <a href="https://coveralls.io/github/hapinessjs/rabbit-module?branch=master">
        <img src="https://coveralls.io/repos/github/hapinessjs/rabbit-module/badge.svg?branch=master" alt="coveralls" />
    </a>
    <a href="https://david-dm.org/hapinessjs/rabbit-module">
        <img src="https://david-dm.org/hapinessjs/rabbit-module.svg" alt="dependencies" />
    </a>
    <a href="https://david-dm.org/hapinessjs/rabbit-module?type=dev">
        <img src="https://david-dm.org/hapinessjs/rabbit-module/dev-status.svg" alt="devDependencies" />
    </a>
</div>
<div>
    <a href="https://www.typescriptlang.org/docs/tutorial.html">
        <img src="https://cdn-images-1.medium.com/max/800/1*8lKzkDJVWuVbqumysxMRYw.png"
             align="right" alt="Typescript logo" width="50" height="50" style="border:none;" />
    </a>
    <a href="http://reactivex.io/rxjs">
        <img src="http://reactivex.io/assets/Rx_Logo_S.png"
             align="right" alt="ReactiveX logo" width="50" height="50" style="border:none;" />
    </a>
    <a href="http://hapijs.com">
        <img src="http://bit.ly/2lYPYPw"
             align="right" alt="Hapijs logo" width="75" style="border:none;" />
    </a>
</div>
</div>

# RabbitMQ Module

```RabbitMQ``` module for the Hapiness framework.

RabbitMQ is a server that implement the `AMQP 0-9-1` protocol.

[Getting started with AMQP concepts](https://www.rabbitmq.com/tutorials/amqp-concepts.html)

The module uses [amqp.node](https://github.com/squaremo/amqp.node) to connect to RabbitMQ and is architectured arround [the channel API
provided](http://www.squaremobius.net/amqp.node/channel_api.html).

## Table of contents

* [How this module works](#how-this-module-works)
* [Message and routing](#message-and-routing)
* [Using your module inside Hapiness application](#using-your-module-inside-hapiness-application)
	* [`yarn` or `npm` it in your `package.json`](#yarn-or-npm-it-in-your-package.json)
	* [Importing `RabbitMQModule` from the library](#importing-rabbitmqmodule-from-the-library)
	* [Using `RabbitMQ` inside your application](#using-rabbitmq-inside-your-application)
* [Contributing](#contributing)
* [Change History](#change-history)
* [Maintainers](#maintainers)
* [License](#license)

## How this module works

### Prototyping your AMQP usage

With this module you will be able to configure your AMQP stack easily with the way you prefer.

We provide three decorators, ```@Exchange```, ```@Queue```, ```@Message``` that will allow you to quickly getting started.

<!--First defines your exchanges, then the queues that can be bound to some of those and then you can create some messages to handle your
RabbitMQ messages. See [Message Routing](#message-routing) below.-->

### Configuration

<table>
    <tr>
        <th>Key</th>
        <th>Type</th>
        <th>Infos</th>
    </tr>
    <tr>
        <td>connection</td>
        <td><b>object</b></td>
        <td>Connection Object</td>
    </tr>
</table>

### Connection object

<table>
    <tr>
        <th>Key</th>
        <th>Type</th>
        <th>Default</th>
        <th>Infos</th>
    </tr>
    <tr>
        <td>uri</td>
        <td><b>string</b></td>
        <td>undefined</td>
        <td>other values are ignored if set</td>
    </tr>
    <tr>
        <td>host</td>
        <td><b>string</b></td>
        <td><b>localhost</b></td>
        <td>-</td>
    </tr>
    <tr>
        <td>port</td>
        <td><b>number</b></td>
        <td><b>5672</b></td>
        <td>-</td>
    </tr>
    <tr>
        <td>login</td>
        <td><b>string</b></td>
        <td>undefined</td>
        <td>-</td>
    </tr>
    <tr>
        <td>password</td>
        <td><b>string</td>
        <td>undefined</td>
        <td>-</td>
    </tr>
    <tr>
        <td>params</td>
        <td><b>object</b></td>
        <td>undefined</td>
        <td>Parameters to include in querystring, like:<br> <b>{ heartBeat: 30 }</b></td>
    </tr>
    <tr>
        <td>retry.delay</td>
        <td><b>number</b></td>
        <td><b>5000</b></td>
        <td>Delay in ms to wait after trying to reconnect</td>
    </tr>
    <tr>
        <td>retry.maximum_attempts</td>
        <td><b>number</b></td>
        <td><b>-1</b></td>
        <td>Maximum reconnection attempts, <b>-1</b> for <b>Infinity</b></td>
    </tr>
    <tr>
        <td>default_prefetch</td>
        <td><b>number</b></td>
        <td><b>10</b></td>
        <td>Default prefetch used when creating new channels</td>
    </tr>
</table>

### Connection & initialization

This module supports only one connection at the same time.

By default the module will retry to connect after a connection error.
This behaviour is configurable.

When the connection is ready the extension will find all classes with decorators and do all the work to get everything ready.


### Channels

Each connection can open several channels. Every operation on RabbitMQ occurs through channels.

You can create them easily with the ```ChannelService```.

### Exchanges

Exchanges needs a name and a type.

### Decorator parameters:

* ```name: string```
* ```type: ExchangeType``` (```ExchangeType.Direct```, ```ExchangeType.Topic```, ```ExchangeType.Fanout```)
* ```options: Object``` *optional* [see exchange assert options](http://www.squaremobius.net/amqp.node/channel_api.html#channel_assertExchange)

### Queues

Queues only requires a name.

### Decorator parameters:

* ```name: string```
* ```binds: Array<Bind>``` *optional*
* ```options: Object``` *optional* [see queue assert options](http://www.squaremobius.net/amqp.node/channel_api.html#channel_assertQueue)

## Message and routing

Each message sent on RabbitMQ is consumed by a queue.

You can decide to receive all the messages on your queue onMessage method.
That's a good option if you have only one type of message arriving on it.
You can also call your own dispatcher there.

It's also possible to receive plenty of different messages on the same queue.
Creating one class to handle each message is then a better choice.

This module allow you to link a RabbitMessage to your custom message class.
We provide a message router that will load the right message decorator class when receiving new messages.
If no message class is found the onMessage method on your queue is used as a fallback. If you did not provide this method an error
will be throwned.

### Decorator parameters:

* queue: the queue class where the message is consumed
* exchange: the exchange class
* routingKey: string or regex to match the routingKey of the message
* filter: a simple one level object with keys and values. Keys are the path on the RabbitMQ message and values could be
a string, number, boolean or RegExp.


## Using your module inside Hapiness application

### `yarn` or `npm` it in your `package.json`

```bash
$ npm install --save @hapiness/core @hapiness/rabbitmq rxjs

or

$ yarn add @hapiness/core @hapiness/rabbitmq rxjs
```

```javascript
"dependencies": {
    "@hapiness/core": "^1.3.0",
    "@hapiness/rabbitmq": "^1.2.3",
    "rxjs": "^5.5.6",
    //...
}
//...
```

### Importing `RabbitMQModule` from the library

This module provide an Hapiness extension for RabbitMQ.
To use it, simply register it during the ```bootstrap``` step of your project and provide the ```RabbitMQExt``` with its config

```typescript
import { RabbitMQExt } from '@hapiness/rabbitmq';

@HapinessModule({
    version: '1.0.0',
    providers: [],
    declarations: [],
    imports: [RabbitMQModule]
})
class MyApp implements OnStart {
    constructor() {}
    onStart() {}
}

Hapiness
    .bootstrap(
        MyApp,
        [
            /* ... */
            RabbitMQExt.setConfig(
                {
                    connection: {
                        host: 'localhost',
                        port: 5276,
                        vhost: 'my_vhost',
                        login: 'xxx',
                        password: 'xxxx'
                    }
                }
            )
        ]
    )
    .catch(err => {
        /* ... */
    });

```


### Using `RabbitMQ` inside your application

#### Using decorators

```typescript
@Exchange({
    name: 'user.exchange',
    type: ExchangeType.Topic,
    // See options available: http://www.squaremobius.net/amqp.node/channel_api.html#channel_assertExchange
    options: {
        durable: true,
        autoDelete: false
    }
})
export class UserExchange implements ExchangeInterface {}

@Queue({
    name: 'user.queue',
    // See options available: http://www.squaremobius.net/amqp.node/channel_api.html#channel_assertQueue
    options: {
        durable: true
    },
    binds: [{
        exchange: UserExchange,
        pattern: 'user.*'
    }]
})
export class UserQueue implements QueueInterface {

    // Inject your services
    constructor(private _myService; MyService) {}

    // Optional
    // Do some action when the queue is asserted
    onAsserted() {
        this._myService.foo();
    }

    // When a message is consumed it will arrives here if no message class has been found
    // by the router
    onMessage(message: RabbitMessage, ch: ChannelInterface) {
        return Observable.of({ ack: true });
    }

}

@Message({
    queue: UserQueue,
    exchange: UserExchange,
    routingKey: 'user.edited'
})
export class UserCreatedMessage implements MessageInterface {

    constructor(private _myService: MyService) {
        super();
    }

    // Executed when a message is consumed and dispatched here
    onMessage(message: RabbitMessage, ch: ChannelInterface): Observable<MessageResult> {
        this._myService.foo();
        // You can return an object to let the consumer know what to do with your message:
        // acknowleding, rejecting it or do nothing
        return Observable.of({ ack: true });
    }

}
```

This configuration will create:
* One exchange of type ```topic``` named ```user.exchange```.
* One durable queue named ```user.queue```
  * It will bind this queue to the previously created exchange with the routingKey ```user.*```
* It will dispatch all messages which are sent to the exchange and have the routingKey ```user.edited``` consumed by the previously created queue
to the new message we created.
* All other messages sent to the exchange with a routingKey matching the pattern ```user.*``` or sent directly to the queue will be consumed by
the ```onMessage()``` method defined in the queue.


#### Integration in your hapiness application

##### Module

You need to include ```RabbitMQModule``` in imports and all your decorated classes in declarations.

```typescript
@HapinessModule({
            version: '1.0.0',
            declarations: [
                MyQueue,
                MyExchange,
                MyMessage,
                ...
            ],
            providers: [
                MyService
            ],
            exports: [],
            imports: [RabbitMQModule]
        })
```

##### Bootstrap

You need to inject the extension in bootstrap using setConfig to instantiate the module.

```typescript
Hapiness.bootstrap(RabbitMQModuleTest, [
    RabbitMQExt.setConfig({
        connection: {
            host: '....',
            login: '....',
            password: '....'
        }
    })
]).catch(err => done(err));
```


#### Using the services

Once the extension is loaded and ```RabbitMQ``` is connected you can use the services in your app.

We provide two services:

 ```ConnectionService```, ```ChannelService```, ```MessageService```

 To send messages you can also use the sendMessage() utility provided.

```typescript

class FooProvider {

    constructor(private _channelService: ChannelService, private _messageService: MessageService) {}

    bar(): Observable<ChannelManager> {
        // Upsert a channel by specifying a key to identify it
        // one key per channel.
        // The function returns a Observable of ChannelManager instance
    	this._channelService.upsert('publish')
            .subscribe(channelManager => {
                this._myChannelManager = channelManager;
            });
    }


    foo() {
        // Use the created channel
        // Use the manager to retrieve the channel instance
        const ch = this._myChannelManager.getChannel();

        // ... or retrieve it with the shortcut getChannel and your key
        const ch = this._channelService.getChannel('publish');

        // Use any function from amqp.node
        ch.sendToQueue(...);

        this.sendToQueue(ch, { foo: 'bar' }, UserQueue);
        this.publish(ch, { foo: 'bar' }, UserExchange, { routingKey: 'foo.bar' });
    }

}

```

[Back to top](#table-of-contents)

## Contributing

To set up your development environment:

1. clone the repo to your workspace,
2. in the shell `cd` to the main folder,
3. hit `npm or yarn install`,
4. run `npm or yarn run test`.
    * It will lint the code and execute all tests.
    * The test coverage report can be viewed from `./coverage/lcov-report/index.html`.

[Back to top](#table-of-contents)

## Change History
* v1.7.1 (2019-12-16)
    * Handle all errors when sending a message
    * Fix scope of "this" when sending message
* v1.7.1 (2019-12-13)
    * Handle channel closed error when sending a message to add a custom code on the thrown error
* v1.7.0 (2019-02-27)
    * Add method to cancel consuming queue
    * Refactor consume queue to allow easier consume/cancel
    * Add a QueueStore to fetch all the queues manager instances
* v1.6.2 (2018-11-22)
    * Create DI with providers for queues and exchanges
* v1.6.1 (2018-11-14)
    * force_json_decode is now true by default
* v1.6.0 (2018-10-31)
    * Add assert option in Exchange and Queue decorator to allow to disable assert during bootstrap
    * Add check option in Exchange and Queue decorator to verify existence during bootstrap
* v1.5.1 (2018-09-24)
    * Fix reconnection error: use once instad of on and rebind event correctly
* v1.5.0 (2018-08-24)
    * Add possibility to provide a custom MessageRouter
* v1.4.3 (2018-08-20)
    * Emit RETRY_LIMIT_EXCEEDED error on ConnectionManager
* v1.4.2 (2018-06-11)
    * Do not retry to connect if closing server
* v1.4.1 (2018-05-31)
    * Fix channel creation after reconnection
* v1.4.0 (2018-04-24)
    * Refactor channel management to handle connection errors
* v1.3.0 (2018-03-27)
    * Add shutdown (SIGTERM/SIGINT) support
* v1.2.3 (2018-02-05)
    * Latest packages' versions.
    * Fix typings
    * Documentation.
* v1.2.2 (2017-12-20)
    * Latest packages' versions.
    * Fix queue dispatching in routing messages
    * Documentation.
* v1.2.1 (2017-11-23)
    * Latest packages' versions.
    * Fix routing messages
    * Documentation.
* v1.2.0 (2017-11-20)
    * Latest packages' versions.
    * Update Module + Tests related to latest `core` version.
    * Documentation.
    * Change packaging process.
* v1.1.2 (2017-11-02)
    * Fix decorators prefetch
* v1.1.1 (2017-10-31)
    * Fix queue binding
* v1.1.0 (2017-10-27)
    * Allow to define queue binds without pattern
    * Allow to define queue bind pattern as array
    * Add default prefetch that is used for each channel creation if not specified in create() method first argument
    * Rename decodeContent to decodeJSONContent and change logic to not throw if content is not JSON, add force argument to try to decode if headers.json boolean is missing
    * Add force_json_decode option in queue decorator to force JSON decoding of all messages consumed
    * Rework dispatcher logic (1)
    * Add channel option for queue to allow using different channel for each queue with a different prefetch
    * Export a global event object for connection and queueManager events
    * Correct logic behind message routing
    * Add checks and throw if messages do not have all required properties
    * If the message has a filter property and it does not match discard the class from the selection
    * Update tests
    * Update documentation
* v1.0.0 (2017-10-23)
    * Publish all features of the module
    * Tests
    * Documentation

[Back to top](#table-of-contents)

## Maintainers

<table>
    <tr>
        <td colspan="4" align="center"><a href="https://www.tadaweb.com"><img src="http://bit.ly/2xHQkTi" width="117" alt="tadaweb" /></a></td>
    </tr>
    <tr>
        <td align="center"><a href="https://github.com/Juneil"><img src="https://avatars3.githubusercontent.com/u/6546204?v=3&s=117" width="117"/></a></td>
        <td align="center"><a href="https://github.com/antoinegomez"><img src="https://avatars3.githubusercontent.com/u/997028?v=3&s=117" width="117"/></a></td>
        <td align="center"><a href="https://github.com/reptilbud"><img src="https://avatars3.githubusercontent.com/u/6841511?v=3&s=117" width="117"/></a></td>
        <td align="center"><a href="https://github.com/njl07"><img src="https://avatars3.githubusercontent.com/u/1673977?v=3&s=117" width="117"/></a></td>
    </tr>
    <tr>
        <td align="center"><a href="https://github.com/Juneil">Julien Fauville</a></td>
        <td align="center"><a href="https://github.com/antoinegomez">Antoine Gomez</a></td>
        <td align="center"><a href="https://github.com/reptilbud">Sébastien Ritz</a></td>
        <td align="center"><a href="https://github.com/njl07">Nicolas Jessel</a></td>
    </tr>
</table>

[Back to top](#table-of-contents)

## License

Copyright (c) 2017 **Hapiness** Licensed under the [MIT license](https://github.com/hapinessjs/rabbit-module/blob/master/LICENSE.md).

[Back to top](#table-of-contents)
