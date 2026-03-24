"use client";
import React from "react";
import { useState } from "react";
import { signIn } from "@/actions/authActions";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    console.log({ username, password });

    const response = await signIn({
      username,
      password,
    });
    if (response && !response.success) {
      setError(response.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
        <legend className="fieldset-legend">Login</legend>
        {error && (
          <div role="alert" className="alert alert-error alert-soft">
            <span>{error}</span>
          </div>
        )}

        <label className="label">Username</label>
        <input
          className="input"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <label className="label">Password</label>
        <input
          type="password"
          className="input"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
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
            "Login"
          )}
        </button>
      </fieldset>
    </form>
  );
}
