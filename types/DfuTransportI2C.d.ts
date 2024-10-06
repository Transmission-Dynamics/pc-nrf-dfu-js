import { type EventEmitter } from "events";
import { type DfuProgressUpdate } from "@transmission-dynamics/pc-nrf-dfu-js";

declare class DfuTransportI2C extends EventEmitter {
  constructor(bus: string, addr: number, packetReceiveNotification?: number);

  on(event: 'progress', listener: (prograss: DfuProgressUpdate) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
}

export = DfuTransportI2C;
