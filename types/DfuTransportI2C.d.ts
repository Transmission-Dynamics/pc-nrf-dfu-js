import { type EventEmitter } from "events";

declare class DfuTransportI2C extends EventEmitter {
  constructor(bus: string, addr: number, packetReceiveNotification?: number);
  test(): void;
}

export = DfuTransportI2C;
