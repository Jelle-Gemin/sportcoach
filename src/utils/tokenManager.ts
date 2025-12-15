export const setTokens = (accessToken: string, refreshToken: string, expiresAt: number) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('expiresAt', expiresAt.toString());
};

export const getAccessToken = () => localStorage.getItem('accessToken');

export const getRefreshToken = () => localStorage.getItem('refreshToken');

export const getExpiresAt = () => parseInt(localStorage.getItem('expiresAt') || '0');

export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('expiresAt');
};

export const isTokenExpired = () => {
  const expiresAt = getExpiresAt();
  return Date.now() / 1000 > expiresAt;
};
