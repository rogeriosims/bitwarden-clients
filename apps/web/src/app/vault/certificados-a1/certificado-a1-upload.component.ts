import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { FormControl, ReactiveFormsModule, Validators } from "@angular/forms";
import * as forge from "node-forge";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import {
  ButtonModule,
  DialogModule,
  DialogRef,
  InputDirective,
  ToastService,
} from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";

export interface ExtractedCertificadoData {
  subjectName: string;
  cnpj: string;
  notAfter: Date;
}

export interface CertificadoA1UploadResult {
  file: File;
  password: string;
  data: ExtractedCertificadoData;
}

@Component({
  selector: "app-certificados-a1-upload",
  template: `
    <bit-dialog background="alt">
      <span bitDialogTitle>{{ "addCertificadoA1" | i18n }}</span>
      <div bitDialogContent class="tw-p-4 tw-flex tw-flex-col tw-gap-4">
        <!-- Drag and Drop Zone -->
        <div
          class="tw-border-2 tw-border-dashed tw-border-border-base hover:tw-border-primary tw-rounded-lg tw-p-8 tw-text-center tw-cursor-pointer tw-bg-background-alt"
          (drop)="onFileDrop($event)"
          (dragover)="onDragOver($event)"
          (click)="fileInput.click()"
        >
          @if (!selectedFile()) {
            <p class="tw-text-text-muted">{{ "dragAndDropPfx" | i18n }}</p>
          } @else {
            <p class="tw-font-semibold tw-text-primary">{{ selectedFile()?.name }}</p>
          }
          <input
            type="file"
            #fileInput
            id="certificado-a1-upload_input_file"
            class="tw-hidden"
            accept=".pfx,.p12"
            (change)="onFileSelected($event)"
          />
        </div>

        @if (selectedFile()) {
          <div class="tw-flex tw-flex-col tw-gap-2">
            <label for="certificado-a1-upload_input_password" class="tw-text-text-main">
              {{ "certificatePassword" | i18n }}:
            </label>
            <input
              bitInput
              type="password"
              id="certificado-a1-upload_input_password"
              [formControl]="passwordControl"
              [placeholder]="'enterPassword' | i18n"
            />
          </div>
        }

        @if (loading()) {
          <div class="tw-flex tw-justify-center tw-mt-4 tw-text-text-muted">
            <span>{{ "validatingCertificate" | i18n }}</span>
          </div>
        }

        @if (extractedData()) {
          <div
            class="tw-mt-4 tw-p-4 tw-bg-background-alt tw-border tw-border-border-base tw-rounded-lg tw-text-text-main"
          >
            <p class="tw-font-semibold tw-text-success tw-mb-2">
              {{ "validCertificate" | i18n }}
            </p>
            <p>
              <strong>{{ "company" | i18n }}:</strong> {{ extractedData()?.subjectName }}
            </p>
            <p>
              <strong>{{ "cnpj" | i18n }}:</strong> {{ extractedData()?.cnpj }}
            </p>
            <p>
              <strong>{{ "expiresOn" | i18n }}:</strong>
              {{ extractedData()?.notAfter | date: "dd/MM/yyyy" }}
            </p>
          </div>
        }
      </div>

      <div bitDialogFooter class="tw-flex tw-justify-end tw-gap-2">
        <button
          bitButton
          buttonType="secondary"
          id="certificado-a1-upload_button_cancel"
          (click)="close()"
        >
          {{ "cancel" | i18n }}
        </button>
        <button
          bitButton
          buttonType="primary"
          id="certificado-a1-upload_button_submit"
          [disabled]="!selectedFile() || passwordControl.invalid || loading()"
          (click)="processFile()"
        >
          {{ extractedData() ? ("saveCertificate" | i18n) : ("validateAndSave" | i18n) }}
        </button>
      </div>
    </bit-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    I18nPipe,
    InputDirective,
  ],
})
export class CertificadoA1UploadComponent {
  private readonly dialogRef = inject(DialogRef);
  private readonly toastService = inject(ToastService);
  private readonly i18nService = inject(I18nService);

  readonly selectedFile = signal<File | null>(null);
  readonly loading = signal<boolean>(false);
  readonly extractedData = signal<ExtractedCertificadoData | null>(null);

  readonly passwordControl = new FormControl<string>("", {
    nonNullable: true,
    validators: [Validators.required],
  });

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files?.length) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    if (file.size > 500 * 1024) {
      this.toastService.showToast({
        title: this.i18nService.t("errorOccurred"),
        message: this.i18nService.t("fileExceedsLimit"),
        variant: "error",
      });
      return;
    }
    this.selectedFile.set(file);
    this.extractedData.set(null);
  }

  async processFile(): Promise<void> {
    const file = this.selectedFile();
    const password = this.passwordControl.value;
    if (!file || !password) {
      return;
    }

    if (this.extractedData()) {
      this.dialogRef.close({
        file,
        password,
        data: this.extractedData(),
      } satisfies CertificadoA1UploadResult);
      return;
    }

    this.loading.set(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const asn1 = forge.asn1.fromDer(
        forge.util.createBuffer(new Uint8Array(arrayBuffer)).getBytes(),
      );

      const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);

      let notAfter: Date | null = null;
      let subjectName = "";
      let cnpj = "";

      for (const safeBags of p12.safeContents) {
        for (const safeBag of safeBags.safeBags) {
          if (safeBag.cert) {
            const cert = safeBag.cert;

            // Skip CA certificates
            const isCA = cert.extensions?.some(
              (ext: any) => ext.name === "basicConstraints" && ext.cA === true,
            );

            if (isCA) {
              continue;
            }

            notAfter = cert.validity.notAfter;
            const cnAttr = cert.subject.attributes.find(
              (a: any) => a.shortName === "CN" || a.name === "commonName",
            );
            if (cnAttr) {
              const val = cnAttr.value as string;
              const parts = val.split(":");
              subjectName = parts[0];
              if (parts.length > 1) {
                cnpj = parts[1];
              }
            }

            if (subjectName) {
              break;
            }
          }
        }
      }

      if (notAfter && subjectName) {
        this.extractedData.set({ subjectName, cnpj, notAfter });
      } else {
        throw new Error("Unable to extract certificate data.");
      }
    } catch {
      this.toastService.showToast({
        title: this.i18nService.t("errorOccurred"),
        message: this.i18nService.t("invalidPasswordOrFile"),
        variant: "error",
      });
      this.extractedData.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
