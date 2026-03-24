"use client";
import { useState } from "react";
import { signUp } from "@/actions/authActions";

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const response = await signUp({
      email,
      password,
      name: username,
      username: username,
    });

    if (response && !response.success) {
      setError(response.message);
      setLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit}>
      <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
        <legend className="fieldset-legend">Register</legend>

        {error && (
          <div role="alert" className="alert alert-error alert-soft">
            <span>{error}</span>
          </div>
        )}

        <label className="label">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          className="input"
          placeholder="Email"
          required
        />

        <label className="label">Username</label>
        <input
          className="input"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
          }}
          placeholder="Username"
          required
        />

        <label className="label">Password</label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          placeholder="Password"
          required
        />

        <label className="label"> Confirm Password</label>
        <input
          type="password"
          className="input"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
          }}
          placeholder="Password"
          required
        />

        <button
          className="btn btn-primary mt-4"
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <span className="loading loading-dots loading-sm">loading...</span>
          ) : (
            "Register"
          )}
        </button>
      </fieldset>
    </form>
  );
}
