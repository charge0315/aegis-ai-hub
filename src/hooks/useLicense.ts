import { useState, useEffect, useCallback } from 'react';
import type { LicenseState, FeatureGate } from '../services/LicenseManager';

export interface UpdateEvent {
  type: 'available' | 'downloaded' | 'error';
  info?: unknown;
  message?: string;
}

export function useLicense() {
  const [licenseState, setLicenseState] = useState<LicenseState | null>(null);
  const [featureGates, setFeatureGates] = useState<FeatureGate | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [updateEvent, setUpdateEvent] = useState<UpdateEvent | null>(null);

  const refresh = useCallback(async () => {
    if (!window.nexusApi?.getLicenseState) return;
    const [state, gates] = await Promise.all([
      window.nexusApi.getLicenseState(),
      window.nexusApi.getFeatureGates(),
    ]);
    setLicenseState(state);
    setFeatureGates(gates);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();

    // ライセンス変更イベントを購読
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<LicenseState>).detail;
      setLicenseState(detail);
      window.nexusApi.getFeatureGates().then(setFeatureGates);
    };
    window.addEventListener('license-changed', handler);

    // アップデートイベント
    const unsubUpdate = window.nexusApi?.onUpdateEvent?.((data) => setUpdateEvent(data));

    return () => {
      window.removeEventListener('license-changed', handler);
      unsubUpdate?.();
    };
  }, [refresh]);

  const activate = useCallback(async (key: string, email: string) => {
    setIsActivating(true);
    try {
      const result = await window.nexusApi.activateLicense(key, email);
      if (result.success) await refresh();
      return result;
    } finally {
      setIsActivating(false);
    }
  }, [refresh]);

  const deactivate = useCallback(async () => {
    await window.nexusApi.deactivateLicense();
    await refresh();
  }, [refresh]);

  const canUse = useCallback((feature: keyof FeatureGate): boolean => {
    return featureGates?.[feature] ?? false;
  }, [featureGates]);

  const checkForUpdates = useCallback(async () => {
    return window.nexusApi.checkForUpdates?.();
  }, []);

  const installUpdate = useCallback(async () => {
    return window.nexusApi.installUpdate?.();
  }, []);

  return {
    licenseState,
    featureGates,
    isPro: licenseState?.tier === 'pro',
    isActivating,
    updateEvent,
    canUse,
    activate,
    deactivate,
    checkForUpdates,
    installUpdate,
  };
}
