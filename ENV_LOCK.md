# QA Automation Environment Lock

Last verified: 2026-04-08

## Locked runtime
- Node.js: `24.13.1`
- npm: `11.11.0`
- Appium CLI: `3.2.0`

## Locked project dependencies
- `@playwright/test`: `1.58.2`
- `webdriverio`: `9.24.0`
- `typescript`: `5.9.3`
- `prettier`: `3.8.1`
- `@types/node`: `25.2.3`

## Verification command
```bash
npm run env:versions
```

## Notes
- Appium drivers/plugins are managed outside this repo (`~/.appium`).
- If environment drift is suspected, validate driver install/version separately on the executor host.
