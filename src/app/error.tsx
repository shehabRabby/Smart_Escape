"use client";

import { useEffect } from "react";
import { useLanguage } from "@/components/language-provider";

export default function SimulationError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLanguage();
  useEffect(() => { console.error("Unexpected simulation rendering failure", error); }, [error]);
  return <main className="main-content failure-page" role="alert"><h1>{t("unexpectedError")}</h1><p>{t("errorHelp")}</p><button className="reset-button" onClick={reset}>{t("recoverError")}</button></main>;
}
