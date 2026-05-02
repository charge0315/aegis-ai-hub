import React, { useEffect } from 'react';

interface CustomDialogProps {
  isOpen: boolean;
  type: string;
  title: string;
  message: any;
  onConfirm: (value?: string) => void;
  onCancel?: () => void;
}

export const CustomDialog: React.FC<CustomDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel
}) => {
  // ダイアログが開いた瞬間に、React内部からアラートを出すデバッグ
  useEffect(() => {
    if (isOpen) {
      console.log(`[DEBUG] Dialog should be visible now: ${title}`);
    }
  }, [isOpen, title]);

  if (!isOpen) return null;

  return (
    <div 
      style={{ 
        position: 'fixed', 
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999999, // 桁違いに大きく
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: 'rgba(255, 0, 0, 0.5)', // テスト用に背景を半透明の赤に
        pointerEvents: 'auto'
      }}
    >
      <div
        style={{ 
          width: '90%',
          maxWidth: '500px',
          backgroundColor: 'white', // 真っ白にして視認性を最大に
          color: 'black',
          padding: '40px',
          borderRadius: '20px',
          boxShadow: '0 0 100px rgba(0,0,0,1)',
          position: 'relative',
          zIndex: 10000000
        }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>{title}</h2>
        
        <div style={{ marginBottom: '30px', maxHeight: '300px', overflowY: 'auto' }}>
          {message}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onCancel) onCancel();
            else onConfirm();
          }}
          style={{ 
            width: '100%',
            padding: '15px',
            backgroundColor: '#000',
            color: 'white',
            fontWeight: 'bold',
            borderRadius: '10px',
            cursor: 'pointer'
          }}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};
