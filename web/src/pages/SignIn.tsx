import { signIn } from "../lib/auth";

export default function SignIn() {
  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    const { data, error } = await signIn(
      e.email,
      e.password
    );

    if (error) {
      console.error(error.message);
      return;
    }

    console.log(data);
  }

  return (
    <>
      <div className="sign__in__element">
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Enter your email" />
          <input type="password" placeholder="Enter your password" />
          <button type="submit">Sign In</button>
        </form>
        <div className="sign__up__element">
          <button>Don't have an account? Sign up instead.</button>
        </div>
      </div>
    </>
  );
}
