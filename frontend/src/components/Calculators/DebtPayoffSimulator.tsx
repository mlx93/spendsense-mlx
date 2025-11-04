import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Profile } from '../../services/api';

interface DebtPayoffSimulatorProps {
  profile: Profile;
}

interface CreditCard {
  id: string;
  name: string;
  balance: number;
  apr: number;
  minimumPayment: number;
}

export default function DebtPayoffSimulator({ profile }: DebtPayoffSimulatorProps) {
  const accounts = profile.accounts.filter(acc => acc.type === 'credit_card' && acc.utilization !== null);
  
  const [extraPayment, setExtraPayment] = useState(0);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);

  useEffect(() => {
    // Build credit card list from accounts with real liability data
    const cards: CreditCard[] = accounts.map((acc) => ({
      id: acc.id,
      name: acc.id.substring(acc.id.length - 4), // Last 4 digits
      balance: acc.balance,
      apr: acc.apr || 18.99, // Use real APR from liability, fallback to 18.99%
      minimumPayment: acc.minimumPayment || acc.balance * 0.02, // Use real minimum payment, fallback to 2% estimate
    }));
    setCreditCards(cards);
  }, [accounts]);

  const calculatePayoff = (balance: number, apr: number, minPayment: number, extra: number) => {
    const monthlyRate = apr / 100 / 12;
    const totalPayment = minPayment + extra;
    let currentBalance = balance;
    let months = 0;
    let totalInterest = 0;

    while (currentBalance > 0.01 && months < 600) {
      const interest = currentBalance * monthlyRate;
      totalInterest += interest;
      const principal = Math.min(totalPayment - interest, currentBalance);
      currentBalance -= principal;
      months++;
    }

    return { months, totalInterest };
  };

  const totalBalance = creditCards.reduce((sum, card) => sum + card.balance, 0);
  const totalMinPayment = creditCards.reduce((sum, card) => sum + card.minimumPayment, 0);
  
  // Calculate with and without extra payment
  const withoutExtra = creditCards.reduce((acc, card) => {
    const result = calculatePayoff(card.balance, card.apr, card.minimumPayment, 0);
    return {
      months: Math.max(acc.months, result.months),
      interest: acc.interest + result.totalInterest,
    };
  }, { months: 0, interest: 0 });

  const withExtra = creditCards.reduce((acc, card) => {
    const extraPerCard = extraPayment / creditCards.length;
    const result = calculatePayoff(card.balance, card.apr, card.minimumPayment, extraPerCard);
    return {
      months: Math.max(acc.months, result.months),
      interest: acc.interest + result.totalInterest,
    };
  }, { months: 0, interest: 0 });

  const interestSavings = withoutExtra.interest - withExtra.interest;
  const monthsSaved = withoutExtra.months - withExtra.months;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Debt Payoff Simulator</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-500">Total Credit Card Debt</p>
          <p className="text-2xl font-bold text-gray-900">${totalBalance.toFixed(2)}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Total Minimum Payments</p>
          <p className="text-xl font-semibold text-gray-900">${totalMinPayment.toFixed(2)}/month</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Extra Payment Per Month
          </label>
          <input
            type="number"
            min="0"
            step="10"
            value={extraPayment}
            onChange={(e) => setExtraPayment(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-gray-500">Payoff Timeline</p>
            <p className="text-2xl font-bold text-gray-900">
              {withExtra.months} {withExtra.months === 1 ? 'month' : 'months'}
            </p>
            {extraPayment > 0 && (
              <p className="text-xs text-green-600 mt-1">
                Saves {monthsSaved} {monthsSaved === 1 ? 'month' : 'months'}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Interest</p>
            <p className="text-2xl font-bold text-gray-900">${withExtra.interest.toFixed(2)}</p>
            {extraPayment > 0 && (
              <p className="text-xs text-green-600 mt-1">
                Saves ${interestSavings.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {extraPayment > 0 && (
          <div className="bg-green-50 p-4 rounded-md">
            <p className="text-sm text-gray-700">
              By paying an extra <strong>${extraPayment.toFixed(2)}/month</strong>, you'll:
            </p>
            <ul className="list-disc list-inside mt-2 text-sm text-gray-700">
              <li>Pay off debt {monthsSaved} {monthsSaved === 1 ? 'month' : 'months'} faster</li>
              <li>Save ${interestSavings.toFixed(2)} in interest charges</li>
            </ul>
          </div>
        )}

        {/* Formula Transparency */}
        <details className="mt-4">
          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
            Show calculation formula
          </summary>
          <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono space-y-1">
            <p>Monthly Interest = Balance × (APR ÷ 12)</p>
            <p>Principal Payment = Total Payment - Monthly Interest</p>
            <p>New Balance = Balance - Principal Payment</p>
            <p>Repeat until balance ≤ $0</p>
          </div>
        </details>

        {/* Take Action Button */}
        <div className="mt-4 pt-4 border-t">
          <Link
            to="/library?topic=credit"
            className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Learn About Debt Payoff Strategies →
          </Link>
        </div>
      </div>
    </div>
  );
}

