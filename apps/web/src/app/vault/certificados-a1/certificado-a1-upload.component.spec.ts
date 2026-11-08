import { ComponentFixture, TestBed } from "@angular/core/testing";
import { mock } from "jest-mock-extended";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { DialogRef, ToastService } from "@bitwarden/components";

import { CertificadoA1UploadComponent } from "./certificado-a1-upload.component";

describe("CertificadoA1UploadComponent", () => {
  let component: CertificadoA1UploadComponent;
  let fixture: ComponentFixture<CertificadoA1UploadComponent>;

  const mockDialogRef = mock<DialogRef>();
  const mockToastService = mock<ToastService>();
  const mockI18nService = mock<I18nService>();

  beforeEach(async () => {
    mockI18nService.t.mockImplementation((key: string) => key);

    await TestBed.configureTestingModule({
      imports: [CertificadoA1UploadComponent],
      providers: [
        { provide: DialogRef, useValue: mockDialogRef },
        { provide: ToastService, useValue: mockToastService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CertificadoA1UploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should reject files larger than 500KB", () => {
    const largeFile = new File([new ArrayBuffer(600 * 1024)], "large.pfx");
    component.handleFile(largeFile);

    expect(mockToastService.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error" }),
    );
    expect(component.selectedFile()).toBeNull();
  });

  it("should accept files under 500KB", () => {
    const validFile = new File([new ArrayBuffer(10 * 1024)], "cert.pfx");
    component.handleFile(validFile);

    expect(component.selectedFile()).toBe(validFile);
  });
});
