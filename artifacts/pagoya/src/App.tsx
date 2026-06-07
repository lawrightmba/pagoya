import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import Bienvenida from "@/pages/Bienvenida";
import Juegos from "@/pages/Juegos";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PaymentProvider } from "@/context/PaymentContext";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import PaymentForm from "@/pages/PaymentForm";
import PaymentReview from "@/pages/PaymentReview";
import CardEntry from "@/pages/CardEntry";
import PaymentSuccess from "@/pages/PaymentSuccess";
import BillPaySelector from "@/pages/BillPaySelector";
import RepDashboard from "@/pages/RepDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import CashLoad from "@/pages/CashLoad";
import WalletHistorial from "@/pages/WalletHistorial";
import LoyaltyDashboard from "@/pages/LoyaltyDashboard";
import Register from "@/pages/Register";
import GuiaBlog from "@/pages/GuiaBlog";
import PagarCFE from "@/pages/PagarCFE";
import PagarTelmex from "@/pages/PagarTelmex";
import Recargas from "@/pages/Recargas";
import DepositoOXXO from "@/pages/DepositoOXXO";
import TerminosCondiciones from "@/pages/TerminosCondiciones";
import RepLogin from "@/pages/RepLogin";
import PagarCFEGuadalajara from "@/pages/PagarCFEGuadalajara";
import PagarServiciosGuadalajara from "@/pages/PagarServiciosGuadalajara";
import RecargasGuadalajara from "@/pages/RecargasGuadalajara";
import BlogTelmex from "@/pages/BlogTelmex";
import BlogRecargasTelcel from "@/pages/BlogRecargasTelcel";
import BlogAguaMexico from "@/pages/BlogAguaMexico";
import BlogOXXOPay from "@/pages/BlogOXXOPay";
import BlogPagarIzzi from "@/pages/BlogPagarIzzi";
import BlogPredialPV from "@/pages/BlogPredialPV";
import BlogSeguroCelular from "@/pages/BlogSeguroCelular";
import BlogCFETarde from "@/pages/BlogCFETarde";
import BlogMejoresApps from "@/pages/BlogMejoresApps";
import BlogServiciosPV from "@/pages/BlogServiciosPV";
import BlogDineroElectronico from "@/pages/BlogDineroElectronico";
import PagarAguaMonterrey from "@/pages/PagarAguaMonterrey";
import PagarAguaCdmx from "@/pages/PagarAguaCdmx";
import Enviar from "@/pages/Enviar";
import Verificar from "@/pages/Verificar";
import BankLink from "@/pages/BankLink";
import AvisoPrivacidad from "@/pages/AvisoPrivacidad";
import Deck from "@/pages/Deck";
import VideoPage from "@/pages/VideoPage";
import FounderBio from "@/pages/FounderBio";
import Confianza from "@/pages/Confianza";
import SupportChat from "@/components/SupportChat";
import BottomNav from "@/components/BottomNav";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? "");

const queryClient = new QueryClient();

function RouteRedirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => { navigate(to, { replace: true }); }, []);
  return null;
}

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      (window as any).gtag("config", "G-W3TP3N8W0T", { page_path: location });
    }
  }, [location]);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/registro"><RouteRedirect to="/register" /></Route>
      <Route path="/historial"><RouteRedirect to="/wallet/historial" /></Route>
      <Route path="/mis-pagos"><RouteRedirect to="/wallet/historial" /></Route>
      <Route path="/login"><RouteRedirect to="/" /></Route>
      <Route path="/pagos"><RouteRedirect to="/wallet/historial" /></Route>
      <Route path="/servicios" component={BillPaySelector} />
      <Route path="/pagar" component={PaymentForm} />
      <Route path="/revisar" component={PaymentReview} />
      <Route path="/tarjeta" component={CardEntry} />
      <Route path="/exito" component={PaymentSuccess} />
      <Route path="/cargar" component={CashLoad} />
      <Route path="/wallet/historial" component={WalletHistorial} />
      <Route path="/puntos" component={LoyaltyDashboard} />
      <Route path="/points" component={LoyaltyDashboard} />
      <Route path="/register" component={Register} />
      <Route path="/rep-dashboard" component={RepDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/guia-pagar-servicios-sin-cuenta-bancaria" component={GuiaBlog} />
      <Route path="/pagar-cfe" component={PagarCFE} />
      <Route path="/pagar-telmex" component={PagarTelmex} />
      <Route path="/recargas" component={Recargas} />
      <Route path="/deposito-oxxo" component={DepositoOXXO} />
      <Route path="/terminos-y-condiciones" component={TerminosCondiciones} />
      <Route path="/rep-login" component={RepLogin} />
      <Route path="/pagar-cfe-guadalajara" component={PagarCFEGuadalajara} />
      <Route path="/pagar-servicios-guadalajara" component={PagarServiciosGuadalajara} />
      <Route path="/recargas-guadalajara" component={RecargasGuadalajara} />
      <Route path="/pagar-telmex-sin-tarjeta" component={BlogTelmex} />
      <Route path="/recargas-telcel-efectivo" component={BlogRecargasTelcel} />
      <Route path="/pagar-agua-mexico" component={BlogAguaMexico} />
      <Route path="/pagar-agua-monterrey" component={PagarAguaMonterrey} />
      <Route path="/pagar-agua-cdmx" component={PagarAguaCdmx} />
      <Route path="/que-es-oxxo-pay" component={BlogOXXOPay} />
      <Route path="/pagar-izzi-sin-cuenta-bancaria" component={BlogPagarIzzi} />
      <Route path="/pagar-predial-puerto-vallarta" component={BlogPredialPV} />
      <Route path="/es-seguro-pagar-servicios-celular-mexico" component={BlogSeguroCelular} />
      <Route path="/que-pasa-si-pago-cfe-tarde" component={BlogCFETarde} />
      <Route path="/mejores-apps-pagar-servicios-mexico" component={BlogMejoresApps} />
      <Route path="/pagar-servicios-puerto-vallarta" component={BlogServiciosPV} />
      <Route path="/que-es-dinero-electronico-mexico" component={BlogDineroElectronico} />
      <Route path="/enviar" component={Enviar} />
      <Route path="/verificar" component={Verificar} />
      <Route path="/vincular-banco" component={BankLink} />
      <Route path="/aviso-de-privacidad" component={AvisoPrivacidad} />
      <Route path="/deck" component={Deck} />
      <Route path="/video" component={VideoPage} />
      <Route path="/lloyd" component={FounderBio} />
      <Route path="/juegos" component={Juegos} />
      <Route path="/confianza" component={Confianza} />
      <Route path="/pti" component={Confianza} />
      <Route path="/bienvenida" component={Bienvenida} />
      <Route path="/r/:repCode">
        {(params: { repCode: string }) => {
          useEffect(() => {
            window.location.replace(`/register?ref=${params.repCode}`);
          }, [params.repCode]);
          return null;
        }}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const [location] = useLocation();
  const isBienvenida = location === "/bienvenida";
  const isVincularBanco = location === "/vincular-banco";
  const isConfianza = location === "/confianza" || location === "/pti";
  const hideShell = isBienvenida || isVincularBanco || isConfianza;
  return (
    <>
      <Router />
      {!hideShell && <BottomNav />}
      {!hideShell && <SupportChat />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PaymentProvider>
          <Elements stripe={stripePromise}>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppShell />
            </WouterRouter>
          </Elements>
        </PaymentProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
