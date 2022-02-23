import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseGraphComponent } from './base-graph.component';

describe('BaseGraphComponent', () => {
  let component: BaseGraphComponent;
  let fixture: ComponentFixture<BaseGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BaseGraphComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BaseGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
