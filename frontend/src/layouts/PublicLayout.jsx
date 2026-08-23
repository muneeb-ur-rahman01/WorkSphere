import React, { useContext, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Heart, LogIn, Menu, X } from "lucide-react";
import { AppContext } from "../context/AppContext";
import image from "../assets/Images/logo.png";

const PublicLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useContext(AppContext);

  const [menuOpen, setMenuOpen] = useState(false);

  // Smoothly scrolls to a section on the home page. If we're on a
  // different page, navigate to home first and let Home.jsx scroll
  // to the section once it mounts — no full page/section "jump".
  const handleSectionLink = (e, sectionId) => {
    e.preventDefault();
    setMenuOpen(false);

    // If we are not on the home page, navigate home with state first
    if (location.pathname !== "/") {
      navigate("/", { state: { scrollTo: sectionId } });
      return;
    }

    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ================= HEADER ================= */}

      <header className="sticky top-0 z-50 bg-indigo-600 border-b border-indigo-700 shadow-md">
        <div className="max-w-7xl mx-auto px-5 lg:px-10 h-20 flex items-center justify-between">

          {/* Logo */}
          <Link 
            to="/"
            className="flex items-center gap-3 font-bold"
            onClick={() => setMenuOpen(false)}
          >
            <img
              src={image}
              alt="WorkSphere Logo"
              className="h-14 w-auto object-contain bg-white/10 p-1 rounded-lg"
            />

            <div className="flex flex-col">
              <h2 className="text-2xl font-black text-white leading-tight">
                Worksphere
              </h2>
              <span className="text-xs text-indigo-100 font-semibold tracking-wide italic">
                (Hopefelt Foundation's Flagship Management Platform)
              </span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <nav className="hidden lg:flex items-center gap-8 font-bold">
            <Link
              to="/"
              className="text-white hover:text-indigo-200 transition duration-300"
            >
              Home
            </Link>

            <a
              href="#features"
              onClick={(e) => handleSectionLink(e, "features")}
              className="text-white hover:text-indigo-200 transition duration-300"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleSectionLink(e, "how-it-works")}
              className="text-white hover:text-indigo-200 transition duration-300"
            >
              How It Works
            </a>

            <a
              href="#about"
              onClick={(e) => handleSectionLink(e, "about")}
              className="text-white hover:text-indigo-200 transition duration-300"
            >
              About
            </a>

            <a
              href="#pricing"
              onClick={(e) => handleSectionLink(e, "pricing")}
              className="text-white hover:text-indigo-200 transition duration-300"
            >
              Pricing
            </a>
          </nav>

          {/* Desktop Right */}
          {currentUser ? (
            <div className="hidden lg:flex items-center gap-3 font-bold">
              <span className="text-sm text-white">
                Hi, {currentUser.fullName}
              </span>

              <button
                onClick={() => {
                  if (currentUser.role === "SuperAdmin")
                    navigate("/super-admin/dashboard");
                  else if (currentUser.role === "OrgAdmin")
                    navigate("/org-admin/dashboard");
                  else navigate("/staff/dashboard");
                }}
                className="px-5 py-2.5 rounded-lg bg-white text-indigo-600 font-bold shadow hover:bg-indigo-50 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
              >
                Go to Portal
              </button>

              <button
                onClick={logout}
                className="px-5 py-2.5 rounded-lg border border-white/40 text-white hover:bg-indigo-700 transition-all duration-300"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-3 font-bold">
              <Link to="/login-choice">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-indigo-600 font-bold shadow hover:bg-indigo-50 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                  <LogIn size={16} />
                  Login
                </button>
              </Link>

              <Link to="/register-org">
                <button className="px-5 py-2.5 rounded-lg border border-white text-white font-bold hover:bg-white hover:text-indigo-600 transition-all duration-300">
                  Register NGO
                </button>
              </Link>
            </div>
          )}

          {/* Mobile Toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-lg text-white hover:bg-indigo-700 transition"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-indigo-700 bg-indigo-600 font-bold">
            <div className="px-5 py-5 flex flex-col gap-4">
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="text-white hover:text-indigo-200"
              >
                Home
              </Link>

              <a
                href="#features"
                onClick={(e) => handleSectionLink(e, "features")}
                className="text-white hover:text-indigo-200"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={(e) => handleSectionLink(e, "how-it-works")}
                className="text-white hover:text-indigo-200"
              >
                How it works
              </a>

              <a
                href="#about"
                onClick={(e) => handleSectionLink(e, "about")}
                className="text-white hover:text-indigo-200"
              >
                About
              </a>

              <a
                href="#pricing"
                onClick={(e) => handleSectionLink(e, "pricing")}
                className="text-white hover:text-indigo-200"
              >
                Pricing
              </a>

              {!currentUser ? (
                <>
                  <Link
                    to="/login-choice"
                    onClick={() => setMenuOpen(false)}
                  >
                    <button className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-white text-indigo-600 font-bold hover:bg-indigo-50 transition-all duration-300">
                      <LogIn size={16} />
                      Login
                    </button>
                  </Link>

                  <Link
                    to="/register-org"
                    onClick={() => setMenuOpen(false)}
                  >
                    <button className="w-full mt-3 px-5 py-3 rounded-lg border border-white text-white font-bold hover:bg-white hover:text-indigo-600 transition-all duration-300">
                      Register NGO
                    </button>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-white">
                    Hi, {currentUser.fullName}
                  </p>

                  <button
                    onClick={() => {
                      setMenuOpen(false);

                      if (currentUser.role === "SuperAdmin")
                        navigate("/super-admin/dashboard");
                      else if (currentUser.role === "OrgAdmin")
                        navigate("/org-admin/dashboard");
                      else
                        navigate("/staff/dashboard");
                    }}
                    className="w-full px-5 py-3 rounded-lg bg-white text-indigo-600 font-bold hover:bg-indigo-50 transition-all duration-300"
                  >
                    Go to Portal
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="w-full px-5 py-3 rounded-lg border border-white/40 text-white hover:bg-indigo-700 transition-all duration-300"
                  >
                    Log Out
                  </button>
                </>
              )}

            </div>
          </div>
        )}

      </header>

      {/* ================= MAIN ================= */}

      <main className="flex-1">
        {children}
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="bg-indigo-600 text-white border-t border-indigo-700">
        <div className="max-w-7xl mx-auto px-5 lg:px-10 py-14">
          <div className="grid gap-10 md:grid-cols-4 font-bold">

            {/* Brand / Info */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-5">
                <img
                  src={image}
                  alt="WorkSphere Logo"
                  className="h-14 w-auto object-contain bg-white/10 p-1 rounded-lg"
                />
                <h2 className="text-2xl font-black text-white">
                  WorkSphere
                </h2>
              </div>
              <p className="leading-6 text-white text-xs italic font-semibold">
                Built by Hopefelt Foundation’s IT & Technology Department to simplify the way organizations work, connect, and grow.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-lg font-black text-white mb-5">
                Product
              </h3>

              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="#features"
                    onClick={(e) => handleSectionLink(e, "features")}
                    className="text-white hover:text-indigo-200 transition"
                  >
                    Features
                  </a>
                </li>

                <li>
                  <a
                    href="#about"
                    onClick={(e) => handleSectionLink(e, "about")}
                    className="text-white hover:text-indigo-200 transition"
                  >
                    About WorkSphere
                  </a>
                </li>

                <li>
                  <a
                    href="#how-it-works"
                    onClick={(e) => handleSectionLink(e, "how-it-works")}
                    className="text-white hover:text-indigo-200 transition"
                  >
                    How It Works
                  </a>
                </li>

                <li>
                  <a
                    href="#pricing"
                    onClick={(e) => handleSectionLink(e, "pricing")}
                    className="text-white hover:text-indigo-200 transition"
                  >
                    Pricing
                  </a>
                </li>

                <li>
                  <Link
                    to="/register-org"
                    className="text-white hover:text-indigo-200 transition"
                  >
                    Register Organization
                  </Link>
                </li>

                <li>
                  <Link
                    to="/login-choice"
                    className="text-white hover:text-indigo-200 transition"
                  >
                    Enter Workspace
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-lg font-black text-white mb-5">
                Resources
              </h3>

              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#" className="text-white hover:text-indigo-200 transition">
                    Documentation
                  </a>
                </li>

                <li>
                  <a href="#" className="text-white hover:text-indigo-200 transition">
                    FAQs
                  </a>
                </li>

                <li>
                  <a href="#" className="text-white hover:text-indigo-200 transition">
                    Help & Support
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-lg font-black text-white mb-5">
                Legal
              </h3>

              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#" className="text-white hover:text-indigo-200 transition">
                    Privacy Policy
                  </a>
                </li>

                <li>
                  <a href="#" className="text-white hover:text-indigo-200 transition">
                    Terms & Conditions
                  </a>
                </li>

                <li>
                  <a href="#" className="text-white hover:text-indigo-200 transition">
                    Security
                  </a>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom Bar with White Background */}
        <div className="bg-white border-t border-gray-200 py-6">
          <div className="max-w-7xl mx-auto px-5 lg:px-10 flex justify-center items-center">
            <p className="text-sm font-bold text-gray-800 text-center">
              © 2026 WorkSphere. All Rights Reserved. · A Flagship Digital Product of Hopefelt Foundation
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default PublicLayout;