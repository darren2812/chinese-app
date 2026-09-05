import { createBrowserRouter, Navigate } from "react-router";
import AppLayout from "./components/AppLayout";
import Chat from "./pages/Chat";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import LearningItems from "./pages/LearningItems";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/sign-in" replace />,
  },
  {
    path: "/sign-in",
    Component: SignIn,
  },
  {
    path: "/sign-up",
    Component: SignUp,
  },
  {
    path: "/app",
    Component: AppLayout,
    children: [
      {
        index: true,
        Component: Chat,
      },
      {
        path: "learning-items",
        Component: LearningItems,
      },
      {
        path: "chat/:conversationId",
        Component: Chat,
      },
    ],
  },
]);
