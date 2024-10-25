class Publisher {
  /**
   * @param {import('../Instance')} instance 
   */
  constructor(instance) {
    /**
     * @type {import('../Instance')}
     */
    this.instance = instance;

    /**
     * @type {import('ioredis').Redis}
     */
    this.subRedis = this.instance.redis.duplicate();

    this.subRedis.on('ready', () => {
      console.log('Redis publisher ready');
    })

    this.subRedis.on('error', (error) => {
      console.error('Redis publisher error', error);
    });
  }

  /**
   * Command to publish
   * @param {import('../builders/CommandBuilder')} command
   * @returns {Promise<number>}
   */
  publish(command) {
    command.injectInstance(this.instance);
    this.instance.emit('publish', command);
    return this.subRedis.publish(this.instance.pool, command.toString());
  }
}

module.exports = Publisher;
