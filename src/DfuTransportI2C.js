/**
 * copyright (c) 2024, JR Dynamics Ltd.
 *
 * all rights reserved.
 *
 * redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * 1. redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. redistributions in binary form, except as embedded into a nordic
 *    semiconductor asa integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 3. neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 4. this software, with or without modification, must only be used with a
 *    Nordic Semiconductor ASA integrated circuit.
 *
 * 5. any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * this software is provided by Nordic Semiconductor ASA "as is" and any express
 * or implied warranties, including, but not limited to, the implied warranties
 * of merchantability, noninfringement, and fitness for a particular purpose are
 * disclaimed. in no event shall Nordic Semiconductor ASA or contributors be
 * liable for any direct, indirect, incidental, special, exemplary, or
 * consequential damages (including, but not limited to, procurement of substitute
 * goods or services; loss of use, data, or profits; or business interruption)
 * however caused and on any theory of liability, whether in contract, strict
 * liability, or tort (including negligence or otherwise) arising in any way out
 * of the use of this software, even if advised of the possibility of such damage.
 *
 */

import Debug from 'debug';
import { i2cTransfer } from '@transmission-dynamics/i2c-transfer';
import * as slip from './util/slip';
import { DfuError, ErrorCode } from './DfuError';
import DfuTransportPrn from './DfuTransportPrn';

const debug = Debug('dfu:serial');

/**
 * Serial DFU transport. Supports serial DFU for devices connected
 * through a SEGGER J-Link debugger. See DfuTransportUsbSerial for
 * support for Nordic USB devices without the J-Link debugger.
 *
 * This needs to be given a `serialport` instance when instantiating.
 * Will encode actual requests with SLIP
 */
export default class DfuTransportI2C extends DfuTransportPrn {
    constructor(bus, addr, packetReceiveNotification = 16) {
        super(packetReceiveNotification);
        this.bus = bus;
        this.addr = addr;
        this.slipDecoder = new slip.Decoder({
            onMessage: this.onData.bind(this),
        });
    }

    // Given a command (including opcode), perform SLIP encoding and send it
    // through the wire.
    // This ensures that the serial port is open by calling this.open() - the first
    // call to writeCommand will actually open the port.
    writeCommand(bytes) {
        const fixedReadSize = 58;
        let encoded = slip.encode(bytes);

        // Strip the heading 0xC0 character, as to avoid a bug in the nRF SDK implementation
        // of the SLIP encoding/decoding protocol
        encoded = encoded.subarray(1);

        // Cast the Uint8Array info a Buffer so it works on nodejs v6
        encoded = Buffer.from(encoded);

        debug(` writeCommand --> ${this.bus}@${this.addr.toString(16)}: ${encoded.toString('hex')}`);
        return i2cTransfer(this.bus, this.addr, encoded, fixedReadSize).then(data => {
            debug(` writeCommand <-- ${this.bus}@${this.addr.toString(16)}: ${data.toString('hex')}`);
            if (data.length > 1) {
                this.onRawData(data.slice(1, data[0] + 1));
            }
        }).catch(error => {
            debug(` writeCommand <-- ${this.bus}@${this.addr.toString(16)}: error: ${error}`);
            throw error;
        });
    }

    // Given some payload bytes, pack them into a 0x08 command.
    // The length of the bytes is guaranteed to be under this.mtu thanks
    // to the DfuTransportPrn functionality.
    writeData(bytes) {
        const commandBytes = new Uint8Array(bytes.length + 1);
        commandBytes.set([0x08], 0); // "Write" opcode
        commandBytes.set(bytes, 1);
        return this.writeCommand(commandBytes);
    }

    // Callback when raw (yet undecoded by SLIP) data is being read from the serial port instance.
    // Called only internally.
    onRawData(data) {
        try {
            debug(' recv <-- ', data);
            this.slipDecoder.decode(data);
        } catch (error) {
            this.emit('error', error);
        }
    }

    // Initializes DFU procedure: sets the PRN and requests the MTU.
    // The serial port is implicitly opened during the first call to writeCommand().
    // Returns a Promise when initialization is done.
    ready() {
        if (this.readyPromise) {
            return this.readyPromise;
        }

        this.readyPromise = this.writeCommand(new Uint8Array([
            0x02, // "Set PRN" opcode
            this.prn & 0xFF, // PRN LSB
            (this.prn >> 8) & 0xFF, // PRN MSB
        ]))
            .then(this.read.bind(this))
            .then(this.assertPacket(0x02, 0))
            // Request MTU
            .then(() => this.writeCommand(new Uint8Array([
                0x07, // "Request serial MTU" opcode
            ])))
            .then(this.read.bind(this))
            .then(this.assertPacket(0x07, 2))
            .then(bytes => {
                const mtu = (bytes[1] * 256) + bytes[0];

                // Convert wire MTU into max size of data before SLIP encoding:
                // This takes into account:
                // - SLIP encoding ( /2 )
                // - SLIP end separator ( -1 )
                // - Serial DFU write command ( -1 )
                this.mtu = Math.floor((mtu / 2) - 2);

                // Round down to multiples of 4.
                // This is done to avoid errors while writing to flash memory:
                // writing an unaligned number of bytes will result in an
                // error in most chips.
                this.mtu -= this.mtu % 4;

                debug(`Serial wire MTU: ${mtu}; un-encoded data max size: ${this.mtu}`);
            });

        return this.readyPromise;
    }

