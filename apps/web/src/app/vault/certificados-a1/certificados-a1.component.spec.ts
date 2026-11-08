import { ComponentFixture, TestBed } from "@angular/core/testing";
import { mock } from "jest-mock-extended";
import { of } from "rxjs";

import { Account, AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { UserId } from "@bitwarden/common/types/guid";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { Cipher } from "@bitwarden/common/vault/models/domain/cipher";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { FieldView } from "@bitwarden/common/vault/models/view/field.view";
import { DialogRef, DialogService, ToastService } from "@bitwarden/components";

import { CertificadosA1Component } from "./certificados-a1.component";

describe("CertificadosA1Component", () => {
  let component: CertificadosA1Component;
  let fixture: ComponentFixture<CertificadosA1Component>;

  const userId = "test-user-id" as UserId;
  const cipherService = mock<CipherService>();
  const accountService = mock<AccountService>();
  const dialogService = mock<DialogService>();
  const toastService = mock<ToastService>();
  const i18nService = mock<I18nService>();

  beforeEach(async () => {
    accountService.activeAccount$ = of({ id: userId } as Account);
    cipherService.cipherViews$.mockReturnValue(of([]));
    cipherService.createWithServer.mockResolvedValue(new CipherView());
    cipherService.get.mockResolvedValue(new Cipher());
    cipherService.saveAttachmentWithServer.mockResolvedValue(new Cipher());
    i18nService.t.mockImplementation((key: string) => key);

    dialogService.open.mockReturnValue({ closed: of(null) } as unknown as DialogRef);

    await TestBed.configureTestingModule({
      imports: [CertificadosA1Component],
      providers: [
        { provide: DialogService, useValue: dialogService },
        { provide: CipherService, useValue: cipherService },
        { provide: AccountService, useValue: accountService },
        { provide: ToastService, useValue: toastService },
        { provide: I18nService, useValue: i18nService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CertificadosA1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should load and filter ciphers with _tipo = certificado_a1", async () => {
    const certCipher = new CipherView();
    certCipher.id = "cert-1";
    certCipher.name = "Empresa X";
    const tipoField = new FieldView();
    tipoField.name = "_tipo";
    tipoField.value = "certificado_a1";
    certCipher.fields = [tipoField];

    const normalCipher = new CipherView();
    normalCipher.id = "normal-1";
    normalCipher.name = "Google Login";

    cipherService.cipherViews$.mockReturnValue(of([certCipher, normalCipher]));

    await component.loadCiphers();

    expect(component.ciphers().length).toBe(1);
    expect(component.ciphers()[0].id).toBe("cert-1");
  });
});
