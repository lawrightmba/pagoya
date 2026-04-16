import { Switch, Route, Router as WouterRouter } from "wouter";
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

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? "");

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/servicios" component={BillPaySelector} />
      <Route path="/pagar" component={PaymentForm} />
      <Route path="/revisar" component={PaymentReview} />
      <Route path="/tarjeta" component={CardEntry} />
      <Route path="/exito" component={PaymentSuccess} />
      <Route path="/cargar" component={CashLoad} />
      <Route path="/rep-dashboard" component={RepDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PaymentProvider>
          <Elements stripe={stripePromise}>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </Elements>
        </PaymentProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
