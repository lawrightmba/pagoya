import { useLocation } from "wouter";
import { Home, Zap, Trophy, History, CreditCard } from "lucide-react";

const BILL_PAY_PATHS = ["/servicios", "/pagar", "/revisar", "/tarjeta", "/exito"];
const REWARDS_PATHS  = ["/puntos", "/points", "/juegos"];

const TABS = [
  {
    path: "/",
    icon: Home,
    label: "Inicio",
    matchPaths: ["/"],
  },
  {
    path: "/servicios",
    icon: Zap,
    label: "Pagar",
    matchPaths: BILL_PAY_PATHS,
  },
  {
    path: "/puntos",
    icon: Trophy,
    label: "Recompensas",
    matchPaths: REWARDS_PATHS,
  },
  {
    path: "/wallet/historial",
    icon: History,
    label: "Historial",
    matchPaths: ["/wallet/historial"],
  },
  {
    path: "/cargar",
    icon: CreditCard,
    label: "Cargar",
    matchPaths: ["/cargar"],
  },
];

const SHOW_ON = new Set([
  "/", "/servicios", "/pagar", "/revisar", "/tarjeta", "/exito",
  "/cargar", "/wallet/historial", "/puntos", "/points",
  "/verificar", "/juegos",
]);

function isActive(location: string, matchPaths: string[]): boolean {
  return matchPaths.some((p) => {
    if (p === "/") return location === "/";
    return location === p || location.startsWith(p + "?") || location.startsWith(p + "/");
  });
}

export default function BottomNav() {
  const [location, navigate] = useLocation();

  if (!SHOW_ON.has(location.split("?")[0])) return null;

  return (
    <>
      {/* Spacer so page content isn't hidden behind the bar */}
      <div style={{ height: "68px" }} />

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "#005432",
          borderTop: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          alignItems: "stretch",
          height: "60px",
          paddingBottom: "env(safe-area-inset-bottom)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.25)",
        }}
      >
        {TABS.map(({ path, icon: Icon, label, matchPaths }) => {
          const active = isActive(location, matchPaths);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "3px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "6px 2px",
                transition: "opacity 0.15s",
                position: "relative",
              }}
            >
              {/* Active indicator pill */}
              {active && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "28px",
                    height: "3px",
                    borderRadius: "0 0 4px 4px",
                    background: "#00C875",
                  }}
                />
              )}
              <Icon
                style={{
                  width: "20px",
                  height: "20px",
                  color: active ? "#00C875" : "rgba(255,255,255,0.55)",
                  strokeWidth: active ? 2.5 : 1.8,
                }}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: active ? 800 : 500,
                  color: active ? "#00C875" : "rgba(255,255,255,0.55)",
                  lineHeight: 1,
                  letterSpacing: "0.01em",
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
