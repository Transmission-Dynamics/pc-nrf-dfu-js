import path from 'node:path';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import builtins from 'rollup-plugin-node-builtins';
import globals from 'rollup-plugin-node-globals';
import eslint from '@rollup/plugin-eslint';
import copy from 'rollup-plugin-copy';
import pkg from './package.json';

export default {
    input: {
        [path.parse(pkg.main).name]: 'src/index.js',
        DfuTransportI2C: 'src/DfuTransportI2C.js',
    },
    external: ['buffer', 'fs', 'debug', '@transmission-dynamics/i2c-transfer'],
    output: {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true,
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
    },
    plugins: [
        eslint(),
        resolve({ preferBuiltins: true }),
        builtins(),
        commonjs({
            include: 'node_modules/**',
        }),
        globals(),
        copy({
            targets: [
                { src: 'types/*.d.ts', dest: 'dist' },
            ],
            verbose: true,
            copyOnce: true,
        }),
    ],
};
