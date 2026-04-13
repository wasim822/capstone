
"use client"; 
// Tells Next.js this is a client-side component (runs in the browser)

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/AuthProvider";
import { setAuthCookie } from "@/lib/authCookies";

export default function LoginPage() {

  const router = useRouter(); 
  // Used to navigate between pages (e.g., redirect after login)

  const { login } = useAuth(); 
  // Custom auth hook to manage authentication state globally

  // State for user input fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // State for UI feedback
  const [loading, setLoading] = useState(false); // shows loading state during login
  const [error, setError] = useState<string | null>(null); // stores error messages

  // Toggle password visibility (show/hide password)
  const [showPassword, setShowPassword] = useState(false);

  // Function to validate input fields before sending request
  function validate() {

    if (!username.trim()) {
      setError("Username or email is required");
      return false;
    }

    if (!password.trim()) {
      setError("Password is required");
      return false;
    }

    return true;
  }

  // Function that handles form submission (login process)
  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {

    e.preventDefault(); // Prevent page reload

    setError(null); // Clear previous errors

    if (!validate()) return; // Stop if validation fails

    setLoading(true); // Start loading state

    try {

      // Send login request to backend API
      const res = await fetch("http://localhost:4000/api/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          Username: username,
          Password: password
        })
      });

      // If response is not successful, throw error
      if (!res.ok) {
        throw new Error("Invalid username or password");
      }

      const data = await res.json();

      // Extract token from response
      // token is used for authenticating future requests and maintaining user session
      const token: string | undefined = data?.Data?.token;

      if (!token) {
        throw new Error("Invalid login response");
      }

      setAuthCookie(token); 
      // Store token in cookies (for persistence)
      // This allows the user to stay logged in across page refreshes and sessions

      await login(token); 
      // Update global auth state

      router.push("/dashboard"); 
      // Redirect user to dashboard after successful login

    } catch (err: unknown) {

      // Handle errors
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed");
      }

    } finally {
      setLoading(false); // Stop loading state
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header section */}
        <div style={styles.header}>
          <h1 style={styles.title}>Sign in</h1>
          <p style={styles.subtitle}>
            Enter your credentials to continue
          </p>
        </div>

        {/* Display error message if exists */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Login form */}
        <form onSubmit={handleLogin}>

          {/* Username input */}
          <label style={styles.label}>
            Username or Email
          </label>

          <input
            type="text"
            placeholder="Enter username or email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
          />

          {/* Password input */}
          <label style={styles.label}>
            Password
          </label>

          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"} 
              // Toggle between text/password
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />

            {/* Show/Hide password button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.showBtn}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

        </form>

        {/* Footer */}
        <div style={styles.footer}>
          Secure system access
        </div>

      </div>
    </div>
  );
}

// Styling object for the page (inline CSS styles)
const styles: Record<string, React.CSSProperties> = {

  // Full page layout
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f1f5f9",
    padding: "20px"
  },

  // Main login card container
  container: {
    width: "100%",
    maxWidth: "420px",
    background: "white",
    padding: "32px",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
  },

  // Header section spacing
  header: {
    marginBottom: "24px"
  },

  // Title styling
  title: {
    fontSize: "26px",
    marginBottom: "6px"
  },

  // Subtitle styling
  subtitle: {
    fontSize: "14px",
    color: "#64748b"
  },

  // Label for inputs
  label: {
    fontSize: "14px",
    fontWeight: 500,
    display: "block",
    marginBottom: "6px"
  },

  // Input field styling
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #cbd5f5",
    background: "#f8fafc",
    color: "#1e293b",
    fontSize: "14px",
    marginBottom: "18px",
    outline: "none"
  },

  // Show/hide password button styling
  showBtn: {
    position: "absolute",
    right: "10px",
    top: "12px",
    border: "none",
    background: "transparent",
    color: "#2563eb",
    cursor: "pointer",
    fontSize: "13px"
  },

  // Submit button styling
  button: {
    width: "100%",
    height: "44px",
    borderRadius: "8px",
    border: "none",
    background: "#2563eb",
    color: "white",
    fontWeight: 600,
    cursor: "pointer"
  },

  // Footer text styling
  footer: {
    marginTop: "20px",
    textAlign: "center",
    fontSize: "12px",
    color: "#94a3b8"
  },

  // Error message styling
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "10px",
    borderRadius: "6px",
    marginBottom: "18px",
    fontSize: "14px"
  }

};