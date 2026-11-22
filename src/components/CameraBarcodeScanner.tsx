import React, {useEffect, useRef, useState} from 'react';
import {Camera, CameraOff} from 'lucide-react';

interface CameraBarcodeScannerProps {
  onDetected: (code: string) => void;
}

interface BarcodeDetectorResult {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>;
}

export const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({onDetected}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const stopCamera = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setStatusMsg(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatusMsg('Este navegador no permite acceso directo a la cámara.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {facingMode: {ideal: 'environment'}},
        audio: false,
      });
      streamRef.current = stream;
      setActive(true);

      requestAnimationFrame(async () => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const DetectorCtor = (
          window as unknown as {
            BarcodeDetector?: new (opts: {formats: string[]}) => BarcodeDetectorInstance;
          }
        ).BarcodeDetector;

        if (!DetectorCtor) {
          setStatusMsg(
            'Cámara activa. Si tu navegador no soporta BarcodeDetector automático, escribe o usa lector USB.'
          );
          return;
        }

        const detector = new DetectorCtor({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a'],
        });

        let lastTick = 0;
        const scanFrame = async (ts: number) => {
          if (!streamRef.current || !videoRef.current) return;
          if (ts - lastTick > 350 && videoRef.current.readyState >= 2) {
            lastTick = ts;
            try {
              const found = await detector.detect(videoRef.current);
              if (found.length > 0 && found[0].rawValue) {
                const code = found[0].rawValue.trim();
                stopCamera();
                onDetected(code);
                return;
              }
            } catch {
              // ignore frame detection transient error
            }
          }
          rafRef.current = requestAnimationFrame(scanFrame);
        };
        rafRef.current = requestAnimationFrame(scanFrame);
      });
    } catch {
      setStatusMsg('Permiso de cámara denegado o cámara ocupada.');
      stopCamera();
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={active ? stopCamera : startCamera}
          className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
            active
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-500'
              : 'border-[#00C8FF]/40 bg-[#00C8FF]/10 text-sky-700 dark:text-[#00C8FF]'
          }`}
        >
          {active ? (
            <>
              <CameraOff className="w-3.5 h-3.5" />
              Detener cámara
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5" />
              Escanear con cámara
            </>
          )}
        </button>
        {active && (
          <span className="text-[11px] font-mono text-emerald-500 dark:text-[#00E87C]">
            Enfocando código…
          </span>
        )}
      </div>

      {active && (
        <div className="relative rounded-xl overflow-hidden border border-[#00C8FF]/40 bg-black aspect-[16/9]">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-[#00C8FF]/80 shadow-[0_0_12px_#00C8FF]" />
        </div>
      )}

      {statusMsg && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{statusMsg}</p>
      )}
    </div>
  );
};
