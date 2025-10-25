import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ReceiptData, ReceiptField } from './types';
import InputField from './components/InputField';
import Preview from './components/Preview';
import html2canvas from 'html2canvas';

const App: React.FC = () => {
  const [receiptData, setReceiptData] = useState<ReceiptData>({
    transactionId: '16325459761',
    dateTime: '10/25/2025 9:09:24 PM',
    amount: '9,000',
    fromAccount: 'ST MEDIA (PRIV',
    beneficiaryName: 'ST MEDIA (PRIV',
    beneficiaryAccount: '*4003',
    purpose: 'Others',
    comments: 'Miscellaneous',
    channel: 'via HBL PAY',
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewHeight, setPreviewHeight] = useState(0);
  
  const previewRef = useRef<HTMLDivElement>(null);
  
  const PREVIEW_SOURCE_WIDTH = 600;

  // This effect calculates the correct height for the preview container.
  // It runs when the component mounts, when receipt data changes (which can affect content height),
  // and when the window is resized.
  useEffect(() => {
    const calculateHeight = () => {
      if (previewRef.current) {
        // We use offsetHeight to get the full rendered height of the un-scaled preview element.
        setPreviewHeight(previewRef.current.offsetHeight);
      }
    };

    // Calculate height after the component has rendered.
    // A small delay helps ensure styles are applied, especially for the initial render.
    const timer = setTimeout(calculateHeight, 100);

    window.addEventListener('resize', calculateHeight);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateHeight);
    };
  }, [receiptData]);

  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setReceiptData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleDownload = useCallback(async () => {
    const sourceNode = previewRef.current;
    if (!sourceNode) {
      return;
    }

    setIsDownloading(true);

    // To ensure the canvas is generated from a clean, unaltered DOM element,
    // we create a clone that is rendered off-screen.
    const clone = sourceNode.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.top = '0';
    clone.style.left = '-9999px'; // Position it off-screen
    clone.style.transform = 'none'; // Reset any transforms
    clone.style.width = `${PREVIEW_SOURCE_WIDTH}px`; // Explicitly set width
    document.body.appendChild(clone);

    try {
      // Small delay to ensure the clone is fully rendered in the DOM before capture
      await new Promise(resolve => setTimeout(resolve, 300));

      // 1. Capture the source element at 2x resolution for high quality
      const sourceCanvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: '#1E1E1E', // Set background color during capture
        useCORS: true,
      });

      // 2. Define the target width for the final image
      const targetWidth = 840;

      // 3. Calculate the target height to maintain the original aspect ratio
      const sourceAspectRatio = sourceCanvas.width / sourceCanvas.height;
      const targetHeight = targetWidth / sourceAspectRatio;

      // 4. Create a new canvas with the final, calculated dimensions
      const targetCanvas = document.createElement('canvas');
      targetCanvas.width = targetWidth;
      targetCanvas.height = targetHeight;
      const ctx = targetCanvas.getContext('2d');

      if (!ctx) {
        throw new Error("Could not get 2D context from canvas");
      }
      
      // 5. Draw the high-resolution source canvas onto the target canvas, resizing it to fit exactly
      // This scales the image without adding any extra padding or letterboxing
      ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

      // 6. Trigger the download
      const link = document.createElement('a');
      link.download = `hbl-confirmation-${targetWidth}x${Math.round(targetHeight)}.png`;
      link.href = targetCanvas.toDataURL('image/png');
      link.click();
      
    } catch (err: any) {
      console.error("Failed to generate image", err);
      alert("An error occurred while generating the image. Please check the console.");
    } finally {
      // Clean up the cloned element from the DOM
      document.body.removeChild(clone);
      setIsDownloading(false);
    }
  }, []);
  
  const formFields: { name: ReceiptField; label: string }[] = [
    { name: 'transactionId', label: 'Transaction ID' },
    { name: 'dateTime', label: 'Transaction Date & Time' },
    { name: 'amount', label: 'Transaction Amount' },
    { name: 'beneficiaryName', label: 'Beneficiary Name' },
    { name: 'beneficiaryAccount', label: 'Beneficiary Account/ IBAN' },
  ];

  const PREVIEW_DISPLAY_WIDTH = 600;
  const scale = PREVIEW_DISPLAY_WIDTH / PREVIEW_SOURCE_WIDTH;

  return (
    <div className="bg-gray-900 min-h-screen text-white flex flex-col lg:flex-row p-4 sm:p-6 lg:p-8 gap-8">
      {/* Controls Panel */}
      <div className="w-full lg:w-1/3 lg:max-w-md flex-shrink-0">
        <div className="bg-gray-800 p-6 rounded-lg shadow-2xl">
          <h1 className="text-2xl font-bold mb-2 text-teal-400">Receipt Generator</h1>
          <p className="text-gray-400 mb-6">Enter the details below to update the preview.</p>
          <div className="space-y-4">
            {formFields.map(field => (
              <InputField
                key={field.name}
                label={field.label}
                name={field.name}
                value={receiptData[field.name]}
                onChange={handleDataChange}
              />
            ))}
          </div>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full mt-8 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center"
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              'Download as Image'
            )}
          </button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="flex-grow flex items-center justify-center overflow-hidden">
        <div 
            className="shadow-2xl rounded-lg overflow-hidden transition-all duration-200" 
            style={{ 
                width: `min(100%, ${PREVIEW_DISPLAY_WIDTH}px)`, // Responsive width for the container
                height: previewHeight ? `${previewHeight * scale}px` : 'auto', // Dynamic height
            }}
        >
          <div 
            style={{ 
              transform: `scale(${scale})`, // Scale the source canvas down for display
              transformOrigin: 'top left' 
            }}
          >
            <Preview ref={previewRef} data={receiptData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
