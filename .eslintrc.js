module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    // https://www.npmjs.com/package/eslint-config-airbnb-typescript
    'airbnb-base',
    'airbnb-typescript/base',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    // https://stackoverflow.com/questions/64271575/error-with-my-eslintrc-js-file-parsing-error-parseroptions-project-has/64283139#64283139
    project: './tsconfig.eslint.json',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    'max-len': ['warn', { code: 128 }],
    '@typescript-eslint/explicit-function-return-type': ['error'],
    // '@typescript-eslint/no-explicit-any': ['warn', { ignoreRestArgs: true }],
  },
};
