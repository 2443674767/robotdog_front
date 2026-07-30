import { useUserStore } from '@/store';
import { redirectToLogin } from '@/utils/redirect-login';

export default function useUser() {
  const userStore = useUserStore();
  const logout = async (logoutTo?: string) => {
    try {
      await userStore.logout();
    } finally {
      redirectToLogin(
        logoutTo && typeof logoutTo === 'string' ? logoutTo : undefined
      );
    }
  };
  return {
    logout,
  };
}
