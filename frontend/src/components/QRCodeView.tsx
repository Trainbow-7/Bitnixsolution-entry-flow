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
  fgColor = '#000000',
  bgColor = '#ffffff',
  className = '',
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size * 3, // Ultra high-res 3x rendering for instant camera detection
      margin: 4, // ISO/IEC 18004 4-module quiet zone requirement
      errorCorrectionLevel: 'Q', // High error correction level for fast scanning under light/glare
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
        padding: '20px',
        borderRadius: '20px',
        background: '#ffffff',
        border: '3px solid var(--bitnox-cyan)',
        boxShadow: '0 8px 32px rgba(0, 210, 255, 0.4), 0 4px 15px rgba(0, 0, 0, 0.6)',
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
            borderRadius: '4px',
            imageRendering: 'pixelated',
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
