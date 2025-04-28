import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { loginRedirectGuardGuard } from './login-redirect-guard.guard';

describe('loginRedirectGuardGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => loginRedirectGuardGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
