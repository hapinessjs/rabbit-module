import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import { Observable } from 'rxjs/Observable';

import { ChannelManager } from '../../../src/managers/ChannelManager';
import { RabbitConnectionMock } from '../../mocks/RabbitConnection';
import { ChannelMock } from '../../mocks/Channel';
import * as bluebird from 'bluebird';


@suite('- Unit Channel')
class ConnectTest {

    @test('- Should test with exchange as options')
    testCreate(done) {
        const instance = new ChannelManager(<any>new RabbitConnectionMock());
        unit.function(instance.create);
        unit.function(instance.prefetch);
        unit.function(instance.getChannel);
        const obs = instance.create();
        obs.flatMap(ch => {
            unit.spy(ch, 'prefetch');
            unit.object(ch).isInstanceOf(ChannelMock);
            unit.object(instance.getChannel()).is(ch);
            return instance.prefetch(1, true);
        })
        .subscribe(_ => {
            const ch = instance.getChannel();
            unit.array(ch.prefetch['firstCall'].args).is([1, true]);
            done();
        });
    }

    @test('- Should test prefetch without channel')
    testPrefetch(done) {
        const instance = new ChannelManager(<any>new RabbitConnectionMock());
        const obs = instance.prefetch(10);
        obs.subscribe(_ => {
            done(new Error('Cannot be here'));
        }, err => {
            unit.object(err).isInstanceOf(Error).hasProperty('message', 'Create channel before setting prefetch');
            done();
        });
    }

}

