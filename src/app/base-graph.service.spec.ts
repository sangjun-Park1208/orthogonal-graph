import { TestBed } from '@angular/core/testing';

import { BaseGraphService } from './base-graph.service';

describe('BaseGraphService', () => {
  let service: BaseGraphService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BaseGraphService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
