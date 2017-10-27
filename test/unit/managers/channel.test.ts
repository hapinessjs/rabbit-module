import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import { ChannelManager } from '../../../src/module/managers';
import { RabbitConnectionMock } from '../../mocks/RabbitConnection';
import { ChannelMock } from '../../mocks/Channel';

@suite('- Unit Channel')
export class ChannelUnitTest {
    @test('- Should test instance')
    testCreate(done) {
        const instance = new ChannelManager(<any>new RabbitConnectionMock());
        unit.function(instance.create);
        unit.function(instance.prefetch);
        unit.function(instance.getChannel);
        const obs = instance.create();
        obs
            .flatMap(ch => {
                unit.spy(ch, 'prefetch');
                unit.object(ch).isInstanceOf(ChannelMock);
                unit.object(instance.getChannel()).is(ch);
                return instance.prefetch(1, true);
            })
            .subscribe(_ => {
                const ch = instance.getChannel();
                unit.array(ch.prefetch['firstCall'].args).is([1, true]);
                unit.object(instance.setChannel(ch)).isInstanceOf(ChannelManager);
                done();
            });
    }

    @test('- Test create with prefetch')
    testCreateWithPrefetch(done) {
        const instance = new ChannelManager(<any>new RabbitConnectionMock());
        const spy = unit.spy(instance, 'prefetch');
        instance.create(2).subscribe(_ => {
            unit.number(spy.callCount).is(1);
            unit.number(spy.firstCall.args[0]).is(2);
            done();
        });
    }

    @test('- Should test prefetch without channel')
    testPrefetch(done) {
        const instance = new ChannelManager(<any>new RabbitConnectionMock());
        const obs = instance.prefetch(10);
        obs.subscribe(
            _ => {
                done(new Error('Cannot be here'));
            },
            err => {
                unit
                    .object(err)
                    .isInstanceOf(Error)
                    .hasProperty('message', 'Create channel before setting prefetch');
                done();
            }
        );
    }
}
