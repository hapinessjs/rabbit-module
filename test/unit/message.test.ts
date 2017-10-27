import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import * as Message from '../../src/module/message';

import { ChannelMock } from '../mocks/Channel';
import { generateMessage } from '../mocks/Message';

@suite('- Unit Message')
export class MessageUnitTest {
    private ch: ChannelMock;
    private sendMessage;
    private decodeContent;

    before() {
        this.sendMessage = unit.spy(Message.sendMessage);
        this.decodeContent = unit.spy(Message.decodeJSONContent);
        this.ch = new ChannelMock();
        unit.spy(this.ch, 'publish');
        unit.spy(this.ch, 'sendToQueue');
    }

    after() {
        this.sendMessage = null;
        this.decodeContent = null;
        this.ch = null;
    }

    @test('- Should test sendMessage')
    testSend() {
        this.sendMessage(<any>this.ch, { hello: 'world ' }, { queue: 'test.queue' });
        this.sendMessage(<any>this.ch, { hello: 'world ' }, { queue: 'test.queue', json: 'xaxa', headers: false });
        this.sendMessage(<any>this.ch, Buffer.from('hello world'), { queue: 'test.queue' });
        this.sendMessage(<any>this.ch, Buffer.from('foo bar'), { queue: 'test.queue', headers: { json: true } });
        this.sendMessage(<any>this.ch, 'hello world', { queue: 'test.queue', json: false });
        this.sendMessage(<any>this.ch, Buffer.from('foo bar'), { exchange: 'test.exchange', headers: { json: true } });
        unit.number(this.ch.publish['callCount']).is(1);
        unit.number(this.ch.sendToQueue['callCount']).is(5);
    }

    @test('- Should test decodeContent')
    testDecodeContent() {
        const message1 = generateMessage(Buffer.from('{ foo: "baz }'), {}, false);
        const message2 = generateMessage(Buffer.from('hello world'), {}, false);
        const message3 = generateMessage(Buffer.from(''), {}, false);

        unit
            .exception(_ => {
                unit.when('Invalid json', this.decodeContent(message1));
            })
            .isInstanceOf(Error)
            .hasProperty('message', 'Cannot parse JSON message');

        unit
            .exception(_ => {
                unit.when('Invalid json', this.decodeContent(message2));
            })
            .isInstanceOf(Error)
            .hasProperty('message', 'Cannot parse JSON message');

        unit
            .exception(_ => {
                unit.when('Invalid json', this.decodeContent(message3));
            })
            .isInstanceOf(Error)
            .hasProperty('message', 'Cannot parse JSON message');

        unit
            .exception(_ => {
                unit.when('Invalid input', this.decodeContent('hello world'));
            })
            .isInstanceOf(Error)
            .hasProperty('message', 'Cannot decode invalid message');

        const message4 = generateMessage({ foo: 'bar' }, {}, false);
        message4.properties.headers.json = false;
        unit.object(this.decodeContent(message4)).is({ foo: 'bar' });
    }

    @test('- Should test sendMessage errors')
    testSendErrors() {
        const errors = [
            [() => unit.when('No channel', this.sendMessage(<any>this.ch, { hello: 'world ' })), 'Specify a queue or an exchange'],
            [() => unit.when('No channel', this.sendMessage(<any>null, { hello: 'world ' })), 'Cannot send a message without channel'],
            [() => unit.when('No message', this.sendMessage(<any>this.ch)), 'I will not send an empty message']
        ];

        errors.forEach(error => {
            unit
                .exception(error[0])
                .isInstanceOf(Error)
                .hasProperty('message', error[1]);
        });

        unit.number(this.ch.publish['callCount']).is(0);
        unit.number(this.ch.sendToQueue['callCount']).is(0);
    }
}
