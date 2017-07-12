import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import * as Message from '../../src/Message';
import { sendMessage } from '../../src/Message';
import { MessageRouter } from '../../src/MessageRouter';
import { Observable } from 'rxjs/Observable';

import { ChannelMock } from '../mocks/Channel';
import { GeneratePdf, OrderCreatedMessage, UserCreatedMessage, UserDeletedMessage, FallbackMessage, PokemonsMessage } from '../fixtures/Messages';
import { MayonaiseService } from '../fixtures/Services';
import { generateMessage } from "../mocks/Message";

@suite('- Unit MessageRouter')
class UnitMessageRouter {
    private ch: ChannelMock;
    private sendMessage;
    private messageRouter: MessageRouter;

    before() {
        this.messageRouter = new MessageRouter();
        this.ch = new ChannelMock();
        unit.spy(this.messageRouter, 'dispatch');
        unit.spy(this.messageRouter, 'findClass');
        unit.spy(this.messageRouter, 'registerMessage');
        unit.spy(this.messageRouter, '_testValue');
    }

    after() {
        this.messageRouter = null;
        this.ch = null;
    }

    @test('- Should test MessageRouter')
    testNew() {
        unit.object(this.messageRouter).isInstanceOf(MessageRouter);
        unit.function(this.messageRouter.registerMessage);
        unit.function(this.messageRouter.findClass);
        unit.function(this.messageRouter.dispatch);
        unit.function(this.messageRouter['_testValue']);
    }

    @test('- Should test register/dispatch/find')
    testRegister(done) {
        const userCreatedMessage = new UserCreatedMessage(new MayonaiseService());
        const userDeletedMessage = new UserDeletedMessage();
        const generatePdfMessage = new GeneratePdf();
        const orderCreatedMessage = new OrderCreatedMessage();
        const pokemonsMessage = new PokemonsMessage();
        const fallbackMessage = new FallbackMessage();

        this.messageRouter.registerMessage(userDeletedMessage);
        this.messageRouter.registerMessage(fallbackMessage);
        this.messageRouter.registerMessage(orderCreatedMessage);
        this.messageRouter.registerMessage(generatePdfMessage);
        this.messageRouter.registerMessage(userCreatedMessage);
        this.messageRouter.registerMessage(pokemonsMessage);

        const message_userCreated = generateMessage({ user_id: 60936 }, { exchange: 'user.exchange', routingKey: 'user.created' }, false);
        unit.object(this.messageRouter.findClass(message_userCreated)).isInstanceOf(UserCreatedMessage).is(userCreatedMessage);

        const message_userDeleted = generateMessage({ user_id: 2341 }, { exchange: 'user.exchange', routingKey: 'user.deleted' }, false);
        unit.object(this.messageRouter.findClass(message_userDeleted)).isInstanceOf(UserDeletedMessage).is(userDeletedMessage);

        const message_generatePdf = generateMessage({ url: 'http://xxx.com/zzz.html', action: 'generate_pdf' }, { exchange: 'worker', routingKey: '' }, false);
        unit.object(this.messageRouter.findClass(message_generatePdf)).isInstanceOf(GeneratePdf).is(generatePdfMessage);

        const message_orderCreated = generateMessage(
            { user_id: 3445, order_id: 238109 },
            { exchange: 'another.exchange', routingKey: 'order.created' });
        unit.object(this.messageRouter.findClass(message_orderCreated)).isInstanceOf(OrderCreatedMessage).is(orderCreatedMessage);

        const message_fallback = generateMessage({ reason: 'These are not the droid you are looking for' }, { exchange: 'worker' }, false);
        unit.object(this.messageRouter.findClass(message_fallback)).isInstanceOf(FallbackMessage).is(fallbackMessage);

        const message_NotFound = generateMessage({ reason: 'These are not the droid you are looking for' }, { exchange: 'another.exchange' }, false);
        unit.value(this.messageRouter.findClass(message_NotFound)).is(null);

        const message_FindPokemon = generateMessage({ action: 'pokemons_find', area: { lat: 0.234, long: 0.2345, radius: 5 } }, { exchange: 'another.exchange' }, false);
        unit.object(this.messageRouter.findClass(message_FindPokemon)).isInstanceOf(PokemonsMessage).is(pokemonsMessage);

        const pending = [];
        pending.push(this.messageRouter.dispatch(<any>this.ch, message_fallback)
            .map(messageResult => {
                unit.bool(messageResult).isFalse();
            }));

        pending.push(this.messageRouter.dispatch(<any>this.ch, message_orderCreated)
            .map(messageResult => {
                unit.object(messageResult).is({ reject: true });
            }));

        pending.push(this.messageRouter.dispatch(<any>this.ch, <any>null)
            .catch(err => {
                unit.object(err).isInstanceOf(Error).hasProperty('message', 'Invalid or empty message');
                return Observable.of('ok');
            })
            .map(_ => {
                unit.value(_).is('ok');
            }));

        pending.push(this.messageRouter.dispatch(<any>this.ch, message_generatePdf)
            .map(messageResult => {
                unit.object(messageResult).is({ reject: true, requeue: true });
            }));

        pending.push(
            this.messageRouter
                .dispatch(<any>this.ch, message_NotFound)
                .catch(err => {
                    unit.object(err).isInstanceOf(Error).hasProperty('code', 'MESSAGE_CLASS_NOT_FOUND');
                    return Observable.of(null);
                })
        );

        Observable.forkJoin(pending).subscribe(_ => {
            done();
        });

    }

}

