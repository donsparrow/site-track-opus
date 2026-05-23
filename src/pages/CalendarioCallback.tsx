import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { googleCalendar } from "@/lib/googleCalendar";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function CalendarioCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Conectando ao Google Calendar...");

  useEffect(() => {
    const code = params.get("code");
    const error = params.get("error");
    const redirect_uri = `${window.location.origin}/calendario/callback`;

    if (error) {
      toast.error(`Google retornou erro: ${error}`);
      navigate("/calendario");
      return;
    }
    if (!code) {
      navigate("/calendario");
      return;
    }
    googleCalendar
      .exchange(code, redirect_uri)
      .then((r) => {
        toast.success(`Conta ${r.email} conectada!`);
        navigate("/calendario", { replace: true });
      })
      .catch((e) => {
        setMsg(`Erro: ${e.message}`);
        toast.error(e.message);
      });
  }, [params, navigate]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground">{msg}</p>
    </div>
  );
}
