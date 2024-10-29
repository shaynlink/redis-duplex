const { randomUUID } = require('node:crypto');

class Session {
  /**
   * @param {import('./Instance')} instance 
   * @param {string} name 
   * @param {boolean} isMaster 
   */
  constructor(instance, name, isMaster) {
    this.instance = instance;
    this.name = name;
    this.isMaster = isMaster;
    this.id = randomUUID();
    this.masterId = null;
    this.pingRate = 1000 * 60 * 10;
    this.isConnected = this.isMaster;

    if (this.isMaster) {
      this.masterId = this.id;
      this.handleMasterConnectionManager();
    } else {
      this.handleSlaveConnectionManager();
    }

    this.hooksBeforeJoin = new Set();
    this.hooksAfterJoin = new Set();
    this.hooksBeforeLeave = new Set();
    this.hooksAfterJoin = new Set();

    this.clients = new Map();
  }

  get isSlave() {
    return !this.isMaster;
  }

  get pingRateTimeout() {
    return this.pingRate * 2;
  }

  hookBeforeJoin(callback) {
    this.hooksBeforeJoin.add(callback);
    return () => {
      this.hooksBeforeJoin.delete(callback);
    }
  }

  hookAfterJoin(callback) {
    this.hooksAfterJoin.add(callback);
    return () => {
      this.hooksAfterJoin.delete(callback);
    }
  }

  hookBeforeLeave(callback) {
    this.hooksBeforeLeave.add(callback);
    return () => {
      this.hooksBeforeLeave.delete(callback);
    }
  }

  hookAfterLeave(callback) {
    this.hooksAfterLeave.add(callback);
    return () => {
      this.hooksAfterLeave.delete(callback);
    }
  }

  async join() {
    if (this.isMaster) {
      throw new Error('Master session cannot join');
    }

    const result = await this.instance.request(
      new CommandBuilder()
        .injectInstance(this)
        .setBroadcast()
        .setMethod('GET')
        .setResource('session')
        .setCommand('join')
        .setValue({ name: this.name, id: this.id })
    )

    if (result.value?.success) {
      session.masterId = result.value.masterId;
      session.pingRate = result.value.pingRate;
      session.isConnected = true;
    } else {
      const error = new Error('Failed to join session');
      error.code = result.value.error;
      throw error;
    }
  }

  handleConnectionManager() {
    this.instance.subscribe({ broadcast: true, resource: 'session', command: 'join' }, async (command, pub) => {
      if (!command.value && !command.value.id && command.value.name !== this.name) {
        return;
      }

      if (this.clients.has(command.value.id)) {
        command
          .duplicate()
          .setMethod('GET')
          .setValue({ success: false, error: 'ALREADY_JOINED' });

        pub.publish(command);
        return;
      }

      let suite = true
      for (const hook of this.hooksBeforeJoin) {
        await hook(this, command, (result) => {
          if (result === false) {
            suite = false;
          }
        });
        if (!suite) {
          return;
        }
      }

      this.clients.set(command.value.id, {
        command,
        lastPing: Date.now(),
        id: command.value.id,
      });

      command
        .duplicate()
        .setMethod('GET')
        .setValue({ id: this.id, masterId: this.masterId, success: true, pingRate: this.pingRate });

      pub.publish(command);

      for (const hook of this.hooksAfterJoin) {
        hook(this, command);
      }
    });
  }
}

module.exports = Session;