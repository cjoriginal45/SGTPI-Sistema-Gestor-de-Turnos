import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppointmentsHistoryComponent } from './appointments-history.component';

describe('AppointmentsHistoryComponent', () => {
  let component: AppointmentsHistoryComponent;
  let fixture: ComponentFixture<AppointmentsHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppointmentsHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppointmentsHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
