import { type SerialPort } from "serialport";

/**
 * Only types which where needed are written below
 */
declare module "@transmission-dynamics/pc-nrf-dfu-js" {
  export class DfuUpdates {
    constructor(
      updates?: { initPacket: Uint8Array; firmwareImage: Uint8Array }[]
    );
    static fromZipFilePath(path: string): Promise<DfuUpdates>;
  }

  export class DfuTransportSerial {
    constructor(port: SerialPort, packetReceiveNotification?: number);
  }

  export class DfuOperation {
    constructor(updates: DfuUpdates, port: DfuTransportSerial);
    public start(forceful: boolean): Promise<unknown>;
  }

  const ErrorCode: {
    ERROR_MESSAGE: number;
    ERROR_MESSAGE_RSP: number;
    ERROR_MESSAGE_EXT: number;
    ERROR_CAN_NOT_INIT_ABSTRACT_TRANSPORT: number;
    ERROR_PRE_DFU_INTERRUPTED: number;
    ERROR_UNEXPECTED_BYTES: number;
    ERROR_CRC_MISMATCH: number;
    ERROR_TOO_MANY_WRITE_FAILURES: number;
    ERROR_CAN_NOT_INIT_PRN_TRANSPORT: number;
    ERROR_CAN_NOT_USE_HIGHER_PRN: number;
    ERROR_READ_CONFLICT: number;
    ERROR_TIMEOUT_READING_SERIAL: number;
    ERROR_RECEIVE_TWO_MESSAGES: number;
    ERROR_RESPONSE_NOT_START_WITH_0x60: number;
    ERROR_ASSERT_EMPTY_RESPONSE: number;
    ERROR_UNEXPECTED_RESPONSE_OPCODE: number;
    ERROR_UNEXPECTED_RESPONSE_BYTES: number;
    ERROR_MUST_HAVE_PAYLOAD: number;
    ERROR_INVOKED_MISMATCHED_CRC32: number;
    ERROR_MORE_BYTES_THAN_CHUNK_SIZE: number;
    ERROR_INVALID_PAYLOAD_TYPE: number;
    ERROR_CAN_NOT_DISCOVER_DFU_CONTROL: number;
    ERROR_TIMEOUT_FETCHING_CHARACTERISTICS: number;
    ERROR_CAN_NOT_SUBSCRIBE_CHANGES: number;
    ERROR_UNKNOWN_FIRMWARE_TYPE: number;
    ERROR_UNABLE_FIND_PORT: number;
    ERROR_RSP_INVALID: number;
    ERROR_RSP_SUCCESS: number;
    ERROR_RSP_OP_CODE_NOT_SUPPORTED: number;
    ERROR_RSP_INVALID_PARAMETER: number;
    ERROR_RSP_INSUFFICIENT_RESOURCES: number;
    ERROR_RSP_INVALID_OBJECT: number;
    ERROR_RSP_UNSUPPORTED_TYPE: number;
    ERROR_RSP_OPERATION_NOT_PERMITTED: number;
    ERROR_RSP_OPERATION_FAILED: number;
    ERROR_RSP_EXT_ERROR: number;
    ERROR_EXT_NO_ERROR: number;
    ERROR_EXT_INVALID_ERROR_CODE: number;
    ERROR_EXT_WRONG_COMMAND_FORMAT: number;
    ERROR_EXT_UNKNOWN_COMMAND: number;
    ERROR_EXT_INIT_COMMAND_INVALID: number;
    ERROR_EXT_FW_VERSION_FAILURE: number;
    ERROR_EXT_HW_VERSION_FAILURE: number;
    ERROR_EXT_SD_VERSION_FAILURE: number;
    ERROR_EXT_SIGNATURE_MISSING: number;
    ERROR_EXT_WRONG_HASH_TYPE: number;
    ERROR_EXT_HASH_FAILED: number;
    ERROR_EXT_WRONG_SIGNATURE_TYPE: number;
    ERROR_EXT_VERIFICATION_FAILED: number;
    ERROR_EXT_INSUFFICIENT_SPACE: number;
    ERROR_EXT_FW_ALREADY_PRESENT: number;
  };

  class DfuError extends Error {
    constructor(code: ErrorCode, message?: string);
    static getErrorMessage(code: ErrorCode): any;
  }
}
