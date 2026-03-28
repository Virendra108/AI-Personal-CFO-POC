import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

export interface Transaction {
  Full_Date: string;
  Person: string;
  Transaction_Description: string;
  Category: string;
  Value: number;
  Total_Exp_Month_Counter: number;
  EOD_Balance: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  priority: number; // 1 (highest) to 5 (lowest)
  category: string;
}

export interface FinancialInsight {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  surplus: number;
  upcomingFixedExpenses: { category: string; amount: number; dueDate: string }[];
  riskAlerts: string[];
  forecast: { month: string; balance: number }[];
  goals: Goal[];
  waterfallAllocation: { goalName: string; allocatedAmount: number }[];
}

export class FinanceEngine {
  private transactions: Transaction[] = [];
  private goals: Record<string, Goal[]> = {
    "Bhavesh (Intern/Fresher)": [
      { id: '1', name: 'Emergency Fund', targetAmount: 50000, savedAmount: 15000, priority: 1, category: 'Safety' },
      { id: '2', name: 'New Laptop', targetAmount: 80000, savedAmount: 5000, priority: 2, category: 'Tech' }
    ],
    "Virendra (Freelancer)": [
      { id: '3', name: 'Manali Trip', targetAmount: 30000, savedAmount: 12000, priority: 3, category: 'Travel' },
      { id: '4', name: 'Tax Reserve', targetAmount: 100000, savedAmount: 45000, priority: 1, category: 'Tax' }
    ]
  };

  constructor() {
    this.loadData();
  }

