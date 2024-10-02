const { DfuOperation, DfuUpdates } = require('@transmission-dynamics/pc-nrf-dfu-js');
const { DfuTransportI2C } = require('@transmission-dynamics/pc-nrf-dfu-js/dist/DfuTransportI2C.js');

(async () => {
    try {
        const bus = process.argv[2];
        const addr = +process.argv[3];
        const firmwarePath = process.argv[4];

        if (!bus || !addr || !firmwarePath) {
            throw new Error('Usage: ./node i2c-firmware-update.js <bus> <addr> <firmware-path>');
        }

        console.log(`Updating firmware on ${bus} with address ${addr} from ${firmwarePath}`);

        const updates = await DfuUpdates.fromZipFilePath(firmwarePath);
        const serialTransport = new DfuTransportI2C(bus, addr, 1);
        const dfu = new DfuOperation(updates, serialTransport);
        await dfu.start(true);
        console.log('Firmware update completed');
    } catch (e) {
        console.error(e);
    }
})();
