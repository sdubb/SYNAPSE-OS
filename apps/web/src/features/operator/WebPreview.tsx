import React, { useState } from 'react';
import { GlobeIcon } from '../../components/common/Icons';

interface WebPreviewProps {
  url?: string;
}

export const WebPreview: React.FC<WebPreviewProps> = ({ url = 'http://localhost:5173/preview' }) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [currentUrl, setCurrentUrl] = useState(url);
  const [refreshKey, setRefreshKey] = useState(0);

  const getContainerWidth = () => {
    switch (viewport) {
      case 'mobile':
        return 'w-[375px]';
      case 'tablet':
        return 'w-[768px]';
      default:
        return 'w-full';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] overflow-hidden">
      {/* Viewport Control Bar */}
      <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setViewport('desktop')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              viewport === 'desktop' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Desktop
          </button>
          <button
            onClick={() => setViewport('tablet')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              viewport === 'tablet' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tablet
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              viewport === 'mobile' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mobile
          </button>
        </div>

        {/* Address Bar */}
        <div className="flex-1 max-w-lg flex items-center gap-2 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1 text-xs text-slate-300 font-mono">
          <GlobeIcon size={14} className="text-cyan-400 shrink-0" />
          <input
            type="text"
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            className="w-full bg-transparent focus:outline-none text-slate-200"
          />
        </div>

        {/* Reload button */}
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="px-2.5 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs text-slate-300 transition-colors cursor-pointer"
        >
          ↻ Reload
        </button>
      </div>

      {/* Frame Preview Container */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#090d13]">
        <div className={`h-full min-h-[450px] bg-white rounded-xl shadow-2xl overflow-hidden border border-[#30363d] transition-all duration-300 ${getContainerWidth()} flex flex-col`}>
          {/* Simulated Web Application Display */}
          <div className="flex-1 p-6 text-slate-900 bg-slate-50 flex flex-col gap-6 overflow-y-auto">
            <header className="flex items-center justify-between border-b pb-4 border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-lg">
                <span className="w-4 h-4 rounded bg-cyan-600 inline-block" />
                ACME Store
              </div>
              <nav className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                <span>Products</span>
                <span>Cart (2)</span>
                <span className="text-cyan-600">Checkout</span>
              </nav>
            </header>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Secure Order Checkout</h2>
                  <p className="text-xs text-slate-500">Fast and resilient payment processing</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-xs">
                  ● Payment Gateway Connected
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 font-medium">Order Total</span>
                  <div className="text-lg font-bold text-slate-900">$189.00</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 font-medium">Retry Policy</span>
                  <div className="text-sm font-semibold text-emerald-600">Exponential (3 retries)</div>
                </div>
              </div>

              <button className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow transition-all cursor-pointer">
                Complete Payment Now ($189.00)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
