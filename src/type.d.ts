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

export type SubscriptionCallback = (command: CommandBuilder, pub: Publisher) => void;
export type MiddlewareCallback = (command: CommandBuilder, pub: Publisher, next: () => void) => void;