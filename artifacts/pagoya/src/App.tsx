import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import Bienvenida from "@/pages/Bienvenida";
import Juegos from "@/pages/Juegos";
import { useEffect } from "react";
import { WhatsAppConsentBanner } from "@/components/WhatsAppConsentBanner";
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
import PagarAguaMonterreyEnLinea from "@/pages/PagarAguaMonterreyEnLinea";
import PagarGasNaturalMonterrey from "@/pages/PagarGasNaturalMonterrey";
import PagarServiciosMonterrey from "@/pages/PagarServiciosMonterrey";
import PagarAguaCdmx from "@/pages/PagarAguaCdmx";
import Enviar from "@/pages/Enviar";
import Verificar from "@/pages/Verificar";
import BankLink from "@/pages/BankLink";
import AvisoPrivacidad from "@/pages/AvisoPrivacidad";
import Deck from "@/pages/Deck";
import VideoPage from "@/pages/VideoPage";
import FounderBio from "@/pages/FounderBio";
import Confianza from "@/pages/Confianza";
import Cumplimiento from "@/pages/Cumplimiento";
import Atencion from "@/pages/Atencion";
import LandingCFESinBanco from "@/pages/LandingCFESinBanco";
import LandingTelmexEfectivo from "@/pages/LandingTelmexEfectivo";
import LandingRecargarSinTarjeta from "@/pages/LandingRecargarSinTarjeta";
import LandingLuzSinBanco from "@/pages/LandingLuzSinBanco";
import PagarCFEMonterrey from "@/pages/PagarCFEMonterrey";
import PagarCFECdmx from "@/pages/PagarCFECdmx";
import PagarAguaGuadalajara from "@/pages/PagarAguaGuadalajara";
import PagarCFEDesdeUSA from "@/pages/PagarCFEDesdeUSA";
import SpinWheel from "@/pages/SpinWheel";
import PagarAguaVallarta from "@/pages/PagarAguaVallarta";
import PagarTelmexVallarta from "@/pages/PagarTelmexVallarta";
import PagarCFEVallarta from "@/pages/PagarCFEVallarta";
import PagarInternetVallarta from "@/pages/PagarInternetVallarta";
import PagarAguaTijuana from "@/pages/PagarAguaTijuana";
import PagarPredialVallarta from "@/pages/PagarPredialVallarta";
import PagarIzziVallarta from "@/pages/PagarIzziVallarta";
import PagarTelcelVallarta from "@/pages/PagarTelcelVallarta";
import PagarTotalPlayVallarta from "@/pages/PagarTotalPlayVallarta";
import EmilianoZapataVallarta from "@/pages/colonias/EmilianoZapataVallarta";
import VersallesVallarta from "@/pages/colonias/VersallesVallarta";
import CincoDeDiciembreVallarta from "@/pages/colonias/CincoDeDiciembreVallarta";
import PitilalVallarta from "@/pages/colonias/PitilalVallarta";
import FluvialVallarta from "@/pages/colonias/FluvialVallarta";
import LasJuntasVallarta from "@/pages/colonias/LasJuntasVallarta";
import ZonaRomanticaVallarta from "@/pages/colonias/ZonaRomanticaVallarta";
import MarinaVallarta from "@/pages/colonias/MarinaVallarta";
import EmployerOnePager from "@/pages/EmployerOnePager";
import SupportChat from "@/components/SupportChat";
import BottomNav from "@/components/BottomNav";
import GlobalFooter from "@/components/GlobalFooter";
import ComisionesYCargos from "@/pages/ComisionesYCargos";
import Seguridad from "@/pages/Seguridad";
import ComoPresentarUnaQueja from "@/pages/ComoPresentarUnaQueja";
import FAQ from "@/pages/FAQ";

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
      <Route path="/pagar-agua-monterrey-en-linea" component={PagarAguaMonterreyEnLinea} />
      <Route path="/pagar-gas-natural-monterrey" component={PagarGasNaturalMonterrey} />
      <Route path="/pagar-servicios-monterrey" component={PagarServiciosMonterrey} />
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
      <Route path="/cumplimiento" component={Cumplimiento} />
      <Route path="/deck" component={Deck} />
      <Route path="/video" component={VideoPage} />
      <Route path="/lloyd" component={FounderBio} />
      <Route path="/juegos" component={Juegos} />
      <Route path="/confianza" component={Confianza} />
      <Route path="/pti" component={Confianza} />
      <Route path="/pagar-cfe-sin-banco" component={LandingCFESinBanco} />
      <Route path="/pagar-telmex-en-linea-efectivo" component={LandingTelmexEfectivo} />
      <Route path="/recargar-saldo-sin-tarjeta" component={LandingRecargarSinTarjeta} />
      <Route path="/pagar-luz-sin-banco" component={LandingLuzSinBanco} />
      <Route path="/pagar-cfe-monterrey" component={PagarCFEMonterrey} />
      <Route path="/pagar-cfe-cdmx" component={PagarCFECdmx} />
      <Route path="/pagar-agua-guadalajara" component={PagarAguaGuadalajara} />
      <Route path="/pagar-agua-vallarta" component={PagarAguaVallarta} />
      <Route path="/pagar-telmex-vallarta" component={PagarTelmexVallarta} />
      <Route path="/pagar-cfe-vallarta" component={PagarCFEVallarta} />
      <Route path="/pagar-internet-vallarta" component={PagarInternetVallarta} />
      <Route path="/pagar-agua-tijuana" component={PagarAguaTijuana} />
      <Route path="/pagar-predial-vallarta" component={PagarPredialVallarta} />
      <Route path="/pagar-izzi-vallarta" component={PagarIzziVallarta} />
      <Route path="/pagar-telcel-vallarta" component={PagarTelcelVallarta} />
      <Route path="/pagar-totalplay-vallarta" component={PagarTotalPlayVallarta} />
      <Route path="/emiliano-zapata-vallarta" component={EmilianoZapataVallarta} />
      <Route path="/versalles-vallarta" component={VersallesVallarta} />
      <Route path="/5-de-diciembre-vallarta" component={CincoDeDiciembreVallarta} />
      <Route path="/pitillal-vallarta" component={PitilalVallarta} />
      <Route path="/fluvial-vallarta" component={FluvialVallarta} />
      <Route path="/las-juntas-vallarta" component={LasJuntasVallarta} />
      <Route path="/zona-romantica-vallarta" component={ZonaRomanticaVallarta} />
      <Route path="/marina-vallarta" component={MarinaVallarta} />
      <Route path="/pagar-cfe-desde-usa" component={PagarCFEDesdeUSA} />
      <Route path="/spin" component={SpinWheel} />
      <Route path="/ruleta" component={SpinWheel} />
      <Route path="/bienvenida" component={Bienvenida} />
      <Route path="/atencion" component={Atencion} />
      <Route path="/comisiones-y-cargos" component={ComisionesYCargos} />
      <Route path="/seguridad" component={Seguridad} />
      <Route path="/como-presentar-una-queja" component={ComoPresentarUnaQueja} />
      <Route path="/faq" component={FAQ} />
      <Route path="/employer">{() => <EmployerOnePager defaultLang="en" />}</Route>
      <Route path="/empresa">{() => <EmployerOnePager defaultLang="es" />}</Route>
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
  const isVincularBanco = location === "/vincular-banco";
  const isPublicOnePager = location === "/employer" || location === "/empresa";
  // BottomNav hidden on full-screen onboarding flows and public standalone pages
  const hideBottomNav = isVincularBanco || isPublicOnePager;
  // SupportChat (Paula) hidden on same
  const hideSupportChat = isVincularBanco || isPublicOnePager;
  return (
    <>
      <Router />
      {!hideBottomNav && <GlobalFooter />}
      {!hideBottomNav && <BottomNav />}
      {!hideSupportChat && <SupportChat />}
      {!hideBottomNav && <WhatsAppConsentBanner />}
    </>
  );
}

function App() {
  // WS3.3 — capture the entry (landing) page path once per session so a signup
  // can be attributed to the landing page that brought the user in.
  useEffect(() => {
    if (!sessionStorage.getItem("pagoya_landing_page")) {
      sessionStorage.setItem("pagoya_landing_page", window.location.pathname);
    }
  }, []);
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
