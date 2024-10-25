const EventEmitter = require('node:events');
const Redis = require('ioredis');
const semver = require('semver');
const debug = require('debug')('redis-duplex:instance');
const Subscriber = require('./events/Subscriber');
const Publisher = require('./events/Publisher');
const CommandBuilder = require('./builders/CommandBuilder');
const { version } = require('../package.json');

const COMPATIBILITY_HISTORY = {
  '1.0.0': '1.x',
  current() {
    return this[version];
  }
}

class Instance extends EventEmitter {
  /**
   * @param {string} pool - pool name
   * @param {import('./type').InstanceOptions} options 
   * @param {import('ioredis').RedisOptions} redisOptions 
   */
  constructor(pool, options, redisOptions) {
    super();
    /**
     * @type {string} pool name
     */
    this.pool = pool;
    /**
     * @type {import('./type').InstanceOptions
     */
    this.options = options;
    /**
     * @type {Redis.default} Redis instance
     */
    this.redis = new Redis(redisOptions);

    this.redis.on('error', (error) => {
      console.error('Redis error', error);
    });

    /**
     * @type {Subscriber}
     */
    this.subscriber = new Subscriber(this);
    /**
     * @type {Publisher}
     */
    this.publisher = new Publisher(this);
  }

  /**
   * Check compatibility with remote redis duplex
   * @returns {void}
   */
  checkCompatibility() {
    const command = new CommandBuilder()
      .setBroadcast()
      .setMethod('GET')
      .setResource('rd-version')
      .setCommand('request')
      .generateKey();

    const removeCommand = this.command({ method: 'GET', resource: 'rd-version', key: command.key, command: 'response' }, (command) => {
      if (!command.value?.version) return;
      debug('Receive remote version: (%s) (version: %s)', command.toStringFrom(), command.value.version);
      if (semver.satisfies(COMPATIBILITY_HISTORY.current(), command.value.version)) {
        console.warn('Redis Duplex version mismatch with (%s). Current compatibility version is %s, but the remote version is %s', command.toStringFrom(), COMPATIBILITY_HISTORY.current(), command.value.version);
      }
    });

    this.publish(command);

    setTimeout(() => {
      removeCommand()
    }, 1000 * 60 * 1);
  }

  /**
   * @returns {import('./events/Subscriber')['command']}
   */
  get command() {
    return this.subscriber.command.bind(this.subscriber);
  }

  /**
   * @returns {import('./events/Subscriber')['subscribe']}
   */
  get subscribe() {
    return this.subscriber.subscribe.bind(this.subscriber);
  }

  /**
   * @returns {import('./events/Publisher')['publish']}
   */
  get publish() {
    return this.publisher.publish.bind(this.publisher);
  }

  /**
   * One promise request to redis
   * @param {import('./builders/CommandBuilder')} command
   */
  async request(command) {
    if (!(command instanceof CommandBuilder)) {
      throw new TypeError('command must be an instance of CommandBuilder');
    }

    command.generateKey();

    return new Promise((resolve, reject) => {
      let timeout;
      const unsubscribe = this.subscribe((incomingCommand) => {
        console.log('REQUEST', incomingCommand);
        if (command.commandId == incomingCommand.commandId) {
          return;
        }
        if (incomingCommand.key == command.key) {
          resolve(incomingCommand);
          unsubscribe();
          clearTimeout(timeout);
        }
      });

      timeout = setTimeout(() => {
        const err = new Error('Request timeout');
        err.command = command;
        err.key = command.key;
        err.code = 'ETIMEDOUT';
        reject(err);
        unsubscribe();
      }, 1000 * 60 * 5); 

      this.publish(command);
    });
  }
}

module.exports = Instance;