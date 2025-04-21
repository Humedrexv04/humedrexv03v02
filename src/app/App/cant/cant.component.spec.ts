import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CantComponent } from './cant.component';

describe('CantComponent', () => {
  let component: CantComponent;
  let fixture: ComponentFixture<CantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CantComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
