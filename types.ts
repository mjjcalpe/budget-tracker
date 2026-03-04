export interface Transaction {
  id?: string;          // Added automatically by Firebase
  uid: string;          // User ID to keep data private per person
  label: string;
  amount: number;
  category: string;     // e.g., "Food", "Rent", "Salary"
  date: string;         // "YYYY-MM-DD" format
  type: 'income' | 'expense';
  createdAt: number;    // Used for sorting the list
}
// Define the shape of our Budget calculations
export interface BudgetCalculations {
  balance: number;
  income: number;
  expense: number;
}