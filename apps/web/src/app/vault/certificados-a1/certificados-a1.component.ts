import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { I18nPipe } from "@bitwarden/ui-common";
import {
  DialogService,
  ButtonModule,
  IconModule,
  IconTileComponent,
  ToastService,
} from "@bitwarden/components";
import { CertificadoA1UploadComponent } from "./certificado-a1-upload.component";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherFileUploadService } from "@bitwarden/common/vault/abstractions/file-upload/cipher-file-upload.service";
import { CipherType } from "@bitwarden/common/vault/enums";
import { Cipher } from "@bitwarden/common/vault/models/domain/cipher";
import { Login } from "@bitwarden/common/vault/models/domain/login";
import { Field } from "@bitwarden/common/vault/models/domain/field";
import { FieldType } from "@bitwarden/common/vault/enums/field-type.enum";
import { firstValueFrom } from "rxjs";

@Component({
  selector: "app-certificados-a1",
  template: `
    <div class="tw-p-6">
      <div class="tw-flex tw-justify-between tw-items-center tw-mb-6">
        <h1 class="tw-text-2xl tw-font-semibold">Certificados A1</h1>
        <button bitButton buttonType="primary" startIcon="bwi-plus" (click)="openAddModal()">
          Adicionar Certificado A1
        </button>
      </div>

      @if (ciphers().length === 0) {
        <div class="tw-text-center tw-py-12 tw-text-secondary-500">
          <p>Nenhum certificado A1 cadastrado.</p>
        </div>
      } @else {
        <div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-4">
          @for (cipher of ciphers(); track cipher.id) {
            <div
              class="tw-border tw-border-primary-200 tw-rounded-lg tw-p-4 tw-bg-white tw-shadow-sm"
            >
              <div class="tw-flex tw-items-center tw-gap-3 tw-mb-3">
                <bit-icon-tile icon="bwi-id-card" variant="primary" size="base"></bit-icon-tile>
                <h3 class="tw-font-semibold tw-truncate">{{ cipher.name | async }}</h3>
              </div>
              <div class="tw-text-sm tw-text-secondary-600 tw-space-y-1">
                <p><strong>CNPJ:</strong> {{ cipher.login?.username | async }}</p>
                <p><strong>Vencimento:</strong> {{ getVencimento(cipher) | async }}</p>
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
  private readonly cipherFileUploadService = inject(CipherFileUploadService);
  private readonly toastService = inject(ToastService);

  ciphers = signal<Cipher[]>([]);

  ngOnInit() {
    this.loadCiphers();
  }

  async loadCiphers() {
    try {
      const allCiphers = await firstValueFrom(this.cipherService.ciphers$);
      const certificados = [];
      for (const cipher of allCiphers) {
        if (cipher.fields && cipher.fields.length > 0) {
          const typeField = cipher.fields.find((f) => f.name === "_tipo");
          if (typeField && (await typeField.value) === "certificado_a1") {
            certificados.push(cipher);
          }
        }
      }
      this.ciphers.set(certificados);
    } catch (e) {
      console.error(e);
    }
  }

  async getVencimento(cipher: Cipher): Promise<string> {
    const field = cipher.fields?.find((f) => f.name === "Vencimento");
    return field ? await field.value : "";
  }

  async openAddModal() {
    const dialogRef = this.dialogService.open(CertificadoA1UploadComponent);
    const result = await firstValueFrom(dialogRef.closed);

    if (result && result.file && result.data && result.password) {
      await this.saveCertificado(result.file, result.password, result.data);
    }
  }

  async saveCertificado(file: File, password: string, data: any) {
    try {
      const cipher = new Cipher();
      cipher.type = CipherType.Login;
      cipher.name = data.subjectName;

      cipher.login = new Login();
      cipher.login.username = data.cnpj;
      cipher.login.password = password;

      const vencimentoDate = new Date(data.notAfter);
      const vencimentoStr = vencimentoDate.toLocaleDateString("pt-BR");

      cipher.fields = [
        new Field("Vencimento", vencimentoStr, FieldType.Text),
        new Field("_tipo", "certificado_a1", FieldType.Hidden),
      ];

      // Save item
      const savedCipher = await this.cipherService.save(cipher);

      if (savedCipher && savedCipher.id) {
        // Attach file
        await this.cipherFileUploadService.upload(savedCipher.id, file);
        this.toastService.showToast({
          title: "Sucesso",
          message: "Certificado A1 salvo com sucesso!",
          variant: "success",
        });
        this.loadCiphers();
      }
    } catch (e) {
      this.toastService.showToast({
        title: "Erro",
        message: "Erro ao salvar certificado.",
        variant: "error",
      });
      console.error(e);
    }
  }
}
