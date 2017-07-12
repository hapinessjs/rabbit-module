<img src="http://bit.ly/2mxmKKI" width="500" alt="Hapiness" />

<div style="margin-bottom:20px;">
<div style="line-height:60px">
    <a href="https://travis-ci.org/hapinessjs/rabbitmq-module.svg?branch=master">
        <img src="https://travis-ci.org/hapinessjs/rabbitmq-module.svg?branch=master" alt="build" />
    </a>
    <a href="https://coveralls.io/github/hapinessjs/rabbitmq-module?branch=master">
        <img src="https://coveralls.io/repos/github/hapinessjs/rabbitmq-module/badge.svg?branch=master" alt="coveralls" />
    </a>
    <a href="https://david-dm.org/hapinessjs/rabbitmq-module">
        <img src="https://david-dm.org/hapinessjs/rabbitmq-module.svg" alt="dependencies" />
    </a>
    <a href="https://david-dm.org/hapinessjs/rabbitmq-module?type=dev">
        <img src="https://david-dm.org/hapinessjs/rabbitmq-module/dev-status.svg" alt="devDependencies" />
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

RabbitMQ is a server that implement the AMQP 0-9-1 protocol.

[Getting started with AMQP concepts](https://www.rabbitmq.com/tutorials/amqp-concepts.html)

The module uses [amqp.node](https://github.com/squaremo/amqp.node).

## Table of contents

* [How this module works](#How this module works)
* [Message routing](#message-routing)
* [Using your module inside Hapiness application](#using-your-module-inside-hapiness-application)
	* [`yarn` or `npm` it in your `package.json`](#yarn-or-npm-it-in-your-package)
	* [Importing `RabbitMQModule` from the library](#importing-rabbitmqmodule-from-the-library)
	* [Using `RabbitMQ` inside your application](#using-rabbitmq-inside-your-application)

## How this module works

### Prototyping your AMQP usage

With this module you will be able to configure your AMQP stack easily with the way you prefer.

We provide three decorators, ```@Exchange```, ```@Queue```, ```@Message``` that will allow you to quickly getting started.

<!--First defines your exchanges, then the queues that can be bound to some of those and then you can create some messages to handle your
RabbitMQ messages. See [Message Routing](#message-routing) below.-->

### Connection & initialization

This module supports only one connection at the same time.

By default the module will retry to connect after a connection error.
This behaviour is configurable.

We provide three decorators to create exchanges, queues and also route messages.
When the connection is ready the extension will find all classes with decorators and do all the work to get everything ready.

### Channels

Each connection can open several channels. Every operation on RabbitMQ occurs through channels.
You will be able to create them easily with the ```ChannelService```.

### Exchanges

Create them using the decorator provided or inject ```ExchangeService``` and use the ```factory()``` method.
The factory returns an ExchangeManager that will allow you to manage it. That's limit to asserting and checking basically for now.

### Queues

Create them using the decorator provided or inject ```QueueService``` and use the ```factory()``` method.
Like the exchange factory it will returns a ```QueueManager``` instance that will let you manage it.
It supports asserting, checking and consuming.


## Message routing

Each message sent on RabbitMQ is consumed by a queue.

You can decide to receive all the messages on your queue onMessage method.
That's a good option if you have only one type of message arriving on it.
You can also call your own dispatcher there.

It's also possible to receive plenty of different messages on the same queue.
Creating one class to handle each message is then a good choice.

This module allow you to link a RabbitMessage to your custom message class.

### Parameters:

* queue: the queue class where the message is consumed
* exchange: the exchange class
* routingKey: string or regex to match the routingKey of the message
* filter: an simple one level object with keys and values. Keys are the path on the RabbitMQ message and values could be
a string, number, boolean or RegExp.


## Using your module inside Hapiness application


### `yarn` or `npm` it in your `package.json`

```bash
$ npm install --save @hapiness/rabbitmq

or

$ yarn add @hapiness/rabbitmq
```

```javascript
"dependencies": {
    "@hapiness/core": "^1.0.0-rc.7",
    "@hapiness/rabbitmq": "^1.0.0-rc.7",
    //...
}
//...
```


### Importing `RabbitMQModule` from the library

This module provide an Hapiness extension for RabbitMQ.
To use it, simply register it during the ```bootstrap``` step of your project and provide the ```RabbitMQExt``` with its config

```javascript
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
                    host: 'localhost',
                    port: 5276,
                    vhost: 'my_vhost'
                    login: 'xxx',
                    password: 'xxxx'
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

```javascript
@Exchange({
    name: 'user.exchange',
    type: ExchangeType.Topic,
    // See options available: http://www.squaremobius.net/amqp.node/channel_api.html#channel_assertExchange
    options: {
        durable: true,
        autoDelete: false
    }
})
export class UserExchange extends ExchangeBase {}

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
export class UserQueue extends QueueBase implements OnMessage {

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
export class UserCreatedMessage extends MessageBase implements OnMessage {

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
* All other messages sent to the exchange with a routingKey mathing the pattern ```user.*``` or sent directly to the queue will be consumed by
the ```onMessage()``` method defined in the queue.


#### Using the services

 ```ConnectionService``` ```ChannelService``` ```ExchangeService``` ```QueueService```

```javascript

class FooProvider {

    constructor(private _channelService: ChannelService) {}

    // Upsert a channel by specifying a key to identify it
    // one key per channel.
    // The function returns a ChannelManager instance
    bar(): Observable<ChannelManager> {
    	this._myChannelManager = this._channelService.upsert({ key: 'publish' });
    }


    // Use the created channel
    foo() {
        // Use the manager to retrieve the channel instance
        const ch = this._myChannelManager.getChannel();

        // ... or retrieve it with the shortcut getChannel and your key
        const ch = this._channelService.getChannel('publish');

        // Use your channel like you will do with amqp.node
        ch.sendToQueue(...);
    }

}

```

[Back to top](#table-of-contents)

## Maintainers

<table>
    <tr>
        <td colspan="4" align="center"><a href="https://www.tadaweb.com"><img src="https://tadaweb.com/images/tadaweb/logo.png" width="117" alt="tadaweb" /></a></td>
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

Copyright (c) 2017 **Hapiness** Licensed under the [MIT license](https://github.com/hapinessjs/rabbitmq-module/blob/master/LICENSE.md).

[Back to top](#table-of-contents)
