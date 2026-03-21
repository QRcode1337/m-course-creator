interface User {
  id: string;
  email: string;
  name?: string;
}

const LOCAL_USER: User = {
  id: "local-user",
  email: "local@course-creator.local",
  name: "Local User",
};

export function useAuth() {
  return {
    user: LOCAL_USER,
    loading: false,
  };
}
