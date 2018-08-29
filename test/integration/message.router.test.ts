import { test, suite } from 'mocha-typescript';
import * as unit from 'unit.js';

import { DefaultMessageRouter } from '../../src/module/message-router';
import { Observable } from 'rxjs/Observable';

import { ChannelMock } from '../mocks/Channel';
import {
    GeneratePdf,
    OrderCreatedMessage,
    UserCreatedMessage,
    UserEditedMessage,
    UserDeletedMessage,
    FallbackMessage,
    FallbackMessageOk,
    PokemonsMessage,
    FooMessage,
    UserCreatedActionMessage,
    UserCreatedActionNotMatchedMessage,
    BasketEditedMessage,
    ProfileEditedMessage
} from '../fixtures/Messages';
import { MayonaiseService } from '../fixtures/Services';
import { generateMessage } from '../mocks/Message';
import { extractMetadataByDecorator, Hapiness, HapinessModule, OnStart } from '@hapiness/core';
import { MessageDecoratorInterface } from '../../src/module/decorators';
import { RabbitMQModule, RabbitConnectionService, RabbitMQExt } from '../../src/module';
import { ConnectionManagerMock } from '../mocks/ConnectionManager';
import { Config } from '@hapiness/config';


@suite('- Integration MessageRouter')
export class MessageRouterUnitTest {
    private spyFindClass: any;
    private ch: ChannelMock;
    private messageRouter: DefaultMessageRouter;

