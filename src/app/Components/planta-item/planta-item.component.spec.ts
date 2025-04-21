import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlantaItemComponent } from './planta-item.component';

describe('PlantaItemComponent', () => {
  let component: PlantaItemComponent;
  let fixture: ComponentFixture<PlantaItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlantaItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlantaItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
