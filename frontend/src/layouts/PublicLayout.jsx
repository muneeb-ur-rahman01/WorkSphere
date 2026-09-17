import React, { useContext, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Heart, LogIn, Menu, X } from "lucide-react";
import { AppContext } from "../context/AppContext";
import image from "../assets/Images/logo.png";
import QueryWidget from "../shared/QueryWidget/QueryWidget";

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

     <header className="sticky top-0 z-50 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600  shadow-md">
  <div className="max-w-7xl mx-auto px-5 lg:px-8 h-20">

    {/* Desktop Header */}
    <div className="hidden lg:grid grid-cols-[1fr_auto_1fr] items-center h-full gap-6">

    
      {/* LEFT — Logo */}
      <Link
        to="/"
        onClick={() => setMenuOpen(false)}
        className="flex items-center gap-3 min-w-0"
      >
        <img
          src={image}
          alt="WorkSphere Logo"
          className="h-12 w-12 object-contain bg-white/10 p-1.5 rounded-lg shrink-0"
        />

        <div className="min-w-0">
          <h2 className="text-xl font-black text-white leading-none">
            WorkSphere
          </h2>

          <span className="block text-[10px] text-indigo-100 font-semibold italic leading-tight mt-1 whitespace-nowrap">
            Hopefelt Foundation's Flagship Management Platform
          </span>
        </div>
      </Link>


      {/* CENTER — Navigation */}
      <nav className="flex items-center justify-center gap-5 xl:gap-6 font-bold whitespace-nowrap">

        <Link
          to="/"
          className="text-sm text-white hover:text-indigo-200 transition"
        >
          Home
        </Link>

        <a
          href="#features"
          onClick={(e) => handleSectionLink(e, "features")}
          className="text-sm text-white hover:text-indigo-200 transition"
        >
          Features
        </a>

        <a
          href="#how-it-works"
          onClick={(e) => handleSectionLink(e, "how-it-works")}
          className="text-sm text-white hover:text-indigo-200 transition"
        >
          How It Works
        </a>

        <a
          href="#about"
          onClick={(e) => handleSectionLink(e, "about")}
          className="text-sm text-white hover:text-indigo-200 transition"
        >
          About
        </a>

        <a
          href="#pricing"
          onClick={(e) => handleSectionLink(e, "pricing")}
          className="text-sm text-white hover:text-indigo-200 transition"
        >
          Pricing
        </a>

        <Link
          to="/opportunities"
          className="text-sm text-white hover:text-indigo-200 transition"
        >
          Opportunities
        </Link>

      </nav>


      {/* RIGHT — Authentication */}
      <div className="flex items-center justify-end gap-2.5 font-bold">

        {currentUser ? (
          <>
            <span className="text-sm text-white whitespace-nowrap">
              Hi, {currentUser.fullName}
            </span>

            <button
              onClick={() => {
                if (currentUser.role === "SuperAdmin")
                  navigate("/super-admin/dashboard");
                else if (currentUser.role === "OrgAdmin")
                  navigate("/org-admin/dashboard");
                else
                  navigate("/staff/dashboard");
              }}
              className="px-4 py-2 rounded-lg bg-white text-indigo-600 text-sm font-bold shadow hover:bg-indigo-50 transition"
            >
              Go to Portal
            </button>

            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg border border-white/50 text-white text-sm hover:bg-indigo-700 transition"
            >
              Log Out
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login/org"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-indigo-600 text-sm font-bold shadow hover:bg-indigo-50 transition whitespace-nowrap"
            >
              <LogIn size={15} />
              Login
            </Link>

            <Link
              to="/register-org"
              className="px-4 py-2 rounded-lg border border-white text-white text-sm font-bold hover:bg-white hover:text-indigo-600 transition whitespace-nowrap"
            >
              Register workspace
            </Link>
          </>
        )}

      </div>
    </div>


    {/* Mobile Header */}
    <div className="lg:hidden h-20 flex items-center justify-between">

      <Link
        to="/"
        onClick={() => setMenuOpen(false)}
        className="flex items-center gap-3"
      >
        <img
          src={image}
          alt="WorkSphere Logo"
          className="h-11 w-11 object-contain bg-white/10 p-1 rounded-lg"
        />

        <div>
          <h2 className="text-xl font-black text-white leading-none">
            WorkSphere
          </h2>

          <span className="text-[9px] text-indigo-100 font-semibold italic">
            Hopefelt Foundation's Flagship Management Platform
          </span>
        </div>
      </Link>

      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="p-2 rounded-lg text-white hover:bg-indigo-700 transition"
      >
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

    </div>


    {/* Mobile Menu */}
    {menuOpen && (
      <div className="lg:hidden border-t border-indigo-700 bg-indigo-600">
        <div className="px-5 py-5 flex flex-col gap-4 font-bold">

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
            How It Works
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

          <Link
            to="/opportunities"
            onClick={() => setMenuOpen(false)}
            className="text-white hover:text-indigo-200"
          >
            Opportunities
          </Link>


          {!currentUser ? (
            <div className="pt-2 flex flex-col gap-3">

              <Link
                to="/login/org"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-white text-indigo-600 font-bold"
              >
                <LogIn size={16} />
                Login
              </Link>

              <Link
                to="/register-org"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center justify-center px-5 py-3 rounded-lg border border-white text-white font-bold hover:bg-white hover:text-indigo-600 transition"
              >
                Register NGO
              </Link>

            </div>
          ) : (
            <div className="pt-2 flex flex-col gap-3">

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
                className="w-full px-5 py-3 rounded-lg bg-white text-indigo-600 font-bold"
              >
                Go to Portal
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full px-5 py-3 rounded-lg border border-white/40 text-white"
              >
                Log Out
              </button>

            </div>
          )}

        </div>
      </div>
    )}

  </div>
</header>

      {/* ================= MAIN ================= */}

      <main className="flex-1">
        {children}
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white border-t border-indigo-700">
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
                    to="/login/org"
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
                  <Link to="/documentation" className="text-white hover:text-indigo-200 transition">Documentation</Link>
                </li>

                <li>
                  <Link to="/faqs" className="text-white hover:text-indigo-200 transition">FAQs</Link>
                </li>

                <li>
                  <Link to="/help-support" className="text-white hover:text-indigo-200 transition">Help & Support</Link>
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
                  <Link to="/privacy" className="text-white hover:text-indigo-200 transition">Privacy Policy</Link>
                </li>

                <li>
                  <Link to="/terms" className="text-white hover:text-indigo-200 transition">Terms & Conditions</Link>
                </li>

                <li>
                  <Link to="/security" className="text-white hover:text-indigo-200 transition">Security</Link>
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
      <QueryWidget />

    </div>
  );
};

export default PublicLayout;