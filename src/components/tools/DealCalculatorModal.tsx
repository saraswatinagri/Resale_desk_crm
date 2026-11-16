import React, { useState } from 'react';
import { 
  X, 
  Calculator, 
  IndianRupee, 
  Percent, 
  Building2, 
  FileText, 
  CheckCircle2, 
  HelpCircle,
  TrendingDown,
  ShieldAlert
} from 'lucide-react';
import { formatIndianCurrency } from '../../utils/formatters';

interface DealCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPropertyPrice?: number;
}

export const DealCalculatorModal: React.FC<DealCalculatorModalProps> = ({
  isOpen,
  onClose,
  initialPropertyPrice = 6000000 // default 60 Lakhs
}) => {
  if (!isOpen) return null;

  // Commercials State
  const [propertyPrice, setPropertyPrice] = useState<number>(initialPropertyPrice);
  const [buyerGender, setBuyerGender] = useState<'male' | 'female' | 'joint'>('male');
  const [brokeragePercent, setBrokeragePercent] = useState<number>(2); // 2% standard resale
  
  // Home Loan State
  const [loanPercent, setLoanPercent] = useState<number>(80); // 80% LTV
  const [interestRate, setInterestRate] = useState<number>(8.5); // 8.5% p.a.
  const [tenureYears, setTenureYears] = useState<number>(20);

  // Maharashtra / Nagpur Stamp Duty & Registration Rates:
  // Male: 6% (5% Stamp Duty + 1% Metro / Local Cess)
  // Female: 5% (1% concession for female home buyers)
  // Joint: 6%
  const stampDutyRate = buyerGender === 'female' ? 5 : 6;
  const stampDutyAmount = Math.round((propertyPrice * stampDutyRate) / 100);

  // Maharashtra Registration Fee: 1% capped at ₹30,000 for properties over 30 Lakhs
  const registrationFee = propertyPrice > 3000000 ? 30000 : Math.round((propertyPrice * 1) / 100);

  // Document & Advocate / Legal Search fee: ~₹15,000
  const legalAdvocateFee = 15000;

  // Resale Desk Brokerage
  const brokerageAmount = Math.round((propertyPrice * brokeragePercent) / 100);

  // Total Out of Pocket (Stamp Duty + Reg + Legal + Brokerage)
  const totalRegistrationExpenses = stampDutyAmount + registrationFee + legalAdvocateFee + brokerageAmount;
  const totalAllInclusiveCost = propertyPrice + totalRegistrationExpenses;

  // Loan Calculation
  const loanAmount = Math.round((propertyPrice * loanPercent) / 100);
  const downPayment = propertyPrice - loanAmount;
  const totalCashRequiredAtBooking = downPayment + totalRegistrationExpenses;

  // Monthly EMI Calculation: E = P * r * (1+r)^n / ((1+r)^n - 1)
  const monthlyRate = interestRate / 12 / 100;
  const totalMonths = tenureYears * 12;
  const emiFactor = Math.pow(1 + monthlyRate, totalMonths);
  const monthlyEmi = monthlyRate > 0 && emiFactor > 1
    ? Math.round((loanAmount * monthlyRate * emiFactor) / (emiFactor - 1))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Nagpur Real Estate Deal & EMI Calculator</h2>
              <p className="text-[11px] text-slate-500">Stamp Duty, Registration, Brokerage & Loan EMI simulator</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          
          {/* Section 1: Inputs */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5 text-teal-600" />
              Property Deal Value & Buyer Category
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Property Agreement Value (₹)
                </label>
                <input
                  type="number"
                  step="50000"
                  value={propertyPrice}
                  onChange={(e) => setPropertyPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
                  {formatIndianCurrency(propertyPrice)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Buyer Gender / Stamp Duty Category
                </label>
                <select
                  value={buyerGender}
                  onChange={(e) => setBuyerGender(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="male">Male (6% Duty: 5% + 1% Metro Cess)</option>
                  <option value="female">Female (5% Duty: 1% Concession)</option>
                  <option value="joint">Joint (Male + Female - 6%)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Brokerage Commission (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={brokeragePercent}
                    onChange={(e) => setBrokeragePercent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono font-bold"
                  />
                  <span className="text-slate-500 font-mono text-xs whitespace-nowrap">{formatIndianCurrency(brokerageAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Acquisition Cost Breakdown */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                Nagpur Government Registration & Acquisition Costs
              </h3>
              <span className="text-emerald-700 font-mono font-extrabold text-sm">
                Total Overheads: {formatIndianCurrency(totalRegistrationExpenses)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-medium">Stamp Duty ({stampDutyRate}%)</span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">{formatIndianCurrency(stampDutyAmount)}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-medium">Govt Registration Fee</span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">{formatIndianCurrency(registrationFee)}</span>
                <span className="text-[9px] text-slate-400">(Capped at ₹30k)</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-medium">Legal / Search Report</span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">{formatIndianCurrency(legalAdvocateFee)}</span>
                <span className="text-[9px] text-slate-400">(30-year search & title)</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-medium">Brokerage ({brokeragePercent}%)</span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">{formatIndianCurrency(brokerageAmount)}</span>
                <span className="text-[9px] text-slate-400">(Resale desk fee)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between">
              <span className="font-bold text-teal-900">Total All-Inclusive Property Cost:</span>
              <span className="text-base font-black text-teal-800">{formatIndianCurrency(totalAllInclusiveCost)}</span>
            </div>
          </div>

          {/* Section 3: Home Loan & EMI Estimator */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-indigo-600" />
              Bank Home Loan & Monthly EMI Simulator (SBI / HDFC / ICICI)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Bank Loan Amount ({loanPercent}% LTV)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="50"
                    max="90"
                    step="5"
                    value={loanPercent}
                    onChange={(e) => setLoanPercent(Number(e.target.value))}
                    className="w-full accent-teal-600"
                  />
                  <span className="font-bold font-mono text-slate-800 w-10 text-right">{loanPercent}%</span>
                </div>
                <span className="text-slate-700 font-mono font-bold mt-1 block">
                  Loan: {formatIndianCurrency(loanAmount)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Annual Interest Rate (% p.a.)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">SBI/HDFC floating: 8.4% - 8.75%</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tenure (Years)
                </label>
                <select
                  value={tenureYears}
                  onChange={(e) => setTenureYears(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold"
                >
                  <option value={10}>10 Years (120 Months)</option>
                  <option value={15}>15 Years (180 Months)</option>
                  <option value={20}>20 Years (240 Months)</option>
                  <option value={25}>25 Years (300 Months)</option>
                  <option value={30}>30 Years (360 Months)</option>
                </select>
              </div>
            </div>

            {/* EMI Result Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Estimated Monthly EMI</span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">{formatIndianCurrency(monthlyEmi)}</span>
                <span className="text-[10px] text-emerald-600">per month for {tenureYears} years</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cash Down Payment</span>
                <span className="text-lg font-bold text-slate-800 mt-1 block">{formatIndianCurrency(downPayment)}</span>
                <span className="text-[10px] text-slate-400">({100 - loanPercent}% of agreement value)</span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Total Initial Cash Needed</span>
                <span className="text-lg font-bold text-amber-700 mt-1 block">{formatIndianCurrency(totalCashRequiredAtBooking)}</span>
                <span className="text-[10px] text-amber-600">(Down payment + all registry/fees)</span>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">Stamp Duty based on Maharashtra Revenue & IGR Nagpur circulars</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold"
          >
            Close Calculator
          </button>
        </div>

      </div>
    </div>
  );
};
