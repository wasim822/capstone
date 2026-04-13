export const TOKEN_KEY = "wms_token";
//browser remembers user session .... 
export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

//every API requests confirms if we have a logged in user and returns token.. 
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

//Used when logout, session expired, backend returns 401....
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

//Instead of logging in every request, frontend sends: Authorization : Bearer token 