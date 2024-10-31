import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { Instance, CommandBuilder } from '../src';

/**
 * @type {import('../src/Instance')}
 */
let instance;

beforeAll(() => {
  instance = new Instance('rd-test', {}, {
    host: 'localhost',
    port: 6379
  })

  return instance.waitToReady();
});

describe('🗝️ Filtering command', () => {
  test('Filtering by method GET', () => {
    const goodCommandGET = new CommandBuilder().setMethod('GET');
    const badCommandPUT = new CommandBuilder().setCommand('PUT');
    const badUnknownCommand = new CommandBuilder().setMethod('UNKNOWN');
    const badCaseSensitiveCommand = new CommandBuilder().setMethod('get');

    expect(instance.subscriber.suitable({ method: 'GET' }, goodCommandGET)).toBeTruthy();
    expect(instance.subscriber.suitable({ method: 'GET' }, badCommandPUT)).toBeFalsy();
    expect(instance.subscriber.suitable({ method: 'GET' }, badUnknownCommand)).toBeFalsy();
    expect(instance.subscriber.suitable({ method: 'GET' }, badCaseSensitiveCommand)).toBeFalsy();
  })

  test('Filtering by resource', () => {
    const goodCommandResource = new CommandBuilder().setResource('foo');
    const badCommandResource = new CommandBuilder().setResource('bar');

    expect(instance.subscriber.suitable({ resource: 'foo' }, goodCommandResource)).toBeTruthy();
    expect(instance.subscriber.suitable({ resource: 'foo' }, badCommandResource)).toBeFalsy();
  })

  test('Filtering by command', () => {
    const goodCommandCommand = new CommandBuilder().setCommand('request');
    const badCommandCommand = new CommandBuilder().setCommand('response');

    expect(instance.subscriber.suitable({ command: 'request' }, goodCommandCommand)).toBeTruthy();
    expect(instance.subscriber.suitable({ command: 'request' }, badCommandCommand)).toBeFalsy();
  })

  test('Filtering by key', () => {
    const goodManualKey = new CommandBuilder().setKey('foo');
    const badManualKey = new CommandBuilder().setKey('bar');
    const goodGeneratedKey = new CommandBuilder().generateKey();
    const badGeneratedKey = new CommandBuilder().generateKey();

    expect(instance.subscriber.suitable({ key: 'foo' }, goodManualKey)).toBeTruthy();
    expect(instance.subscriber.suitable({ key: goodGeneratedKey.key }, goodGeneratedKey)).toBeTruthy();
    expect(instance.subscriber.suitable({ key: 'foo' }, badManualKey)).toBeFalsy();
    expect(instance.subscriber.suitable({ key: goodGeneratedKey.key }, badGeneratedKey)).toBeFalsy();
  })

  test('Filtering by user', () => {
    instance.options.user = 'foo';

    const goodManualUser = new CommandBuilder().setUser('foo');
    const badManualUser = new CommandBuilder().setUser('bar');
    const goodInjectedUser = new CommandBuilder().injectInstance(instance).useSelfUser();
    const goodBroadcastUser = new CommandBuilder().setBroadcast();
    const goodEveryUser = new CommandBuilder().setUser('*');

    expect(instance.subscriber.suitable({ user: 'foo' }, goodManualUser)).toBeTruthy();
    expect(instance.subscriber.suitable({ user: 'foo' }, badManualUser)).toBeFalsy(); 
    expect(instance.subscriber.suitable({ user: 'foo' }, goodInjectedUser)).toBeTruthy();
    expect(instance.subscriber.suitable({ user: 'foo' }, goodBroadcastUser)).toBeTruthy();
    expect(instance.subscriber.suitable({ user: true }, goodManualUser)).toBeTruthy();
    expect(instance.subscriber.suitable({ user: true }, goodEveryUser)).toBeTruthy();
    expect(instance.subscriber.suitable({ user: true }, badManualUser)).toBeFalsy();
    expect(instance.subscriber.suitable({ user: 'foo' }, goodEveryUser)).toBeTruthy();

    instance.options.user = 'bar';

    const badInjectedUser = new CommandBuilder().injectInstance(instance).useSelfUser();

    instance.options.user = 'foo';

    expect(instance.subscriber.suitable({ user: 'foo' }, badInjectedUser)).toBeFalsy();
  })

  test('Filtering by manager', () => {
    instance.options.manager = 'foo';

    const goodManualManager = new CommandBuilder().setManager('foo');
    const badManualManager = new CommandBuilder().setManager('bar');
    const goodInjectedManager = new CommandBuilder().injectInstance(instance).useSelfManager();
    const goodBroadcastManager = new CommandBuilder().setBroadcast();

    expect(instance.subscriber.suitable({ manager: 'foo' }, goodManualManager)).toBeTruthy();
    expect(instance.subscriber.suitable({ manager: 'foo' }, badManualManager)).toBeFalsy(); 
    expect(instance.subscriber.suitable({ manager: 'foo' }, goodInjectedManager)).toBeTruthy();
    expect(instance.subscriber.suitable({ manager: 'foo' }, goodBroadcastManager)).toBeTruthy();
    expect(instance.subscriber.suitable({ manager: true }, goodManualManager)).toBeTruthy();
    expect(instance.subscriber.suitable({ manager: true }, goodBroadcastManager)).toBeTruthy();
    expect(instance.subscriber.suitable({ manager: true }, badManualManager)).toBeFalsy();


    instance.options.manager = 'bar';

    const badInjectedManager = new CommandBuilder().injectInstance(instance).useSelfManager();

    instance.options.manager = 'foo';

    expect(instance.subscriber.suitable({ manager: 'foo' }, badInjectedManager)).toBeFalsy();
  })
})

afterAll(() => {
  return instance.close();
});