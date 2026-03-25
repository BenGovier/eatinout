// utils/deviceLogin.ts
export function checkFirstLoginOnDevice() {
    const key = "hasLoggedInBefore";
    const value = localStorage.getItem(key);
  
    if (!value) {
      localStorage.setItem(key, "true");
      return true; // means first login/signup on this device
    }
  
    return false; // already logged in before on this device
  }
  