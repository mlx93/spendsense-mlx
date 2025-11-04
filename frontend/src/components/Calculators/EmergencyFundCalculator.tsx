import { useState } from 'react';
import { Profile } from '../../services/api';

interface EmergencyFundCalculatorProps {
  profile: Profile;
}

export default function EmergencyFundCalculator({ profile }: EmergencyFundCalculatorProps) {
  const savingsSignal = profile.signals['30d']?.savings;
  const incomeSignal = profile.signals['30d']?.income;
  
  const currentSavings = savingsSignal?.savings_balance || 0;
  const monthlyIncome = incomeSignal?.average_monthly_income || 0;
  const monthlyExpenses = monthlyIncome * 0.7; // Estimate 70% of income as expenses
  
  const [targetMonths, setTargetMonths] = useState(6);
  const [monthlySavings, setMonthlySavings] = useState(0);
  
  const targetAmount = monthlyExpenses * targetMonths;
  const currentCoverage = monthlyExpenses > 0 ? currentSavings / monthlyExpenses : 0;
  const gap = Math.max(0, targetAmount - currentSavings);
  
  const monthsToGoal = monthlySavings > 0 ? Math.ceil(gap / monthlySavings) : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Emergency Fund Calculator</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Coverage (months)
          </label>
          <input
            type="number"
            min="1"
            max="12"
            value={targetMonths}
            onChange={(e) => setTargetMonths(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Experts recommend 3-6 months</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Current Savings</p>
            <p className="text-2xl font-bold text-gray-900">${currentSavings.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Monthly Expenses</p>
            <p className="text-2xl font-bold text-gray-900">${monthlyExpenses.toFixed(2)}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-2">Current Coverage</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all"
                style={{ width: `${Math.min(100, (currentCoverage / targetMonths) * 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900">
              {currentCoverage.toFixed(1)} months
            </span>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-500">Target Amount</p>
          <p className="text-2xl font-bold text-gray-900">${targetAmount.toFixed(2)}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Gap to Target</p>
          <p className="text-2xl font-bold text-red-600">${gap.toFixed(2)}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monthly Savings Goal
          </label>
          <input
            type="number"
            min="0"
            value={monthlySavings}
            onChange={(e) => setMonthlySavings(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter monthly savings amount"
          />
        </div>

        {monthlySavings > 0 && gap > 0 && (
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-gray-700">
              At ${monthlySavings.toFixed(2)}/month, you'll reach your goal in{' '}
              <strong>{monthsToGoal} months</strong>.
            </p>
          </div>
        )}

        {currentCoverage >= targetMonths && (
          <div className="bg-green-50 p-4 rounded-md">
            <p className="text-sm text-green-800 font-medium">
              ✓ You've reached your emergency fund goal!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

