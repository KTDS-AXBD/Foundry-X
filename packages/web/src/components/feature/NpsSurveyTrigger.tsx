"use client";

import { useEffect, useRef, useState } from "react";
import { checkNpsSurvey, dismissNpsSurvey } from "@/lib/api-client";

interface NpsSurveyTriggerProps {
  onTrigger: (surveyId: string) => void;
}

export function NpsSurveyTrigger({ onTrigger }: NpsSurveyTriggerProps) {
  const checked = useRef(false);
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    checkNpsSurvey()
      .then((res) => {
        if (res.shouldShow && res.surveyId) {
          setSurveyId(res.surveyId);
          // Delay to not interrupt initial load
          setTimeout(() => setShow(true), 3000);
        }
      })
      .catch(() => {
        // silent — non-critical
      });
  }, []);

  useEffect(() => {
    if (show && surveyId) {
      onTrigger(surveyId);
      setShow(false);
    }
  }, [show, surveyId, onTrigger]);

  return null;
}

export function useNpsSurveyDismiss() {
  return async (surveyId: string) => {
    try {
      await dismissNpsSurvey(surveyId);
    } catch {
      // silent
    }
  };
}
