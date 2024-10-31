const CommandBuilder = require('../builders/CommandBuilder');
const { version } = require('../../package.json');

class Subscriber {
  /**
   * @param {import('../Instance')} Instance
   */
  constructor(instance) {
    /**
     * @type {import('../Instance')} Instance
     */
    this.instance = instance;

    /**
     * @type {import('ioredis').Redis}
     */
    this.subRedis = this.instance.redis.duplicate();

    /**
     * @type {Set<CommandBuilder>}
     */
    this.commands = new Set();

    /**
     * @type {Set<import('../type').MiddlewareCallback>}
     */
    this.middlewares = new Set();
    /**
     * @type {Set<import('../type').SubscriptionCallback>}
     */
    this.subscriptions = new Set();

    this.subRedis.on('error', (error) => {
      console.error('Redis subscriber error', error);
    });

    this.command({ method: 'GET', resource: 'rd-version', command: 'request' }, (command, pub) => {
      const respCommand = command.duplicate()
        .setMethod('GET')
        .setCommand('response')
        .setResource('rd-version')
        .setValue({ version });
      pub.publish(respCommand);
    });

    this.subRedis.subscribe(this.instance.pool, (err) => {
      if (err) {
        console.error('Failed to subscribe:', err)
      }
    })

    this.subRedis.on('message', async (channel, message) => {
      if (channel === this.instance.pool) {
        this.instance.emit('message', message)
        let payload;
        try {
          payload = JSON.parse(message);
        } catch (e) {
          console.error('Failed to parse incoming command', e);
          return;
        }

        const command = new CommandBuilder(payload)
          .injectInstance(this.instance, { notChangeFrom: true })

        this.subscriptions.forEach((subscription) => {
          subscription(command);
        });

        for (const middleware of this.middlewares) {
          const result = await middleware(command, this.instance.publisher);
          if (!result) {
            return;
          }
        }

        let valid = false;
        this.commands.forEach(({ filter, callback }) => {
          if (this.suitable(filter, command)) {
            valid = true
            callback(command, this.instance.publisher);
          }
        });

        this.instance.emit('command', command, valid);
      }
    });

    this.subRedis.on('ready', () => {
      this.instance.checkCompatibility();
    });
  }

  /**
   * Register command & callback
   * @param {import('../type').CommandFilter} filter
   * @param {(import('../type').SubscriptionCallback} callback 
   * @returns {() => boolean} the command
   */
  command(filter, callback) {
    const command = { filter, callback };

    this.commands.add(command);

    return () => {
      this.commands.delete(command);
    }
  }

  /**
   * @param {import('../type').MiddlewareCallback} callback
   * @returns {(import('../type').MiddlewareCallback} unsubscribe function
   */
  middleware(callback) {
    this.middlewares.add(callback);

    return () => {
      return this.middlewares.delete(callback);
    }
  }

  /**
   * Subscribe to redis request channel
   * @param {import('../type').SubscriptionCallback} callback 
   * @returns {() => boolean} unsubscribe function
   */
  subscribe(callback) {
    this.subscriptions.add(callback);

    return () => {
      return this.subscriptions.delete(callback);
    }
  }

  /**
   * @param {import('../type').CommandFilter} filter 
   * @param {import('../builders/CommandBuilder')} command 
   */
  suitable(filter, command) {
    if (filter.method && filter.method !== command.method) {
      return false;
    }

    if (filter.resource && filter.resource !== command.resource) {
      return false;
    }

    if (filter.command && filter.command !== command.command) {
      return false;
    }

    if (filter.user === true) {
      filter.user = this.instance.options.user;
    }

    if (
        !filter.broadcast &&
        filter.user &&
        filter.user !== true &&
        filter.user !== '*' &&
        filter.user !== command.user &&
        this.instance.options.user !== command.user &&
        command.user !== '*'
      ) {
      return false;
    }

    if (filter.manager === true) {
      filter.manager = this.instance.options.manager;
    }

    if (
        !filter.broadcast &&
        filter.manager &&
        filter.manager !== '*' &&
        filter.manager !== command.manager &&
        this.instance.options.manager !== command.manager &&
        command.manager !== '*'
      ) {
      return false;
    }

    if (filter.key && filter.key !== command.key) {
      return false;
    }

    return true;
  }
}

module.exports = Subscriber;