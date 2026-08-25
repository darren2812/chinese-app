import { signUp } from "../lib/auth";
import { useState } from "react";
import { useNavigate } from "react-router";

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    if (typeof email !== "string" || typeof password !== "string") return;

    const { data, error } = await signUp(email, password);

    setLoading(false);

    if (error) {
      console.error(error.message);
      return;
    }

    console.log(data);

    navigate("/app");
  }

  return (
    <>
      <div className="auth__element">
        <form method="post" onSubmit={handleSubmit}>
          <input name="email" type="email" placeholder="Enter your email" />
          <input
            name="password"
            type="password"
            placeholder="Enter your password"
          />
          <button type="submit" disabled={loading}>
            {loading ? "Signing up..." : "Sign up"}
          </button>
        </form>
      </div>
    </>
  );
}
