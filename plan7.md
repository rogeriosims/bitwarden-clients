1. **Fix `CipherService` and Data Models in `CertificadosA1Component`**:
    - Update `ciphers()` signal to hold `CipherView[]`.
    - Fetch active `userId` using `AccountService` and `getUserId`.
    - Load ciphers using `cipherService.cipherViews$(activeUserId)`.
    - Create `CipherView` and `FieldView`s in `saveCertificado`.
    - Use `cipherService.createWithServer(cipherView, activeUserId)`.
    - Use `cipherService.saveAttachmentWithServer(cipherDomain, file, activeUserId, false)` (requires getting the `Cipher` domain model using `cipherService.get(savedCipher.id, activeUserId)`).
    - Remove `CipherFileUploadService`.
2. **Template and Pipe Fixes in `certificados-a1.component.ts`**:
    - Remove `| async` pipe from primitive strings (`name`, `username`).
    - Make `getVencimento` synchronous since `CipherView` uses `string` for `value` directly.
    - Add QA automation ID `id="certificados-a1_button_add"`.
    - Replace hardcoded color classes with Bitwarden semantic theme tokens.
    - Use `| i18n` for all static text.
3. **Refactor `CertificadoA1UploadComponent`**:
    - Use Reactive Forms (`FormControl`, `Validators.required`) for the password.
    - Add QA automation IDs for inputs and buttons.
    - Remove fixed light-theme classes and use semantic ones.
    - Localize all static texts and toast messages using `I18nService`.
4. **Localization Keys in `apps/web/src/locales/en/messages.json` (and `pt_BR/messages.json`)**:
    - Add the missing keys specified in the PR comments to both `en` and `pt_BR`.
5. **Unit Tests**:
    - Refactor `certificados-a1.component.spec.ts` to use `mock<T>()` from `jest-mock-extended`.
    - Mock all required services (AccountService, CipherService, etc.) as requested.
    - Refactor `certificado-a1-upload.component.spec.ts` accordingly.
6. **Pre commit checks**:
    - Run the `web` and `vault` tests to ensure everything passes before final submission.
7. **Submit the PR**:
    - Respond to PR comments and submit the final changes.
