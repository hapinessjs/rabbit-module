import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import * as Message from '../../src/Message';
import { sendMessage } from '../../src/Message';
import { Observable } from 'rxjs/Observable';

import { ChannelMock } from '../mocks/Channel';

@suite('- Unit Message')
class UnitMessageTest {
    private ch: ChannelMock;
    private sendMessage;

    before() {
        this.sendMessage = unit.spy(Message.sendMessage);
        this.ch = new ChannelMock();
        unit.spy(this.ch, 'publish');
        unit.spy(this.ch, 'sendToQueue');
    }

    after() {
        this.sendMessage = null;
        this.ch = null;
    }

    @test('- Should test sendMessage')
    testSend() {
        this.sendMessage(<any>this.ch, { hello: 'world '}, { queue: 'test.queue' });
        this.sendMessage(<any>this.ch, { hello: 'world '}, { queue: 'test.queue', json: 'xaxa', headers: false });
        this.sendMessage(<any>this.ch, Buffer.from('hello world'), { queue: 'test.queue' });
        this.sendMessage(<any>this.ch, Buffer.from('foo bar'), { queue: 'test.queue', headers: { json: true } });
        this.sendMessage(<any>this.ch, 'hello world', { queue: 'test.queue', json: false });
        this.sendMessage(<any>this.ch, Buffer.from('foo bar'), { exchange: 'test.exchange', headers: { json: true } });
        unit.number(this.ch.publish['callCount']).is(1);
        unit.number(this.ch.sendToQueue['callCount']).is(5);
    }

    @test('- Should test sendMessage errors')
    testSendErrors() {
        const errors = [
            [() => unit.when('No channel', this.sendMessage(<any>this.ch, { hello: 'world '})), 'Specify a queue or an exchange'],
            [() => unit.when('No channel', this.sendMessage(<any>null, { hello: 'world '})), 'Cannot send a message without channel'],
            [() => unit.when('No message', this.sendMessage(<any>this.ch)), 'I will not send an empty message']
        ];

        errors.forEach((error) => {
            unit.exception(error[0]).isInstanceOf(Error).hasProperty('message', error[1]);
        });

        unit.number(this.ch.publish['callCount']).is(0);
        unit.number(this.ch.sendToQueue['callCount']).is(0);
    }

}

