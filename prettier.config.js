/** @type {import('prettier').Config} */
export default {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always',
  endOfLine: 'lf',
  plugins: ['prettier-plugin-organize-imports'],
  overrides: [
    {
      files: '*.json',
      options: {
        tabWidth: 2,
      },
    },
    {
      files: '*.mdx',
      options: {
        proseWrap: 'preserve',
      },
    },
  ],
};
