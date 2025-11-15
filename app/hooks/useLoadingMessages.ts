import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/app/contexts/TranslationContext";

const LOADING_MESSAGE_KEYS = [
  "analyzingCompanySecurityPosture",
  "researchingVendorReputation",
  "scanningCVEDatabases",
  "reviewingComplianceCertifications",
  "assessingDataHandlingPractices",
  "evaluatingSecurityIncidents",
  "checkingCISAKEVCatalog",
  "reviewingSOC2Reports",
  "analyzingISOCertifications",
  "examiningVendorPSIRTPages",
  "reviewingTermsOfService",
  "assessingDeploymentControls",
  "evaluatingAuthenticationMethods",
  "reviewingSecurityAdvisories",
  "analyzingTrustFactors",
  "calculatingRiskScore",
  "researchingSaferAlternatives",
  "reviewingIncidentResponseHistory",
  "checkingBugBountyPrograms",
  "analyzingAPISecurity",
  "reviewingDataEncryptionPractices",
  "evaluatingAccessControls",
  "researchingMarketPosition",
  "analyzingFinancialStability",
  "reviewingCustomerTestimonials",
  "checkingThirdPartyAudits",
  "evaluatingPatchResponsiveness",
  "researchingAbuseSignals",
  "analyzingDataResidency",
  "reviewingPrivacyPolicies",
  "checkingGDPRCompliance",
  "evaluatingAdministrativeControls",
  "researchingSecurityBestPractices",
  "analyzingIntegrationCapabilities",
  "reviewingAuditLoggingFeatures",
];

export function useLoadingMessages(isLoading: boolean) {
  const { t } = useTranslation();
  const [currentMessage, setCurrentMessage] = useState("");
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getLoadingMessages = () => {
    return LOADING_MESSAGE_KEYS.map(key => t(`chatbot.loadingMessages.${key}`));
  };

  useEffect(() => {
    if (isLoading) {
      const loadingMessages = getLoadingMessages();
      const randomIndex = Math.floor(Math.random() * loadingMessages.length);
      setCurrentMessage(loadingMessages[randomIndex]);

      loadingIntervalRef.current = setInterval(() => {
        setCurrentMessage((current) => {
          const availableMessages = loadingMessages.filter(
            (msg) => msg !== current
          );

          if (availableMessages.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableMessages.length);
            return availableMessages[randomIndex];
          }
          return current;
        });
      }, 2000);
    } else {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
      setCurrentMessage("");
    }

    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    };
  }, [isLoading, t]);

  return currentMessage;
}

