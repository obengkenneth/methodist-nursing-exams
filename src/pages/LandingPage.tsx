import React from "react";
import { Link } from "react-router-dom";
import mugLogo from "@/assets/mug-logo.png";
import { GraduationCap } from "lucide-react";

/**
 * Public landing page — logo, short blurb, Sign in CTA.
 * Root "/" shows this; "Sign in" goes to /login.
 */
const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen auth-page-bg flex flex-col">
      <div className="bg-primary-dark border-b border-primary-dark py-2 px-6 shadow-sm">
      <p className="text-xs text-primary-foreground/70 text-center flex items-center justify-center gap-1.5">
          <GraduationCap size={14} className="flex-shrink-0" />
          Methodist University Ghana — Faculty of Nursing and Midwifery
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <img
            src={mugLogo}
            alt="Methodist University Ghana"
            className="h-24 mx-auto mb-6 object-contain"
          />
          <h1 className="font-heading text-2xl font-medium text-foreground mb-2">
            Nursing Exam Portal
          </h1>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
            Access your exams and results for the Faculty of Nursing and Midwifery.
          </p>
          <Link
            to="/login"
            className="btn-primary inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium"
          >
            Sign in
          </Link>
          <p className="text-xs text-muted-foreground mt-6">
            First time? Contact your department for access.
          </p>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-6">
        © {new Date().getFullYear()} Methodist University Ghana. All rights reserved.
      </p>
    </div>
  );
};

export default LandingPage;
