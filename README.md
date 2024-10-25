# Redis-Duplex

PRIVATE PROJECT

```js
const { Instance, CommandBuilder } = require('.');

const instance = new Instance('poolName', {
  manager: 'ManagerName',
  user: 'userName'
}, {
  port: 6379,
  host: '',
  password: ''
})

// Use simple redis
instance.redis.set('key', 'value');

/**
 * DO NOT USE CLASSIC REDIS COMMANDS INTO SUB-REDIS INSTANCE
 * It may change sub-redis comportment
 */
// Use publisher
instance.publisher.subRedis.publish('channel', 'message');
// Use subscriber
instance.publisher.subRedis.subscribe('channel');

// Each command received (command received, is command successfully handled)
instance.on('command', (command, valid) => {
  console.log('[<] Command received', command, valid);
})

// Raw payload received
instance.on('message', (message) => console.log(message));

// Each command published
instance.on('publish', (command) => {
  console.log('[>] Command published', command);
})

// Create command
const command = new CommandBuilder()
  .generateCommandId() // Generate a unique command id (is automatically generated if not set)
  .setManager('ManagerName') // Set the manager name
  .generateKey() // Generate a unique key (useful for create a one-time-promise request)
  .setMethod('GET') // Set the method (GET, PUT)
  .setBroadcast() // Set user and manager to *
  .setResource('resource') // Set the resource
  .setUi({}) // Set the ui data to can be used in the dashboard
  .setUser('userName') // Set the user name
  .setCommand('command') // Set the command
  .setValue({}) // Set the value
  .injectInstance(instance) // Inject the instance for getting the manager and user name and use .duplicate() (use only to respond to a command)
  .useSelfManager() // Set same manager name as the instance (need use injectInstance before)
  .useSelfUser() // Set same user name as the instance (need use injectInstance before)
  /// End builder: those methods are not chainable
  .toJSON() // Return JSON Object to builder
  .toString() // Return JSON string to builder (useful for publish)
  .toStringFrom() // Return human readable string "(from) managerName and userName" (useful for logs)

// Publish command
instance.publisher.publish(command /* Put directly command builder instance */);
instance.publish(command); // Alias of instance.publisher.publish

// For raw publish
instance.publisher.subRedis.publish('channel', 'message');

// For listen message (instance of command builder, publisher instance)
const unsubscribeListener = instance.subscriber((incomingCommand, pub) => { // Or instance.subscriber.subscribe
  console.log('Command received on subscription', command);

  // You can use here .duplicate() to respond to the command
  const responseCommand = incomingCommand.duplicate().setValue('foo');

  // Use alias directly
  pub.publish(responseCommand);
  // Use long way
  instance.publish(responseCommand); // or instance.publisher.publish(responseCommand);
})

// Listen only command (filter and callback)
// Set true into user or manager to set same user or manager as the instance filter
const unsubscribeCommand = instance.command({ manager: 'proxy-manager', user: true, service: 'proxy' }, (incomingCommand, pub) => {
  const responseCommand = incomingCommand.duplicate().setValue('proxy');
  pub.publish(responseCommand);
}) // Or instance.subscriber.command

setTimeout(() => {
  // You can remove listener easily
  unsubscribeListener();
  unsubscribeCommand();
}, 1000000);
```
