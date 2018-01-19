import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'

export default {
  output: {
    format: 'umd',
  },
  input: 'lib/less-browser/index.js',
  plugins: [
    nodeResolve({
      main: true,
    }),
    commonjs(),
    babel({
      sourceMap: true,
      exclude: 'node_modules/**',
      babelrc: false,
      presets: [
        [
          'env',
          {
            modules: false,
            loose: true,
            targets: {
              browsers: ['last 2 versions', 'IE >= 10'],
            },
          },
        ],
      ],
      plugins: ['external-helpers'],
    }),
  ],
}
