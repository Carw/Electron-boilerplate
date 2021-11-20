module.exports = {
  root: true,
  env: {
    browser: true,
    node: true
  },
  extends: [
    "plugin:vue/essential",
    "@vue/standard"
  ],
  parserOptions: {
    parser: "babel-eslint"
  },
  globals: {
    appId: true,
    __static: true
  },
  rules: {
    "quotes": [ "error", "double" ],
    "no-console": "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    "indent": [ "error", 2, {
      "SwitchCase": 1
    } ],
    "vue/script-indent": [ "error", 2, {
      "baseIndent": 1
    } ],
    "space-in-parens": [ "error", "always" ],
    "computed-property-spacing": [ "error", "always" ],
    "array-bracket-spacing": [ "error", "always" ],
    "comma-dangle": [ "error", "never" ]
  },
  overrides: [
    {
      "files": [ "*.vue" ],
      "rules": {
        "indent": "off"
      }
    }
  ]
}
