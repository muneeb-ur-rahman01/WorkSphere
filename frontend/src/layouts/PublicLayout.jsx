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

      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 lg:px-10 h-20 flex items-center justify-between">

          {/* Logo */}
          <Link 
            to="/"
            className="flex items-center gap-3"
            onClick={() => setMenuOpen(false)}
          >
            <img
              src={image}
              alt="WorkSphere Logo"
              className="h-14 w-auto object-contain"
            />

            <div className="flex flex-col">
              <h2 className="text-2xl font-extrabold text-black leading-tight">
                Worksphere
              </h2>
              <span className="text-xs text-gray-500 font-medium tracking-wide italic">
                (Hopefelt Foundation's Flagship Management Platform)
              </span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link
              to="/"
              className="text-gray-600 hover:text-indigo-600 transition duration-300 font-medium"
            >
              Home
            </Link>

            <a
              href="#features"
              onClick={(e) => handleSectionLink(e, "features")}
              className="text-gray-600 hover:text-indigo-600 transition duration-300 font-medium"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleSectionLink(e, "how-it-works")}
              className="text-gray-600 hover:text-indigo-600 transition duration-300 font-medium"
            >
              How It Works
            </a>

            <a
              href="#about"
              onClick={(e) => handleSectionLink(e, "about")}
              className="text-gray-600 hover:text-indigo-600 transition duration-300 font-medium"
            >
              About
            </a>

            <a
              href="#pricing"
              onClick={(e) => handleSectionLink(e, "pricing")}
              className="text-gray-600 hover:text-indigo-600 transition duration-300 font-medium"
            >
              Pricing
            </a>
          </nav>

          {/* Desktop Right */}
          {currentUser ? (
            <div className="hidden lg:flex items-center gap-3">
              <span className="text-sm text-gray-500">
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
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium shadow hover:bg-indigo-700 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
              >
                Go to Portal
              </button>

              <button
                onClick={logout}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all duration-300"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-3">
              <Link to="/login-choice">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium shadow hover:bg-indigo-700 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                  <LogIn size={16} />
                  Login
                </button>
              </Link>

              <Link to="/register-org">
                <button className="px-5 py-2.5 rounded-lg border border-indigo-600 text-indigo-600 font-medium hover:bg-indigo-600 hover:text-white transition-all duration-300">
                  Register NGO
                </button>
              </Link>
            </div>
          )}

          {/* Mobile Toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="lg:hidden border-t bg-white">
            <div className="px-5 py-5 flex flex-col gap-4">
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="font-medium text-gray-700 hover:text-indigo-600"
              >
                Home
              </Link>

              <a
                href="#features"
                onClick={(e) => handleSectionLink(e, "features")}
                className="font-medium text-gray-700 hover:text-indigo-600"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={(e) => handleSectionLink(e, "how-it-works")}
                className="font-medium text-gray-700 hover:text-indigo-600"
              >
                How it works
              </a>

              <a
                href="#about"
                onClick={(e) => handleSectionLink(e, "about")}
                className="font-medium text-gray-700 hover:text-indigo-600"
              >
                About
              </a>

              <a
                href="#pricing"
                onClick={(e) => handleSectionLink(e, "pricing")}
                className="font-medium text-gray-700 hover:text-indigo-600"
              >
                Pricing
              </a>

              {!currentUser ? (
                <>
                  <Link
                    to="/login-choice"
                    onClick={() => setMenuOpen(false)}
                  >
                    <button className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-all duration-300">
                      <LogIn size={16} />
                      Login
                    </button>
                  </Link>

                  <Link
                    to="/register-org"
                    onClick={() => setMenuOpen(false)}
                  >
                    <button className="w-full mt-3 px-5 py-3 rounded-lg border border-indigo-600 text-indigo-600 font-medium hover:bg-indigo-600 hover:text-white transition-all duration-300">
                      Register NGO
                    </button>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500">
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
                    className="w-full px-5 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-all duration-300"
                  >
                    Go to Portal
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="w-full px-5 py-3 rounded-lg border border-gray-300 hover:bg-gray-100 transition-all duration-300"
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
      <footer className="bg-white text-gray-800 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-5 lg:px-10 py-14">
          <div className="grid gap-10 md:grid-cols-4">

            {/* Brand / Info */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-5">
                <img
                  src={image}
                  alt="WorkSphere Logo"
                  className="h-14 w-auto object-contain"
                />
                <h2 className="text-2xl font-bold text-black">
                  WorkSphere
                </h2>
              </div>
              <p className="leading-6 text-gray-500 text-xs italic">
                Built by Hopefelt Foundation’s IT & Technology Department to simplify the way organizations work, connect, and grow.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-5">
                Product
              </h3>

              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="#features"
                    onClick={(e) => handleSectionLink(e, "features")}
                    className="text-gray-700 hover:text-indigo-600 transition"
                  >
                    Features
                  </a>
                </li>

                <li>
                  <a
                    href="#about"
                    onClick={(e) => handleSectionLink(e, "about")}
                    className="text-gray-700 hover:text-indigo-600 transition"
                  >
                    About WorkSphere
                  </a>
                </li>

                <li>
                  <a
                    href="#how-it-works"
                    onClick={(e) => handleSectionLink(e, "how-it-works")}
                    className="text-gray-700 hover:text-indigo-600 transition"
                  >
                    How It Works
                  </a>
                </li>

                <li>
                  <a
                    href="#pricing"
                    onClick={(e) => handleSectionLink(e, "pricing")}
                    className="text-gray-700 hover:text-indigo-600 transition"
                  >
                    Pricing
                  </a>
                </li>

                <li>
                  <Link
                    to="/register-org"
                    className="text-gray-700 hover:text-indigo-600 transition"
                  >
                    Register Organization
                  </Link>
                </li>

                <li>
                  <Link
                    to="/login-choice"
                    className="text-gray-700 hover:text-indigo-600 transition"
                  >
                    Enter Workspace
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-5">
                Resources
              </h3>

              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#" className="text-gray-700 hover:text-indigo-600 transition">
                    Documentation
                  </a>
                </li>

                <li>
                  <a href="#" className="text-gray-700 hover:text-indigo-600 transition">
                    FAQs
                  </a>
                </li>

                <li>
                  <a href="#" className="text-gray-700 hover:text-indigo-600 transition">
                    Help & Support
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-5">
                Legal
              </h3>

              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#" className="text-gray-700 hover:text-indigo-600 transition">
                    Privacy Policy
                  </a>
                </li>

                <li>
                  <a href="#" className="text-gray-700 hover:text-indigo-600 transition">
                    Terms & Conditions
                  </a>
                </li>

                <li>
                  <a href="#" className="text-gray-700 hover:text-indigo-600 transition">
                    Security
                  </a>
                </li>
              </ul>
            </div>

          </div>

          <div className="border-t border-gray-200 mt-12 pt-6 flex justify-center items-center">
            <p className="text-sm text-gray-600 text-center">
              © 2026 WorkSphere. All Rights Reserved. · A Flagship Digital Product of Hopefelt Foundation
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default PublicLayout;