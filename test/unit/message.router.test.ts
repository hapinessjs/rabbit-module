import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import { MessageRouter } from '../../src/module/message-router';
import { Observable } from 'rxjs/Observable';

import { ChannelMock } from '../mocks/Channel';
import {
    GeneratePdf,
    OrderCreatedMessage,
    UserCreatedMessage,
    UserEditedMessage,
    UserDeletedMessage,
    FallbackMessage,
    PokemonsMessage,
    FooMessage,
    UserCreatedActionMessage,
    UserCreatedActionNotMatchedMessage
} from '../fixtures/Messages';
import { MayonaiseService } from '../fixtures/Services';
import { generateMessage } from '../mocks/Message';

@suite('- Unit MessageRouter')
export class MessageRouterUnitTest {
    private spyFindClass: any;
    private ch: ChannelMock;
    private messageRouter: MessageRouter;

    before() {
        this.messageRouter = new MessageRouter();
        this.ch = new ChannelMock();
        unit.spy(this.messageRouter, 'getDispatcher');
        this.spyFindClass = unit.spy(this.messageRouter, 'findClass');
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
        unit.function(this.messageRouter.getDispatcher);
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
        const userEditedMessage = new UserEditedMessage(new MayonaiseService());
        const fooMessage = new FooMessage();
        const userCreatedActionMessage = new UserCreatedActionMessage();

        this.messageRouter.registerMessage(userDeletedMessage);
        this.messageRouter.registerMessage(userEditedMessage);
        this.messageRouter.registerMessage(orderCreatedMessage);
        this.messageRouter.registerMessage(generatePdfMessage);
        this.messageRouter.registerMessage(userCreatedMessage);
        this.messageRouter.registerMessage(userCreatedActionMessage);
        this.messageRouter.registerMessage(pokemonsMessage);
        this.messageRouter.registerMessage(fooMessage);
        this.messageRouter.registerMessage(new UserCreatedActionNotMatchedMessage());

        unit
            .exception(_ => {
                unit.when('Invalid message', this.messageRouter.registerMessage(fallbackMessage));
            })
            .isInstanceOf(Error)
            .hasProperty('message', `Cannot register a message without an exchange or routingKey or
 filter, use your queue onMessage method instead`);

        unit
            .exception(_ => {
                unit.when('Invalid message', this.messageRouter.registerMessage(new (<any>class InvalidMessage {})()));
            })
            .isInstanceOf(Error)
            .hasProperty('message', 'Cannot register a message class without a queue');

        const message_fooMessage = generateMessage({ user_id: 4028, action: 'test' }, { exchange: 'foo.exchange' }, false);
        unit
            .object(this.messageRouter.findClass(message_fooMessage))
            .isInstanceOf(FooMessage)
            .is(fooMessage);

        const message_fooMessageRoutingKey = generateMessage({ user_id: 5678, action: 'test' },
            { exchange: 'foo.exchange', routingKey: 'bar' }, false);
        unit
            .value(this.messageRouter.findClass(message_fooMessageRoutingKey))
            .is(null);

        const message_userEdited = generateMessage(
            { user_id: 4028, action: 'edited' }, { exchange: 'user.exchange', routingKey: 'user' }, false);
        unit
            .object(this.messageRouter.findClass(message_userEdited))
            .isInstanceOf(UserEditedMessage)
            .is(userEditedMessage);

        const message_userExchangeRoutingKeyWithoutAction = generateMessage(
            { user_id: 4028 }, { exchange: 'user.exchange', routingKey: 'user' }, false);
        unit.value(this.messageRouter.findClass(message_userExchangeRoutingKeyWithoutAction)).is(null);

        const message_userExchangeWithoutRoutingKey = generateMessage(
            { user_id: 5678 }, { exchange: 'user.exchange' }, false);
        unit.value(this.messageRouter.findClass(message_userExchangeWithoutRoutingKey)).is(null);

        const message_userCreated = generateMessage({ user_id: 60936 }, { exchange: 'user.exchange', routingKey: 'user.created' }, false);
        unit
            .object(this.messageRouter.findClass(message_userCreated))
            .isInstanceOf(UserCreatedMessage)
            .is(userCreatedMessage);

            const message_userCreatedAction = generateMessage({ user_id: 60936, action: 'special' },
                { exchange: 'user.exchange', routingKey: 'user.created' }, false);
        unit
            .object(this.messageRouter.findClass(message_userCreatedAction))
            .isInstanceOf(UserCreatedActionMessage)
            .is(userCreatedActionMessage);

        const message_userDeleted = generateMessage({ user_id: 2341 }, { exchange: 'user.exchange', routingKey: 'user.deleted' }, false);
        unit
            .object(this.messageRouter.findClass(message_userDeleted))
            .isInstanceOf(UserDeletedMessage)
            .is(userDeletedMessage);

        const message_generatePdf = generateMessage(
            { url: 'http://xxx.com/zzz.html', action: 'generate_pdf' },
            { exchange: 'worker', routingKey: '' },
            false
        );
        unit
            .object(this.messageRouter.findClass(message_generatePdf))
            .isInstanceOf(GeneratePdf)
            .is(generatePdfMessage);

        const message_orderCreated = generateMessage(
            { user_id: 3445, order_id: 238109 },
            { exchange: 'another.exchange', routingKey: 'order.created' }
        );
        unit
            .object(this.messageRouter.findClass(message_orderCreated))
            .isInstanceOf(OrderCreatedMessage)
            .is(orderCreatedMessage);

        const message_fallback = generateMessage({ reason: 'These are not the droid you are looking for' }, { exchange: 'worker' }, false);
        unit
            .value(this.messageRouter.findClass(message_fallback))
            .is(null);

        const message_NotFound = generateMessage(
            { reason: 'These are not the droid you are looking for' },
            { exchange: 'another.exchange' },
            false
        );
        unit.value(this.messageRouter.findClass(message_NotFound)).is(null);

        const message_FindPokemon = generateMessage(
            { action: 'pokemons_find', area: { lat: 0.234, long: 0.2345, radius: 5 } },
            { exchange: 'another.exchange' },
            false
        );
        unit
            .object(this.messageRouter.findClass(message_FindPokemon))
            .isInstanceOf(PokemonsMessage)
            .is(pokemonsMessage);

        const pending = [];
        pending.push(
            this.messageRouter.getDispatcher(<any>this.ch, message_fallback).map(dispatcher => {
                unit.value(dispatcher).is(null);
            })
        );

        pending.push(
            this.messageRouter.getDispatcher(<any>this.ch, message_orderCreated).switchMap(dispatcher => {
                unit.function(dispatcher);
                return dispatcher();
            })
            .map(messageResult => {
                unit.object(messageResult).is({ reject: true });
            })
        );

        pending.push(
            this.messageRouter
                .getDispatcher(<any>this.ch, <any>null)
                .catch(err => {
                    unit
                        .object(err)
                        .isInstanceOf(Error)
                        .hasProperty('message', 'Invalid or empty message');
                    return Observable.of('ok');
                })
                .map(_ => {
                    unit.value(_).is('ok');
                })
        );

        pending.push(
            this.messageRouter.getDispatcher(<any>this.ch, message_generatePdf).switchMap(dispatcher => {
                unit.function(dispatcher);
                return dispatcher();
            })
            .map(messageResult => {
                unit.object(messageResult).is({ reject: true, requeue: true });
            })
        );

        pending.push(
            this.messageRouter.getDispatcher(<any>this.ch, message_NotFound).catch(err => {
                unit
                    .object(err)
                    .isInstanceOf(Error)
                    .hasProperty('code', 'MESSAGE_CLASS_NOT_FOUND');
                return Observable.of(null);
            })
        );

        Observable.forkJoin(pending).subscribe(_ => {
            unit.number(this.messageRouter.getDispatcher['callCount']).is(5);
            unit.number(this.messageRouter.findClass['callCount']).is(17);
            unit.array(this.messageRouter.registerMessage['firstCall'].args).is([userDeletedMessage]);
            unit.number(this.messageRouter['_testValue']['callCount']).is(120);
            done();
        });
    }

    @test('- Should throw when invalid message class is provided to process() method')
    testProcessInvalidMessageClass(done) {
        this.spyFindClass.restore();
        const stub = unit.stub(this.messageRouter, 'findClass');
        stub.returns({});
        const obs = this.messageRouter.getDispatcher(
            <any>this.ch,
            generateMessage({ error: 'invalid_message_class' }),
        );
        obs.subscribe(
            _ => done(new Error('Cannot be here')),
            err => {
                unit
                    .object(err)
                    .isInstanceOf(Error)
                    .hasProperty('message', 'Message class Object should implement onMessage() method');
                stub.restore();
                done();
            }
        );
    }
}
