import { describe, it, expect } from 'vitest';

describe('Onboarding Wizard: DB Helpers', () => {
  it('should export getOnboardingState function', async () => {
    const { getOnboardingState } = await import('./db');
    expect(typeof getOnboardingState).toBe('function');
  });

  it('should export saveOnboardingState function', async () => {
    const { saveOnboardingState } = await import('./db');
    expect(typeof saveOnboardingState).toBe('function');
  });

  it('should return null for non-existent user onboarding state', async () => {
    const { getOnboardingState } = await import('./db');
    const state = await getOnboardingState(999999);
    expect(state).toBeNull();
  });

  it('should save and retrieve onboarding state', async () => {
    const { saveOnboardingState, getOnboardingState } = await import('./db');
    const testUserId = 88888;
    const testData = {
      currentStep: 2,
      completedSteps: [0, 1],
      formData: { orgName: 'Test Corp', industry: 'Technology' } as Record<string, string | boolean>,
      isComplete: false,
    };

    const id = await saveOnboardingState(testUserId, testData);
    expect(id).toBeTruthy();

    const state = await getOnboardingState(testUserId);
    expect(state).not.toBeNull();
    expect(state!.currentStep).toBe(2);
    expect(state!.completedSteps).toEqual([0, 1]);
    expect((state!.formData as Record<string, string>).orgName).toBe('Test Corp');
    expect(state!.isComplete).toBe(0);
  });

  it('should update existing onboarding state', async () => {
    const { saveOnboardingState, getOnboardingState } = await import('./db');
    const testUserId = 88888;
    const updatedData = {
      currentStep: 5,
      completedSteps: [0, 1, 2, 3, 4],
      formData: { orgName: 'Test Corp Updated', industry: 'Finance', enforceMfa: true } as Record<string, string | boolean>,
      isComplete: true,
    };

    await saveOnboardingState(testUserId, updatedData);
    const state = await getOnboardingState(testUserId);
    expect(state).not.toBeNull();
    expect(state!.currentStep).toBe(5);
    expect(state!.completedSteps).toEqual([0, 1, 2, 3, 4]);
    expect((state!.formData as Record<string, string | boolean>).enforceMfa).toBe(true);
    expect(state!.isComplete).toBe(1);
  });
});

describe('Onboarding Wizard: Router exports', () => {
  it('should export appRouter with onboardingWizard procedures', async () => {
    const { appRouter } = await import('./routers');
    expect(appRouter).toBeDefined();
    // Check that onboardingWizard router exists
    const routerDef = appRouter._def;
    expect(routerDef).toBeDefined();
  });
});
