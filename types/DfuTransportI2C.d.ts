import { type EventEmitter } from "events";

declare class DfuTransportI2C extends EventEmitter {
  constructor(bus: string, addr: number, packetReceiveNotification?: number);

  on(event: 'progress', listener: (prograss: {
    currentUpdateId: number;
    totalUpdates: number;
    part: 'init' | 'firmware';
    bytesSent: number;
    totalBytes: number;
  }) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
}

export = DfuTransportI2C;
