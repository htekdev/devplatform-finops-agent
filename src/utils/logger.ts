/**
 * Simple logger with configurable log levels
 */

import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'debug':
        return chalk.gray(`${prefix} ${message}`);
      case 'info':
        return chalk.blue(`${prefix} ${message}`);
      case 'warn':
        return chalk.yellow(`${prefix} ${message}`);
      case 'error':
        return chalk.red(`${prefix} ${message}`);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

/**
 * Global logger instance
 */
let globalLogger: Logger | null = null;

/**
 * Initialize the global logger
 */
export function initLogger(level: LogLevel = 'info'): Logger {
  globalLogger = new Logger(level);
  return globalLogger;
}

/**
 * Get the global logger instance
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    // Auto-initialize with default level if not explicitly initialized
    globalLogger = new Logger('info');
  }
  return globalLogger;
}
