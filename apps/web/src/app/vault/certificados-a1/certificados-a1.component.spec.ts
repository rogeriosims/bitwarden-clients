import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CertificadosA1Component } from "./certificados-a1.component";
import { DialogService, ToastService } from "@bitwarden/components";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherFileUploadService } from "@bitwarden/common/vault/abstractions/file-upload/cipher-file-upload.service";
import { of } from "rxjs";

describe("CertificadosA1Component", () => {
  let component: CertificadosA1Component;
  let fixture: ComponentFixture<CertificadosA1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CertificadosA1Component],
      providers: [
        {
          provide: DialogService,
          useValue: { open: jest.fn().mockReturnValue({ closed: of(null) }) },
        },
        { provide: CipherService, useValue: { ciphers$: of([]), save: jest.fn() } },
        { provide: CipherFileUploadService, useValue: { upload: jest.fn() } },
        { provide: ToastService, useValue: { showToast: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CertificadosA1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
