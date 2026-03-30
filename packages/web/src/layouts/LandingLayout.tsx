import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export function LandingLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
