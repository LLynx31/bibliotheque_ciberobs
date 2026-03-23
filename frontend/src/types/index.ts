export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "employee" | "book_manager" | "request_manager" | "admin";
  is_active: boolean;
  department?: string;
  phone?: string;
  date_joined: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  edition?: string;
  publisher?: string;
  year_published?: number;
  category?: Category;
  description?: string;
  cover_image?: string;
  number_of_copies: number;
  availability: "available" | "borrowed" | "reserved";
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookListItem {
  id: number;
  title: string;
  author: string;
  category?: Category;
  cover_image?: string;
  number_of_copies: number;
  available_copies: number;
  availability: "available" | "borrowed" | "reserved";
  is_available: boolean;
  pending_requests_count?: number;
}

export interface BorrowRequest {
  id: number;
  employee: User;
  book: BookListItem;
  status: "pending" | "approved" | "rejected" | "cancelled";
  desired_return_date?: string;
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: User;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
}

export interface Loan {
  id: number;
  employee: User;
  book: BookListItem;
  borrowed_at: string;
  due_date: string;
  returned_at?: string;
  is_active: boolean;
  is_overdue: boolean;
  notes?: string;
  created_at: string;
}

export interface LoanMinimal {
  id: number;
  employee: User;
  book: BookListItem;
  borrowed_at: string;
  due_date: string;
}

export interface ExtensionRequest {
  id: number;
  loan: number;
  loan_detail: LoanMinimal;
  requested_by: User;
  new_due_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_at?: string;
  reviewed_by?: User;
  rejection_reason?: string;
  created_at: string;
}

export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at?: string;
  related_book?: number;
  related_loan?: number;
  created_at: string;
}

export interface DashboardStats {
  total_books: number;
  total_users: number;
  active_loans: number;
  pending_requests: number;
  overdue_loans: number;
}

export interface MostBorrowed {
  id: number;
  title: string;
  author: string;
  borrow_count: number;
}

export interface ActiveBorrower {
  id: number;
  first_name: string;
  last_name: string;
  active_count: number;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
