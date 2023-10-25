import getCommonJSPlugin from '@rollup/plugin-commonjs'
import getNodeModuleResolutionPlugin from '@rollup/plugin-node-resolve'

export default {
  input: 'lib/main.js',
  output: {
    file: 'main.js',
    format: 'cjs'
  },
  plugins: [
    getCommonJSPlugin({
      ignoreDynamicRequires: true
    }),
    getNodeModuleResolutionPlugin()
  ],
  external: [
    'obsidian',
    '@codemirror/view',
    '@codemirror/state',
    '@codemirror/language'
  ]
}
