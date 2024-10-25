import Publisher from './events/Publisher';
import CommandBuilder from './builders/CommandBuilder';

export interface InstanceOptions {
  service?: string;
  manager?: string;
  user?: string;
}

export interface CommandFilter {
  method?: ('GET' | 'PUT')?;
  resource?: string?;
  user?: string?;
  manager?: string?;
  command?: string?;
  service?: string?;
  key?: string?;
}

export interface  SubscriptionCallback {
  (command: CommandBuilder, pub: Publisher): void;
}