    // Returns a Promise to the version of the DFU protocol that the target implements, as
    // a single integer between 0 to 255.
    // Only bootloaders from 2018 (SDK >= v15) for development boards implement this command.
    getProtocolVersion() {
        debug('GetProtocolVersion');

        return this.writeCommand(new Uint8Array([
            0x00, // "Version Command" opcode
        ]))
            .then(this.read.bind(this))
            .then(this.assertPacket(0x00, 1))
            .then(bytes => bytes[0])
            .then(protocolVersion => {
                debug('ProtocolVersion: ', protocolVersion);
                return protocolVersion;
            });
    }

    // Returns a Promise to the version of the DFU protocol that the target implements, as
    // an object with descriptive property names.
    // Only bootloaders from 2018 (SDK >= v15) for development boards implement this command.
    getHardwareVersion() {
        debug('GetHardwareVersionn');

        return this.writeCommand(new Uint8Array([
            0x0A, // "Version Command" opcode
        ]))
            .then(this.read.bind(this))
            .then(this.assertPacket(0x0A, 20))
            .then(bytes => {
            // Decode little-endian fields, by using a DataView with the
            // same buffer *and* offset than the Uint8Array for the packet payload
                const dataView = new DataView(bytes.buffer, bytes.byteOffset);
                return {
                    part: dataView.getInt32(0, true),
                    variant: dataView.getInt32(4, true),
                    memory: {
                        romSize: dataView.getInt32(8, true),
                        ramSize: dataView.getInt32(12, true),
                        romPageSize: dataView.getInt32(16, true),
                    },
                };
            })
            .then(hwVersion => {
                debug('HardwareVersion part: ', hwVersion.part.toString(16));
                debug('HardwareVersion variant: ', hwVersion.variant.toString(16));
                debug('HardwareVersion ROM: ', hwVersion.memory.romSize);
                debug('HardwareVersion RAM: ', hwVersion.memory.ramSize);
                debug('HardwareVersion ROM page size: ', hwVersion.memory.romPageSize);

                return hwVersion;
            });
    }

    // Given an image number (0-indexed), returns a Promise to a plain object describing
    // that firmware image, or boolean false if there is no image at that index.
    // Only bootloaders from 2018 (SDK >= v15) for development boards implement this command.
    getFirmwareVersion(imageCount = 0) {
        debug('GetFirmwareVersion');

        return this.writeCommand(new Uint8Array([
            0x0B, // "Version Command" opcode
            `0x${imageCount.toString(16)}`,
        ]))
            .then(this.read.bind(this))
            .then(this.assertPacket(0x0B, 13))
            .then(bytes => {
                // Decode little-endian fields, by using a DataView with the
                // same buffer *and* offset than the Uint8Array for the packet payload
                const dataView = new DataView(bytes.buffer, bytes.byteOffset);
                let imgType = dataView.getUint8(0, true);

                switch (imgType) {
                    case 0xFF:
                        // Meaning "no image at this index"
                        return false;
                    case 0:
                        imgType = 'SoftDevice';
                        break;
                    case 1:
                        imgType = 'Application';
                        break;
                    case 2:
                        imgType = 'Bootloader';
                        break;
                    default:
                        throw new DfuError(ErrorCode.ERROR_RSP_UNSUPPORTED_OBJECT_TYPE);
                }

                return {
                    version: dataView.getUint32(1, true),
                    addr: dataView.getUint32(5, true),
                    length: dataView.getUint32(9, true),
                    imageType: imgType,
                };
            })
            .then(fwVersion => {
                if (fwVersion) {
                    debug(`FirmwareVersion: image ${imageCount} is ${fwVersion.imageType} @0x${fwVersion.addr.toString(16)}+0x${fwVersion.length}`);
                } else {
                    debug('FirmwareVersion: no more images.');
                }

                return fwVersion;
            });
    }

    // Returns an array containing information about all available firmware images, by
    // sending several GetFirmwareVersion commands.
    getAllFirmwareVersions(index = 0, accum = []) {
        return this.getFirmwareVersion(index)
            .then(imageInfo => {
                if (imageInfo) {
                    accum.push(imageInfo);
                    return this.getAllFirmwareVersions(index + 1, accum);
                }
                return accum;
            });
    }
}
