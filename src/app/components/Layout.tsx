import { Outlet, Link, useLocation } from "react-router";
import { BarChart3 } from "lucide-react";

export function Layout() {
  const location = useLocation();
  
  const variants = [
    { path: "/variant-1", label: "Variant 1: Side-by-Side" },
    { path: "/variant-2", label: "Variant 2: Card Flow" },
    { path: "/variant-3", label: "Variant 3: Dashboard" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <BarChart3 className="size-8 text-blue-600" />
              <div>
                <h1 className="font-semibold text-gray-900">BidEvaluator Pro</h1>
                <p className="text-xs text-gray-500">GC Estimator Platform</p>
              </div>
            </div>
            <nav className="flex gap-2">
              {variants.map((variant) => (
                <Link
                  key={variant.path}
                  to={variant.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === variant.path
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {variant.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
