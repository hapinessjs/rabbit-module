import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import { ChannelManager, ChannelStore } from '../../../src/module/managers';
import { ConnectionManagerMock } from '../../mocks/ConnectionManager';
// import { ChannelMock } from '../../mocks/Channel';

@suite('- Unit ChannelStore')
export class ChannelStoreUnitTest {
    private channelStore: ChannelStore;

    before() {
        this.channelStore = new ChannelStore(new ConnectionManagerMock());
    }

    @test('- Test create')
    testCreate(done) {
        this.channelStore.create()
            .do(ch => {
                unit.object(ch).isInstanceOf(ChannelManager);
            })
            .flatMap(() => this.channelStore.create()) // create to trigger if case
            .do(ch => {
                unit.object(ch).isInstanceOf(ChannelManager);
            })
            .subscribe(() => done(), err => done(err));
    }

    @test('- Test upsert')
    testUpsert(done) {
        this.channelStore.upsert()
        .do(ch => {
            unit.object(ch).isInstanceOf(ChannelManager);
        })
        .subscribe(() => done(), err => done(err));
    }

    @test('- Test getChannel')
    testGetChannel() {
        const ch = this.channelStore.getChannel();
        unit.value(ch).is(null);
    }
}
