import React, { useState } from 'react';
import { Wheel } from 'react-custom-roulette';
import { categoryInfo } from '../../utils/categoryInfo';

// Helper to generate alternating colors for the wheel segments
const backgroundColors = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];
const textColor = '#ffffff';

// Prepare data for the wheel from categoryInfo
const wheelData = Object.keys(categoryInfo).map((key, index) => {
  const name = categoryInfo[key as keyof typeof categoryInfo].split(':')[0];
  return {
    option: name,
    style: {
      backgroundColor: backgroundColors[index % backgroundColors.length],
      textColor: textColor,
    },
  };
});


interface WheelOfFortuneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpinFinish: (winner: string) => void;
}

const WheelOfFortuneModal: React.FC<WheelOfFortuneModalProps> = ({ isOpen, onClose, onSpinFinish }) => {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  const handleSpinClick = () => {
    if (!mustSpin) {
      const newPrizeNumber = Math.floor(Math.random() * wheelData.length);
      setPrizeNumber(newPrizeNumber);
      setMustSpin(true);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">Günün Şanslı Kategorisi</h2>
        <p className="text-gray-600 mb-6">Çarkı çevir ve yeni kitaplar keşfet!</p>

        <div className="flex justify-center items-center">
            <Wheel
                mustStartSpinning={mustSpin}
                prizeNumber={prizeNumber}
                data={wheelData}
                onStopSpinning={() => {
                    setMustSpin(false);
                    // The key of categoryInfo is what we need to filter
                    const winnerKey = Object.keys(categoryInfo)[prizeNumber];
                    onSpinFinish(winnerKey);
                }}
                backgroundColors={['#f9fafb']} // Outer border color
                outerBorderWidth={10}
                radiusLineWidth={2}
                radiusLineColor={'#e5e7eb'}
                textColors={[textColor]}
                fontSize={14}
            />
        </div>

        <button 
          onClick={handleSpinClick} 
          disabled={mustSpin}
          className="mt-8 w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-transform transform hover:scale-105"
        >
          {mustSpin ? 'Dönüyor...' : 'ÇEVİR'}
        </button>
      </div>
    </div>
  );
};

export default WheelOfFortuneModal;