    before() {
        this.messageRouter = new DefaultMessageRouter();
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

    @test('- Init module')
    testModule(done) {
        @HapinessModule({
            version: '1.0.0-rc.7.0',
            declarations: [
                GeneratePdf,
                OrderCreatedMessage,
                UserCreatedMessage,
                UserEditedMessage,
                UserDeletedMessage,
                FallbackMessage,
                FallbackMessageOk,
                PokemonsMessage,
                FooMessage,
                UserCreatedActionMessage,
                UserCreatedActionNotMatchedMessage,
                BasketEditedMessage,
                ProfileEditedMessage
            ],
            providers: [MayonaiseService],
            exports: [],
            imports: [RabbitMQModule]
        })
        class RabbitMQModuleTest implements OnStart {
            constructor(private _connectionService: RabbitConnectionService) {}

            onStart() {
                unit.object(this._connectionService).isInstanceOf(RabbitConnectionService);
                unit.object(this._connectionService.connectionManager);
                unit.string(this._connectionService.connectionManager.uri).is('amqp://localhost:5672');
                unit.object(this._connectionService.connection);
                done();
            }

            onError(err) {}
        }

        Hapiness.bootstrap(RabbitMQModuleTest, [
            RabbitMQExt
                .setConnectionManager(ConnectionManagerMock)
                .setMessageRouter(DefaultMessageRouter)
                .setConfig({
                    connection: Config.get('rabbitmq')
                })
        ]).catch(err => done(err));
    }

    @test('- Should test MessageRouter')
    testNew() {
        unit.object(this.messageRouter).isInstanceOf(DefaultMessageRouter);
        unit.function(this.messageRouter.registerMessage);
        unit.function(this.messageRouter.findClass);
        unit.function(this.messageRouter.getDispatcher);
        unit.function(this.messageRouter['_testValue']);
    }

    @test('- Should test register/dispatch/find')
    testRegister(done) {
        function registerMessageOptionsWrap(token) {
            return {
                token,
                data: extractMetadataByDecorator<MessageDecoratorInterface>(token, 'Message'),
                module: Hapiness['module']
            };
        }

        const userCreatedMessage = new UserCreatedMessage(new MayonaiseService());
        const userDeletedMessage = new UserDeletedMessage();
        const generatePdfMessage = new GeneratePdf();
        const orderCreatedMessage = new OrderCreatedMessage();
        const pokemonsMessage = new PokemonsMessage();
        const fallbackMessageOk = new FallbackMessageOk();
        const userEditedMessage = new UserEditedMessage(new MayonaiseService());
        const fooMessage = new FooMessage();
        const userCreatedActionMessage = new UserCreatedActionMessage();
        const basketEditedMessage = new BasketEditedMessage();
        const profileEditedMessage = new ProfileEditedMessage();

        const registerMessagesObservable = [];

        registerMessagesObservable.push(this.messageRouter.registerMessage(registerMessageOptionsWrap(UserDeletedMessage)));
        registerMessagesObservable.push(this.messageRouter.registerMessage(registerMessageOptionsWrap(BasketEditedMessage)));
        registerMessagesObservable.push(this.messageRouter.registerMessage(registerMessageOptionsWrap(ProfileEditedMessage)));
        registerMessagesObservable.push(this.messageRouter.registerMessage(registerMessageOptionsWrap(UserEditedMessage)));
        registerMessagesObservable.push(this.messageRouter.registerMessage(registerMessageOptionsWrap(FallbackMessageOk)));
        registerMessagesObservable.push(this.messageRouter.registerMessage(registerMessageOptionsWrap(OrderCreatedMessage)));
        registerMessagesObservable.push(this.messageRouter.registerMessage(registerMessageOptionsWrap(GeneratePdf)));
        registerMessagesObservable.push(this.messageRouter.registerMessage(registerMessageOptionsWrap(UserCreatedMessage)));
        registerMessagesObservable.push(this.messageRouter.registerMessage(registerMessageOptionsWrap(UserCreatedActionMessage)));
        registerMessagesObservable.push(this.messageRouter.registerMessage(registerMessageOptionsWrap(PokemonsMessage)));
        registerMessagesObservable.push(this.messageRouter.registerMessage(registerMessageOptionsWrap(FooMessage)));
        registerMessagesObservable.push(this.messageRouter.registerMessage(registerMessageOptionsWrap(UserCreatedActionNotMatchedMessage)));

        registerMessagesObservable.push(this.messageRouter.registerMessage(registerMessageOptionsWrap(FallbackMessage))
            .flatMap(() => Observable.throw(new Error('Cannot be here')))
            .catch(err => {
                if (err.message === 'Cannot be here') {
                    return Observable.throw(err);
                }

                unit.object(err).isInstanceOf(Error)
                .hasProperty('message', `Cannot register a message without an exchange or routingKey,
 filter or set is_fallback to true use your queue onMessage method instead`);
                return Observable.of(null);
            }));

        registerMessagesObservable.push(this.messageRouter.registerMessage(registerMessageOptionsWrap(<any>class InvalidMessage {}))
            .flatMap(() => Observable.throw(new Error('Cannot be here')))
            .catch(err => {
                if (err.message === 'Cannot be here') {
                    return err;
                }

                unit.object(err).isInstanceOf(Error)
                .hasProperty('message', 'Cannot register a message class without a queue');
                return Observable.of(null);
            }));

        Observable.forkJoin(registerMessagesObservable)
            .subscribe(() => {
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

                const message_basketEdited = generateMessage(
                    { basket_id: 8309, action: 'edited' }, { exchange: 'user.exchange', routingKey: 'basket' }, false);
                unit
                    .object(this.messageRouter.findClass(message_basketEdited))
                    .isInstanceOf(BasketEditedMessage)
                    .is(basketEditedMessage);

                const message_profileEdited_notFound = generateMessage(
                    { profile_id: 19237, action: 'edited' }, { exchange: 'user.exchange', routingKey: 'profile' }, false);
                unit
                    .value(this.messageRouter.findClass(message_profileEdited_notFound))
                    .is(null);

                const message_profileEdited = generateMessage(
                    { profile_id: 19237, action: 'edited', foo: 'bar' }, { exchange: 'user.exchange', routingKey: 'profile' }, false);
                unit
                    .object(this.messageRouter.findClass(message_profileEdited))
                    .isInstanceOf(ProfileEditedMessage)
                    .is(profileEditedMessage);

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

                const message_userCreated =
                    generateMessage({ user_id: 60936 }, { exchange: 'user.exchange', routingKey: 'user.created' }, false);
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

                const message_userDeleted =
                    generateMessage({ user_id: 2341 }, { exchange: 'user.exchange', routingKey: 'user.deleted' }, false);
                unit
                    .object(this.messageRouter.findClass(message_userDeleted))
                    .isInstanceOf(UserDeletedMessage)
                    .is(userDeletedMessage);

                const message_generatePdf = generateMessage(
                    { url: 'http://xxx.com/zzz.html', action: 'generate_pdf' },
                    { routingKey: 'worker', exchange: '' },
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

                const message_fallback = generateMessage({
                    reason: 'These are not the droid you are looking for'
                }, { routingKey: 'test.fallback' }, false);
                unit
                    .value(this.messageRouter.findClass(message_fallback))
                    .is(fallbackMessageOk);

                const message_NotFound = generateMessage(
                    { reason: 'These are not the droid you are looking for' },
                    { exchange: 'another.exchange' },
                    false
                );
                unit.value(this.messageRouter.findClass(message_NotFound)).is(null);

                const message_FindPokemon = generateMessage(
                    { action: 'pokemons_find', area: { lat: 0.234, long: 0.2345, radius: 5 } },
                    { routingKey: 'another.queue' },
                    false
                );
                unit
                    .object(this.messageRouter.findClass(message_FindPokemon))
                    .isInstanceOf(PokemonsMessage)
                    .is(pokemonsMessage);

                const message_FindPokemon_notFound = generateMessage(
                    { action: 'pokemons_find', area: { lat: 0.234, long: 0.2345, radius: 5 } },
                    { routingKey: 'another.exchange' },
                    false
                );
                unit
                    .value(this.messageRouter.findClass(message_FindPokemon_notFound))
                    .is(null);

                const pending = [];
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
                    unit.number(this.messageRouter.getDispatcher['callCount']).isGreaterThan(1);
                    unit.number(this.messageRouter.findClass['callCount']).isGreaterThan(15);
                    // unit.array(this.messageRouter.registerMessage['firstCall'].args).is([userDeletedMessage]);
                    unit.number(this.messageRouter['_testValue']['callCount']).isGreaterThan(50);
                    done();
                });
            }, err => done(err));
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
