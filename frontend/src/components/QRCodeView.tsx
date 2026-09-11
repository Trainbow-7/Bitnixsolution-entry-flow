import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface QRCodeViewProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}

export const QRCodeView: React.FC<QRCodeViewProps> = ({
  value,
  size = 240,
  fgColor = '#050d1a',
  bgColor = '#ffffff',
  className = '',
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size * 2, // High-DPI 2x resolution for razor-sharp camera scanning
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: fgColor,
        light: bgColor,
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error('Failed to render certified QR Code:', err));
  }, [value, size, fgColor, bgColor]);

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px',
        borderRadius: '16px',
        background: '#ffffff',
        border: '3px solid var(--bitnox-cyan)',
        boxShadow: '0 8px 32px rgba(0, 210, 255, 0.35), 0 4px 15px rgba(0, 0, 0, 0.6)',
      }}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`Scan to check in: ${value}`}
          width={size}
          height={size}
          style={{
            display: 'block',
            borderRadius: '8px',
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            fontSize: '0.8rem',
          }}
        >
          Generating code...
        </div>
      )}
    </div>
  );
};
