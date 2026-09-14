import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';

const apiMock = vi.hoisted(() => {
  const apiFn = vi.fn(async () => ({}));
  class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
  return { apiFn, ApiError };
});

vi.mock('@/lib/api', () => ({ api: apiMock.apiFn, ApiError: apiMock.ApiError }));

const authMock = vi.hoisted(() => {
  const refresh = vi.fn(async () => {});
  let user: Record<string, unknown> = {};
  return {
    refresh,
    setUser: (u: Record<string, unknown>) => {
      user = u;
    },
    useAuth: () => ({ user, refresh }),
  };
});

vi.mock('@/lib/auth-context', () => ({ useAuth: authMock.useAuth }));

const navMock = vi.hoisted(() => {
  const push = vi.fn();
  return { push, useRouter: () => ({ push }) };
});

vi.mock('next/navigation', () => ({ useRouter: () => navMock.useRouter() }));

import OnboardingPage from '@/app/app/(main)/onboarding/page';

describe('Onboarding page — persists through the profile API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.setUser({ interests: ['Music'], displayName: 'Maya', bio: '', languages: ['English'] });
  });

  afterEach(() => {
    cleanup();
  });

  const walkToFinish = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Maya N' } });
    fireEvent.change(screen.getByPlaceholderText(/A short intro/), { target: { value: 'Music & travel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  };

  it('persists displayName, bio, interests, languages and marks onboarding COMPLETE via the API, then refreshes and navigates', async () => {
    render(<OnboardingPage />);
    walkToFinish();
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    await waitFor(() =>
      expect(apiMock.apiFn).toHaveBeenCalledWith('/users/me/profile', {
        method: 'PUT',
        auth: true,
        body: {
          displayName: 'Maya N',
          bio: 'Music & travel',
          interests: ['Music'],
          languages: ['English'],
          onboardingStep: 'COMPLETE',
        },
      })
    );
    expect(authMock.refresh).toHaveBeenCalled();
    await waitFor(() => expect(navMock.push).toHaveBeenCalledWith('/app/home'));
  });

  it('shows an error and does NOT refresh or navigate when the profile save fails', async () => {
    apiMock.apiFn.mockRejectedValueOnce(new apiMock.ApiError(400, 'VALIDATION_ERROR', 'Check your details'));
    render(<OnboardingPage />);
    walkToFinish();
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    await waitFor(() => expect(screen.getByText('Check your details')).toBeInTheDocument());
    expect(authMock.refresh).not.toHaveBeenCalled();
    expect(navMock.push).not.toHaveBeenCalled();
  });
});