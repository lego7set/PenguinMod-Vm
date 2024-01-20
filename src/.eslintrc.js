module.exports = {
    root: true,
    extends: ['scratch', 'scratch/es6'],
    env: {
        browser: true
    },
    rules: {
        'no-case-declarations': 'off',
        'no-console': 'off',
        'no-shadow': 'off',
        'quotes': 'off',
        'prefer-template': 'warn',
        'linebreak-style': 'off',
        'no-alert': 'off',
        'quote-props': 'off',
        'no-trailing-spaces': 'off',
        'object-curly-spacing': 'off',
        'curly': 'off',
        'operator-linebreak': 'off',
        'one-var': 'off',
        'brace-style': 'off',
        'camelcase': 'off',
        'comma-spacing': 'off',
        'no-negated-condition': 'off',
        // @todo please jg, stop having your formater REMOVE THE SPACES
        'space-before-function-paren': 'off',
        'no-throw-literal': 'off'
    },
    "globals": {
        "vm": true
    },
};