  public loadData() {
    const csvPath = path.join(process.cwd(), 'ai_cfo_synthetic_data.csv');
    const csvData = fs.readFileSync(csvPath, 'utf8');
    const results = Papa.parse(csvData, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });
    this.transactions = results.data as Transaction[];
  }

  public getInsights(personName: string): FinancialInsight {
    const personTransactions = this.transactions.filter(t => t.Person.includes(personName));
    if (personTransactions.length === 0) {
      throw new Error(`No data found for person: ${personName}`);
    }

    // Sort by date (assuming DD-MM-YYYY format in CSV)
    const sorted = [...personTransactions].sort((a, b) => {
      const [d1, m1, y1] = a.Full_Date.split('-').map(Number);
      const [d2, m2, y2] = b.Full_Date.split('-').map(Number);
      return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
    });

    const latest = sorted[sorted.length - 1];
    const currentBalance = latest.EOD_Balance;

    // Calculate monthly averages
    const monthlyData: Record<string, { income: number; expenses: number }> = {};
    sorted.forEach(t => {
      const [d, m, y] = t.Full_Date.split('-');
      const monthKey = `${m}-${y}`;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expenses: 0 };
      if (t.Value > 0) monthlyData[monthKey].income += t.Value;
      else monthlyData[monthKey].expenses += Math.abs(t.Value);
    });

    const months = Object.values(monthlyData);
    const avgIncome = months.reduce((sum, m) => sum + m.income, 0) / months.length;
    const avgExpenses = months.reduce((sum, m) => sum + m.expenses, 0) / months.length;

    // Identify recurring fixed expenses (Housing, Utilities, Subscriptions)
    const fixedCategories = ['Housing', 'Utilities', 'Subscription', 'Education', 'Debt'];
    const upcomingFixedExpenses: { category: string; amount: number; dueDate: string }[] = [];
    
    // Simple logic: find the last occurrence of fixed categories and project them for next month
    fixedCategories.forEach(cat => {
      const lastOccur = [...sorted].reverse().find(t => t.Category === cat);
      if (lastOccur) {
        const [d, m, y] = lastOccur.Full_Date.split('-');
        upcomingFixedExpenses.push({
          category: cat,
          amount: Math.abs(lastOccur.Value),
          dueDate: d // Keep the same day of the month
        });
      }
    });

    // Risk Alerts based on scenarios
    const riskAlerts: string[] = [];
    const todayDay = 14; // Mocking today as mid-month for the POC
    const remainingFixed = upcomingFixedExpenses
      .filter(e => parseInt(e.dueDate) > todayDay)
      .reduce((sum, e) => sum + e.amount, 0);

    if (currentBalance < remainingFixed) {
      riskAlerts.push(`CRITICAL: Your current balance (₹${currentBalance}) is less than your upcoming fixed expenses (₹${remainingFixed}) due this month.`);
    }

    // Indian Seasonal Multipliers
    const currentMonth = new Date().getMonth() + 1; // 1-12
    let seasonalMultiplier = 1.0;
    if (currentMonth === 4 || currentMonth === 5) seasonalMultiplier = 1.5; // Summer electricity
    if (currentMonth === 10 || currentMonth === 11) seasonalMultiplier = 2.0; // Diwali
    if (currentMonth === 3) riskAlerts.push("Reminder: March is tax-saving month. Plan your ELSS investments.");

    // Simple forecast for next 3 months
    const forecast: { month: string; balance: number }[] = [];
    let projectedBalance = currentBalance;
    for (let i = 1; i <= 3; i++) {
      const nextMonthDate = new Date();
      nextMonthDate.setMonth(nextMonthDate.getMonth() + i);
      const monthName = nextMonthDate.toLocaleString('default', { month: 'short' });
      
      // Basic projection: Balance + Income - (Expenses * Multiplier)
      projectedBalance = projectedBalance + avgIncome - (avgExpenses * seasonalMultiplier);
      forecast.push({ month: monthName, balance: Math.round(projectedBalance) });
    }

    // Priority Waterfall Allocation
    const personGoals = this.goals[personName] || [];
    const surplus = avgIncome - avgExpenses;
    let remainingSurplus = surplus > 0 ? surplus : 0;
    const waterfallAllocation: { goalName: string; allocatedAmount: number }[] = [];

    // Sort goals by priority (1 is highest)
    const sortedGoals = [...personGoals].sort((a, b) => a.priority - b.priority);

    sortedGoals.forEach(goal => {
      if (remainingSurplus <= 0) return;
      
      const needed = goal.targetAmount - goal.savedAmount;
      if (needed <= 0) return;

      const allocation = Math.min(remainingSurplus, needed);
      waterfallAllocation.push({ goalName: goal.name, allocatedAmount: Math.round(allocation) });
      remainingSurplus -= allocation;
    });

    return {
      currentBalance,
      monthlyIncome: avgIncome,
      monthlyExpenses: avgExpenses,
      surplus,
      upcomingFixedExpenses,
      riskAlerts,
      forecast,
      goals: personGoals,
      waterfallAllocation
    };
  }

  public simulatePurchase(personName: string, amount: number, description: string): string {
    const insights = this.getInsights(personName);
    const { currentBalance, upcomingFixedExpenses } = insights;
    
    const todayDay = 14; // Mocking today as mid-month
    const remainingFixed = upcomingFixedExpenses
      .filter(e => parseInt(e.dueDate) > todayDay)
      .reduce((sum, e) => sum + e.amount, 0);

    const safeToSpend = currentBalance - remainingFixed;

    if (amount > safeToSpend) {
      return `WARNING: Buying this ${description} for ₹${amount} will leave you with only ₹${currentBalance - amount} for your upcoming fixed expenses of ₹${remainingFixed}. You should reconsider or use savings.`;
    }

    return `You can afford this ${description}. After purchase, you'll have ₹${currentBalance - amount} left, which covers your upcoming ₹${remainingFixed} in fixed expenses.`;
  }

  public addGoal(personName: string, goal: Omit<Goal, 'id' | 'savedAmount'>): Goal {
    if (!this.goals[personName]) {
      this.goals[personName] = [];
    }
    const newGoal: Goal = {
      ...goal,
      id: Math.random().toString(36).substr(2, 9),
      savedAmount: 0
    };
    this.goals[personName].push(newGoal);
    return newGoal;
  }
}
