import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { firstValueFrom } from "rxjs";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherType } from "@bitwarden/common/vault/enums";
import { FieldType } from "@bitwarden/common/vault/enums/field-type.enum";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { FieldView } from "@bitwarden/common/vault/models/view/field.view";
import {
  ButtonModule,
  DialogService,
  IconModule,
  IconTileComponent,
  ToastService,
} from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";

import { CertificadoA1UploadComponent } from "./certificado-a1-upload.component";

@Component({
  selector: "app-certificados-a1",
  template: `
    <div class="tw-p-6">
      <div class="tw-flex tw-justify-between tw-items-center tw-mb-6">
        <h1 class="tw-text-2xl tw-font-semibold tw-text-text-main">
          {{ "certificadosA1" | i18n }}
        </h1>
        <button
          bitButton
          buttonType="primary"
          startIcon="bwi-plus"
          id="certificados-a1_button_add"
          (click)="openAddModal()"
        >
          {{ "addCertificadoA1" | i18n }}
        </button>
      </div>

      @if (ciphers().length === 0) {
        <div class="tw-text-center tw-py-12 tw-text-text-muted">
          <p>{{ "noCertificadosA1" | i18n }}</p>
        </div>
      } @else {
        <div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-4">
          @for (cipher of ciphers(); track cipher.id) {
            <div
              class="tw-border tw-border-border-base tw-rounded-lg tw-p-4 tw-bg-background-alt tw-shadow-sm"
            >
              <div class="tw-flex tw-items-center tw-gap-3 tw-mb-3">
                <bit-icon-tile icon="bwi-id-card" variant="primary" size="base"></bit-icon-tile>
                <h3 class="tw-font-semibold tw-truncate tw-text-text-main">{{ cipher.name }}</h3>
              </div>
              <div class="tw-text-sm tw-text-text-muted tw-space-y-1">
                <p>
                  <strong>{{ "cnpj" | i18n }}:</strong> {{ cipher.login?.username }}
                </p>
                <p>
                  <strong>{{ "expiration" | i18n }}:</strong> {{ getVencimento(cipher) }}
                </p>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, I18nPipe, ButtonModule, IconModule, IconTileComponent],
})
export class CertificadosA1Component implements OnInit {
  private readonly dialogService = inject(DialogService);
  private readonly cipherService = inject(CipherService);
  private readonly accountService = inject(AccountService);
  private readonly toastService = inject(ToastService);
  private readonly i18nService = inject(I18nService);

  readonly ciphers = signal<CipherView[]>([]);

  ngOnInit(): void {
    void this.loadCiphers();
  }

  async loadCiphers(): Promise<void> {
    try {
      const activeUserId = await firstValueFrom(this.accountService.activeAccount$.pipe(getUserId));
      if (!activeUserId) {
        return;
      }
      const allCiphers = await firstValueFrom(this.cipherService.cipherViews$(activeUserId));
      const certificados = allCiphers.filter((cipher) =>
        cipher.fields?.some((f) => f.name === "_tipo" && f.value === "certificado_a1"),
      );
      this.ciphers.set(certificados);
    } catch {
      // Avoid logging sensitive vault errors
    }
  }

  getVencimento(cipher: CipherView): string {
    const field = cipher.fields?.find((f) => f.name === "Vencimento");
    return field?.value ?? "";
  }

  async openAddModal(): Promise<void> {
    const dialogRef = this.dialogService.open(CertificadoA1UploadComponent);
    const result = await firstValueFrom(dialogRef.closed);

    if (result && result.file && result.data && result.password) {
      await this.saveCertificado(result.file, result.password, result.data);
    }
  }

  async saveCertificado(
    file: File,
    password: string,
    data: { subjectName: string; cnpj: string; notAfter: Date },
  ): Promise<void> {
    try {
      const activeUserId = await firstValueFrom(this.accountService.activeAccount$.pipe(getUserId));
      if (!activeUserId) {
        return;
      }

      const cipherView = new CipherView();
      cipherView.type = CipherType.Login;
      cipherView.name = data.subjectName;
      cipherView.login.username = data.cnpj;
      cipherView.login.password = password;

      const vencimentoDate = new Date(data.notAfter);
      const vencimentoStr = vencimentoDate.toLocaleDateString("pt-BR");

      const vencimentoField = new FieldView();
      vencimentoField.name = "Vencimento";
      vencimentoField.value = vencimentoStr;
      vencimentoField.type = FieldType.Text;

      const tipoField = new FieldView();
      tipoField.name = "_tipo";
      tipoField.value = "certificado_a1";
      tipoField.type = FieldType.Hidden;

      cipherView.fields = [vencimentoField, tipoField];

      const savedCipher = await this.cipherService.createWithServer(cipherView, activeUserId);

      if (savedCipher && savedCipher.id) {
        const cipherDomain = await this.cipherService.get(savedCipher.id, activeUserId);
        await this.cipherService.saveAttachmentWithServer(cipherDomain, file, activeUserId, false);

        this.toastService.showToast({
          title: this.i18nService.t("certificadosA1"),
          message: this.i18nService.t("certificateSavedSuccess"),
          variant: "success",
        });
        await this.loadCiphers();
      }
    } catch {
      this.toastService.showToast({
        title: this.i18nService.t("errorOccurred"),
        message: this.i18nService.t("errorSavingCertificate"),
        variant: "error",
      });
    }
  }
}
