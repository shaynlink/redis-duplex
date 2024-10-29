const { randomUUID } = require('node:crypto');

class CommandBuilder {
  #instance;
  constructor(payload, instance) {
    this.method = payload?.method;
    this.resource = payload?.resource;
    this.user = payload?.user;
    this.manager = payload?.manager;
    this.command = payload?.command;
    this.key = payload?.key;
    this.ui = payload?.ui;
    this.from = payload?.from;
    this.value = payload?.value;
    this.commandId = payload?.commandId;

    if (!this.commandId) {
      this.generateCommandId();
    }

    if (instance) {
      this.injectInstance(instance);
    }
  }

  get instance() {
    return this.#instance;
  }

  /**
   * 
   * @param {import('../Instance')} instance 
   * @returns 
   */
  injectInstance(instance, options) {
    options ??= {};
    options.notChangeFrom ??= false;

    this.#instance = instance;

    if (!options.notChangeFrom) {
      this.from = {
        user: instance.options.user,
        manager: instance.options.manager,
      };
    }
    return this;
  }

  /**
   * @param {import('../type').CommandFilter['method']} method 
   * @returns {this}
   */
  setMethod(method) {
    this.method = method;
    return this;
  }

  /**
   * @param {import('../type').CommandFilter['resource']} method 
   * @returns {this}
   */
  setResource(resource) {
    this.resource = resource;
    return this;
  }

  setUser(user) {
    this.user = user;
    return this;
  }

  useSelfUser() {
    this.setUser(this.instance?.options?.user);
    return this;
  }

  setManager(manager) {
    this.manager = manager;
    return this;
  }

  useSelfManager() {
    this.manager = this.instance?.options?.manager;
    return this;
  }

  setValue(value) {
    this.value = value;
    return this;
  }

  setKey(key) {
    this.key = key;
    return this;
  }

  generateKey() {
    this.setKey(randomUUID());
    return this;
  }

  generateCommandId() {
    this.commandId = randomUUID();
    return this;
  }

  setUi(ui) {
    this.ui = ui;
    return this;
  }
  
  setCommand(command) {
    this.command = command;
    return this;
  }

    setBroadcast() {
    this.user = '*';
    this.manager = '*';
    return this;
  }

  duplicate() {
    if (!this.instance) {
      throw new Error('Instance not injected');
    }

    return new CommandBuilder()
      .setUser(this.from.user)
      .setManager(this.from.manager)
      .injectInstance(this.instance)
      .setKey(this.key)
      .generateCommandId();
  }
  
  toJSON() {
    return {
      method: this.method,
      command: this.command,
      resource: this.resource,
      user: this.user,
      value: this.value,
      ui: this.ui,
      manager: this.manager,
      key: this.key,
      pool: this.pool,
      from: this.from,
      value: this.value,
      commandId: this.commandId,
    }
  }

  toStringFrom() {
    return `user: ${this.from?.user}, manager: ${this.from?.manager}`;
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  [Symbol.toPrimitive](hint) {
    return this.toJSON();
  }
}

module.exports = CommandBuilder;