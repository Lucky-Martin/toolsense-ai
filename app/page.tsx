import { Suspense } from "react";
import Authentication from "./components/Authentication";

export default function Home() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <Authentication />
    </Suspense>
  );
}
