import { Component, ChangeDetectionStrategy, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  DialogRef,
  DialogModule,
  ButtonModule,
  ToastService,
  InputDirective,
} from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";
import * as forge from "node-forge";

@Component({
  selector: "app-certificados-a1-upload",
  template: `
    <bit-dialog background="alt">
      <span bitDialogTitle>Adicionar Certificado A1</span>
      <div bitDialogContent class="tw-p-4 tw-flex tw-flex-col tw-gap-4">
        <!-- Drag and Drop Zone -->
        <div
          class="tw-border-2 tw-border-dashed tw-border-primary-500 tw-rounded-lg tw-p-8 tw-text-center tw-cursor-pointer"
          (drop)="onFileDrop($event)"
          (dragover)="onDragOver($event)"
          (click)="fileInput.click()"
        >
          @if (!selectedFile()) {
            <p>Arraste e solte o arquivo .pfx aqui ou clique para selecionar</p>
          } @else {
            <p class="tw-font-semibold tw-text-primary-600">{{ selectedFile()?.name }}</p>
          }
          <input
            type="file"
            #fileInput
            class="tw-hidden"
            accept=".pfx,.p12"
            (change)="onFileSelected($event)"
          />
        </div>

        @if (selectedFile()) {
          <div class="tw-flex tw-flex-col tw-gap-2">
            <label for="pfx-password">Senha do Certificado:</label>
            <input
              bitInput
              type="password"
              id="pfx-password"
              [(ngModel)]="password"
              placeholder="Digite a senha"
            />
          </div>
        }

        @if (loading()) {
          <div class="tw-flex tw-justify-center tw-mt-4">
            <span>Validando Certificado...</span>
          </div>
        }

        @if (extractedData()) {
          <div class="tw-mt-4 tw-p-4 tw-bg-success-100 tw-rounded-lg tw-text-success-800">
            <p><strong>Certificado Válido!</strong></p>
            <p>Empresa: {{ extractedData()?.subjectName }}</p>
            <p>CNPJ: {{ extractedData()?.cnpj }}</p>
            <p>Vence em: {{ extractedData()?.notAfter | date: "dd/MM/yyyy" }}</p>
          </div>
        }
      </div>

      <div bitDialogFooter class="tw-flex tw-justify-end tw-gap-2">
        <button bitButton buttonType="secondary" (click)="close()">Cancelar</button>
        <button
          bitButton
          buttonType="primary"
          [disabled]="!selectedFile() || !password() || loading()"
          (click)="processFile()"
        >
          {{ extractedData() ? "Salvar Certificado" : "Validar e Salvar" }}
        </button>
      </div>
    </bit-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, I18nPipe, InputDirective],
})
export class CertificadoA1UploadComponent {
  private readonly dialogRef = inject(DialogRef);
  private readonly toastService = inject(ToastService);

  selectedFile = signal<File | null>(null);
  password = signal<string>("");
  loading = signal<boolean>(false);

  extractedData = signal<{ subjectName: string; cnpj: string; notAfter: Date } | null>(null);

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files?.length) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File) {
    if (file.size > 50 * 1024) {
      this.toastService.showToast({
        title: "Erro",
        message: "O arquivo excede o limite de 50KB.",
        variant: "error",
      });
      return;
    }
    this.selectedFile.set(file);
    this.extractedData.set(null);
  }

  async processFile() {
    if (!this.selectedFile() || !this.password()) return;

    // If already validated, proceed to save (in a real implementation this creates the item)
    if (this.extractedData()) {
      this.dialogRef.close({
        file: this.selectedFile(),
        password: this.password(),
        data: this.extractedData(),
      });
      return;
    }

    this.loading.set(true);

    try {
      const arrayBuffer = await this.selectedFile()!.arrayBuffer();
      const asn1 = forge.asn1.fromDer(
        forge.util.createBuffer(new Uint8Array(arrayBuffer)).getBytes(),
      );

      const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, this.password());

      // Extract data
      let notAfter: Date | null = null;
      let subjectName = "";
      let cnpj = "";

      for (const safeBags of p12.safeContents) {
        for (const safeBag of safeBags.safeBags) {
          if (safeBag.cert) {
            const cert = safeBag.cert;
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
            // Break out early if we found the client cert (could have better logic to avoid root certs)
            if (subjectName) break;
          }
        }
      }

      if (notAfter && subjectName) {
        this.extractedData.set({ subjectName, cnpj, notAfter });
      } else {
        throw new Error("Não foi possível extrair os dados do certificado.");
      }
    } catch (e) {
      this.toastService.showToast({
        title: "Erro",
        message: "Senha incorreta ou arquivo inválido.",
        variant: "error",
      });
      this.extractedData.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  close() {
    this.dialogRef.close();
  }
}
