import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import { ChannelManager } from '../../../src/module/managers';
import { ConnectionManagerMock } from '../../mocks/ConnectionManager';
import { ChannelMock } from '../../mocks/Channel';
import { Observable } from 'rxjs';

@suite('- Unit Channel')
export class ChannelUnitTest {
    @test('- Should test instance')
    testCreate(done) {
        const instance = new ChannelManager(<any>new ConnectionManagerMock());
        unit.function(instance.create);
        unit.function(instance.setPrefetch);
        unit.function(instance.getChannel);
        unit.function(instance.canCreateChannel);
        const obs = instance.create();
        obs
            .flatMap(ch => {
                unit.spy(ch, 'prefetch');
                unit.object(ch).isInstanceOf(ChannelMock);
                unit.object(instance.getChannel()).is(ch);
                return instance.setPrefetch(1, true);
            })
            .subscribe(_ => {
                const ch = instance.getChannel();
                unit.array(ch.prefetch['firstCall'].args).is([1, true]);
                unit.object(instance.setChannel(ch)).isInstanceOf(ChannelManager);
                unit.bool(instance.canCreateChannel()).isTrue();
                done();
            });
    }

    @test('- Test create with prefetch')
    testCreateWithPrefetch(done) {
        const instance = new ChannelManager(<any>new ConnectionManagerMock(), 2, true);
        const spy = unit.spy(instance, 'setPrefetch');
        instance.create().subscribe(_ => {
            unit.number(spy.callCount).is(1);
            unit.number(spy.firstCall.args[0]).is(2);
            unit.number(instance.prefetch).is(2);
            unit.bool(instance.global).isTrue();
            done();
        });
    }

    @test('- Should test prefetch without channel')
    testPrefetch(done) {
        const instance = new ChannelManager(<any>new ConnectionManagerMock());
        const obs = instance.setPrefetch(10);
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

    @test('- Should test channel error')
    testChannelError(done) {
        const instance = new ChannelManager(<any>new ConnectionManagerMock());
        const spyCreate = unit.spy(instance, 'create');
        const spyEmit = unit.spy(instance, 'emit');
        instance.create()
            .subscribe(() => {
                instance.getChannel().emit('error', new Error('Channel closed by server'));
                instance.getChannel().emit('close');
                instance.getChannel().emit('error', new Error('Channel closed by server'));
                setTimeout(() => {
                    unit.number(spyEmit.callCount).is(3);
                    unit.number(spyCreate.callCount).is(2);
                    done();
                }, 1000);
            }, err => done(err));
    }

    @test('- Should test channel error, cannot reconnect')
    testChannelError2(done) {
        const instance = new ChannelManager(<any>new ConnectionManagerMock());
        instance.create()
            .subscribe(() => {
                unit.stub(instance, 'create').returns(Observable.throw(new Error('Cannot create channel')));
                instance.on('error', err => {
                    unit.object(err).isInstanceOf(Error).hasProperty('message', 'Cannot create channel');
                    done();
                });
                instance.getChannel().emit('error', new Error('Channel closed by server'));
            }, err => done(err));
    }
}
